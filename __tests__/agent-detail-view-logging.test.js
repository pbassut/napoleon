const AgentDetailView = require('../src/ui/components/agent-detail-view');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock blessed components
const mockBlessedText = {
  setContent: jest.fn(),
  style: { fg: 'white' },
};

const mockBlessedBox = {
  show: jest.fn(),
  hide: jest.fn(),
  focus: jest.fn(),
  key: jest.fn(),
  destroy: jest.fn(),
  once: jest.fn(),
  setScrollPerc: jest.fn(),
  scroll: jest.fn(),
};

const mockScreen = {
  render: jest.fn(),
  realloc: jest.fn(),
};

jest.mock('blessed', () => ({
  box: jest.fn(() => mockBlessedBox),
  text: jest.fn(() => mockBlessedText),
  textarea: jest.fn(() => mockBlessedBox),
  textbox: jest.fn(() => mockBlessedBox),
}));

// Mock child_process
const mockSpawn = jest.fn(() => ({
  unref: jest.fn(),
}));
jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

// Mock fs
jest.mock('fs');

describe('AgentDetailView - Logging Integration (US040)', () => {
  let agentDetailView;
  let mockAgentManager;
  let mockAgentLogManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AgentLogManager
    mockAgentLogManager = {
      isInitialized: jest.fn(() => true),
      getLogPath: jest.fn(),
    };

    // Mock AgentManager with AgentLogManager
    mockAgentManager = {
      agentLogManager: mockAgentLogManager,
      getAgentLogs: jest.fn(() => []),
      formatRuntime: jest.fn(() => '5m 30s'),
      getAgentRuntime: jest.fn(() => 330000),
      getAgentDetails: jest.fn(() => ({ branch: 'main' })),
    };

    agentDetailView = new AgentDetailView(mockScreen, mockAgentManager);
  });

  describe('AC1: Log File Path Display', () => {
    test('displays log file path when persistent logging is available', () => {
      const mockLogPath = '/home/user/.napoleon/logs/agents/2024-01-15_agent123_test-prompt.log';
      mockAgentLogManager.getLogPath.mockReturnValue(mockLogPath);
      
      // Mock file stats
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: 5120, // 5KB
        mtime: new Date(),
      });
      fs.accessSync.mockImplementation(() => {}); // No error = writable

      const result = agentDetailView.getLogFileInfo('agent123');
      
      expect(result).toContain('2024-01-15_agent123_test-prompt.log');
      expect(result).toContain('5KB');
      expect(result).toContain('Active');
      expect(result).toContain(mockLogPath);
    });

    test('shows disabled message when persistent logging not available', () => {
      mockAgentManager.agentLogManager = null;

      const result = agentDetailView.getLogFileInfo('agent123');
      
      expect(result).toContain('Persistent logging disabled');
    });

    test('shows no log file message for agents without persistent logs', () => {
      mockAgentLogManager.getLogPath.mockReturnValue(null);

      const result = agentDetailView.getLogFileInfo('agent123');
      
      expect(result).toContain('No active log file');
    });

    test('shows terminated agent message for terminated agents', () => {
      mockAgentLogManager.getLogPath.mockReturnValue(null);
      agentDetailView.currentAgent = { status: 'terminated' };

      const result = agentDetailView.getLogFileInfo('agent123');
      
      expect(result).toContain('Agent terminated - check historical logs');
    });
  });

  describe('AC2: External Log Viewer Integration', () => {
    test('opens log file in external viewer on macOS', () => {
      const mockLogPath = '/path/to/log.file';
      mockAgentLogManager.getLogPath.mockReturnValue(mockLogPath);
      fs.existsSync.mockReturnValue(true);
      
      jest.spyOn(os, 'platform').mockReturnValue('darwin');
      agentDetailView.currentAgent = { id: 'agent123' };

      agentDetailView.openLogInExternalViewer();

      expect(mockSpawn).toHaveBeenCalledWith('open', [mockLogPath], {
        detached: true,
        stdio: 'ignore',
      });
    });

    test('opens log file in external viewer on Windows', () => {
      const mockLogPath = '/path/to/log.file';
      mockAgentLogManager.getLogPath.mockReturnValue(mockLogPath);
      fs.existsSync.mockReturnValue(true);
      
      jest.spyOn(os, 'platform').mockReturnValue('win32');
      agentDetailView.currentAgent = { id: 'agent123' };

      agentDetailView.openLogInExternalViewer();

      expect(mockSpawn).toHaveBeenCalledWith('cmd', ['/c', 'start', '""', mockLogPath], {
        detached: true,
        stdio: 'ignore',
      });
    });

    test('opens log file in external viewer on Linux', () => {
      const mockLogPath = '/path/to/log.file';
      mockAgentLogManager.getLogPath.mockReturnValue(mockLogPath);
      fs.existsSync.mockReturnValue(true);
      
      jest.spyOn(os, 'platform').mockReturnValue('linux');
      agentDetailView.currentAgent = { id: 'agent123' };

      agentDetailView.openLogInExternalViewer();

      expect(mockSpawn).toHaveBeenCalledWith('xdg-open', [mockLogPath], {
        detached: true,
        stdio: 'ignore',
      });
    });

    test('shows error when no agent is selected', () => {
      agentDetailView.currentAgent = null;
      agentDetailView.showStatusMessage = jest.fn();

      agentDetailView.openLogInExternalViewer();

      expect(agentDetailView.showStatusMessage).toHaveBeenCalledWith('No agent selected', 'red');
    });

    test('shows error when persistent logging not available', () => {
      mockAgentManager.agentLogManager = null;
      agentDetailView.currentAgent = { id: 'agent123' };
      agentDetailView.showStatusMessage = jest.fn();

      agentDetailView.openLogInExternalViewer();

      expect(agentDetailView.showStatusMessage).toHaveBeenCalledWith('Persistent logging not available', 'red');
    });

    test('shows error when log file does not exist', () => {
      const mockLogPath = '/path/to/nonexistent.log';
      mockAgentLogManager.getLogPath.mockReturnValue(mockLogPath);
      fs.existsSync.mockReturnValue(false);
      
      agentDetailView.currentAgent = { id: 'agent123' };
      agentDetailView.showStatusMessage = jest.fn();

      agentDetailView.openLogInExternalViewer();

      expect(agentDetailView.showStatusMessage).toHaveBeenCalledWith('Log file does not exist yet', 'yellow');
    });
  });

  describe('AC3: Historical Log Access', () => {
    test('displays historical logs when available', () => {
      const mockLogsDir = '/home/user/.napoleon/logs/agents';
      const mockFiles = [
        '2024-01-15_agent123_test-prompt.log',
        '2024-01-14_agent456_another-task.log',
      ];

      jest.spyOn(os, 'homedir').mockReturnValue('/home/user');
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockImplementation((filePath) => {
        // Make the first file newer for proper sorting
        const baseTime = new Date();
        if (filePath.includes('2024-01-15')) {
          return {
            mtime: new Date(baseTime.getTime() + 1000), // 1 second newer
            size: 1024,
            ctime: new Date(),
          };
        }
        return {
          mtime: baseTime,
          size: 1024,
          ctime: new Date(),
        };
      });

      const historicalLogs = agentDetailView.getHistoricalLogs();

      expect(historicalLogs).toHaveLength(2);
      expect(historicalLogs[0].filename).toBe('2024-01-15_agent123_test-prompt.log');
      expect(historicalLogs[1].filename).toBe('2024-01-14_agent456_another-task.log');
    });

    test('returns empty array when logs directory does not exist', () => {
      jest.spyOn(os, 'homedir').mockReturnValue('/home/user');
      fs.existsSync.mockReturnValue(false);

      const historicalLogs = agentDetailView.getHistoricalLogs();

      expect(historicalLogs).toEqual([]);
    });

    test('filters out non-log files', () => {
      const mockFiles = [
        '2024-01-15_agent123_test-prompt.log',
        'not-a-log.txt',
        'another.file',
        '2024-01-14_agent456_another-task.log',
      ];

      jest.spyOn(os, 'homedir').mockReturnValue('/home/user');
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockImplementation(() => ({
        mtime: new Date(),
        size: 1024,
        ctime: new Date(),
      }));

      const historicalLogs = agentDetailView.getHistoricalLogs();

      expect(historicalLogs).toHaveLength(2);
      expect(historicalLogs.every(log => log.filename.endsWith('.log'))).toBe(true);
    });
  });

  describe('AC4: Enhanced Status Indicators', () => {
    test('shows active status for recently modified writable files', () => {
      const mockLogPath = '/path/to/active.log';
      const recentTime = new Date(Date.now() - 10000); // 10 seconds ago

      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: 2048,
        mtime: recentTime,
      });
      fs.accessSync.mockImplementation(() => {}); // No error = writable

      const status = agentDetailView.getLogFileStatus(mockLogPath);

      expect(status.status).toBe('active');
      expect(status.sizeKB).toBe(2);
      expect(status.accessible).toBe(true);
    });

    test('shows readonly status for old files or non-writable files', () => {
      const mockLogPath = '/path/to/readonly.log';
      const oldTime = new Date(Date.now() - 60000); // 1 minute ago

      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: 1024,
        mtime: oldTime,
      });
      fs.accessSync.mockImplementation(() => {}); // No error = writable but old

      const status = agentDetailView.getLogFileStatus(mockLogPath);

      expect(status.status).toBe('readonly');
      expect(status.sizeKB).toBe(1);
    });

    test('shows missing status for non-existent files', () => {
      const mockLogPath = '/path/to/missing.log';

      fs.existsSync.mockReturnValue(false);

      const status = agentDetailView.getLogFileStatus(mockLogPath);

      expect(status.status).toBe('missing');
      expect(status.sizeKB).toBe(0);
    });

    test('shows error status when file access fails', () => {
      const mockLogPath = '/path/to/error.log';

      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const status = agentDetailView.getLogFileStatus(mockLogPath);

      expect(status.status).toBe('error');
      expect(status.sizeKB).toBe(0);
    });
  });

  describe('AC5: Updated Navigation and Help', () => {
    test('keyboard shortcuts are properly registered', () => {
      // Verify that key handlers are registered
      expect(mockBlessedBox.key).toHaveBeenCalledWith(['l'], expect.any(Function));
      expect(mockBlessedBox.key).toHaveBeenCalledWith(['h'], expect.any(Function));
      expect(mockBlessedBox.key).toHaveBeenCalledWith(['?'], expect.any(Function));
    });

    test('showStatusMessage displays temporary messages', (done) => {
      agentDetailView.footerText = {
        content: 'original content',
        style: { fg: 'cyan' },
        setContent: jest.fn(),
      };

      agentDetailView.showStatusMessage('Test message', 'green');

      expect(agentDetailView.footerText.setContent).toHaveBeenCalledWith('Test message');
      expect(agentDetailView.footerText.style.fg).toBe('green');

      // Test that original content is restored after timeout
      setTimeout(() => {
        expect(agentDetailView.footerText.setContent).toHaveBeenCalledWith('original content');
        expect(agentDetailView.footerText.style.fg).toBe('cyan');
        done();
      }, 3100); // Slightly longer than the 3000ms timeout
    });
  });

  describe('Integration Tests', () => {
    test('updateAgentInfo includes log file information', () => {
      const mockAgent = {
        id: 'agent123',
        status: 'running',
        spawnTime: new Date().toISOString(),
        instructions: 'Test task',
        sessionId: 'session123',
      };

      const mockLogPath = '/path/to/log.file';
      mockAgentLogManager.getLogPath.mockReturnValue(mockLogPath);
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: 1024,
        mtime: new Date(),
      });
      fs.accessSync.mockImplementation(() => {});

      agentDetailView.currentAgent = mockAgent;
      agentDetailView.updateAgentInfo();

      expect(mockBlessedText.setContent).toHaveBeenCalled();
      const callArgs = mockBlessedText.setContent.mock.calls[0][0];
      expect(callArgs).toContain('Log File:');
      expect(callArgs).toContain('Active');
    });

    test('historical logs dialog creation and display', () => {
      const mockFiles = ['2024-01-15_agent123_test.log'];
      
      jest.spyOn(os, 'homedir').mockReturnValue('/home/user');
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockImplementation(() => ({
        mtime: new Date(),
        size: 1024,
        ctime: new Date(),
      }));

      agentDetailView.showHistoricalLogsDialog();

      // Verify blessed.box was called to create the dialog
      const blessed = require('blessed');
      expect(blessed.box).toHaveBeenCalledWith(
        expect.objectContaining({
          label: ' Historical Agent Logs ',
        })
      );
    });
  });
});