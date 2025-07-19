const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const LogsCommand = require('../src/cli/commands/logs');
const AgentLogManager = require('../src/core/logging/agent-log-manager');

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('child_process');

describe('LogsCommand', () => {
  let logsCommand;
  let testDir;
  let testLogsDir;
  let mockConfig;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'napoleon-test-'));
    testLogsDir = path.join(testDir, 'logs', 'agents');
    
    mockConfig = {
      napoleonDir: testDir,
    };

    logsCommand = new LogsCommand(mockConfig);
    
    fs.mkdirSync(testLogsDir, { recursive: true });
    
    jest.clearAllMocks();
    
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('initialize', () => {
    it('should initialize the agent log manager', async () => {
      await logsCommand.initialize();
      expect(logsCommand.agentLogManager.isInitialized()).toBe(true);
    });
  });

  describe('listLogs', () => {
    beforeEach(async () => {
      await logsCommand.initialize();
    });

    it('should show message when no logs directory exists', async () => {
      fs.rmSync(testLogsDir, { recursive: true });
      
      await logsCommand.listLogs();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No logs directory found')
      );
    });

    it('should show message when no log files exist', async () => {
      await logsCommand.listLogs();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No agent logs found')
      );
    });

    it('should list log files with correct information', async () => {
      const logContent = JSON.stringify({
        timestamp: '2024-01-15T10:30:00Z',
        agentId: 'agent-123',
        type: 'system',
        content: 'Test log entry'
      }) + '\n';

      const filename = '2024-01-15_agent-123_fix-auth-bug.log';
      fs.writeFileSync(path.join(testLogsDir, filename), logContent);

      await logsCommand.listLogs();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Date        Agent ID   Prompt')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('2024-01-15')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('agent-123')
      );
    });

    it('should limit results when --limit option is provided', async () => {
      for (let i = 1; i <= 5; i++) {
        const filename = `2024-01-1${i}_agent-${i}_test-log.log`;
        fs.writeFileSync(path.join(testLogsDir, filename), 'test content');
      }

      await logsCommand.listLogs({ limit: 3 });

      const calls = console.log.mock.calls.filter(call => 
        call[0].includes('2024-01-1')
      );
      expect(calls.length).toBe(3);
    });

    it('should output JSON format when requested', async () => {
      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), 'test content');

      await logsCommand.listLogs({ format: 'json' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"logs"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('agent-123')
      );
    });
  });

  describe('viewLog', () => {
    beforeEach(async () => {
      await logsCommand.initialize();
    });

    it('should throw error when log file not found', async () => {
      await expect(logsCommand.viewLog('nonexistent')).rejects.toThrow(
        'Log not found: nonexistent'
      );
    });

    it('should display log content with formatting', async () => {
      const logContent = JSON.stringify({
        timestamp: '2024-01-15T10:30:00Z',
        agentId: 'agent-123',
        type: 'system',
        content: 'Test log entry'
      }) + '\n';

      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), logContent);

      await logsCommand.viewLog('test');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Test log entry')
      );
    });

    it('should display raw content when --raw option is used', async () => {
      const logContent = 'raw log content\n';
      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), logContent);

      await logsCommand.viewLog('test', { raw: true });

      expect(console.log).toHaveBeenCalledWith('raw log content\n');
    });

    it('should tail log when --tail option is used', async () => {
      const lines = [];
      for (let i = 1; i <= 10; i++) {
        lines.push(`Line ${i}`);
      }
      const logContent = lines.join('\n');
      
      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), logContent);

      await logsCommand.viewLog('test', { tail: 3 });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Line 8')
      );
    });

    it('should start following log when --follow option is used', async () => {
      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), 'test content');

      const mockTail = {
        kill: jest.fn(),
        on: jest.fn(),
      };
      spawn.mockReturnValue(mockTail);

      await logsCommand.viewLog('test', { follow: true });

      expect(spawn).toHaveBeenCalledWith('tail', ['-f', expect.stringContaining('test.log')], { stdio: 'inherit' });
    });
  });

  describe('searchLogs', () => {
    beforeEach(async () => {
      await logsCommand.initialize();
    });

    it('should show message when no logs directory exists', async () => {
      fs.rmSync(testLogsDir, { recursive: true });
      
      await logsCommand.searchLogs('test');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No logs directory found')
      );
    });

    it('should find and highlight search terms', async () => {
      const logContent = 'This is a test error message\n';
      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), logContent);

      await logsCommand.searchLogs('error');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 matches')
      );
    });

    it('should show message when no matches found', async () => {
      const logContent = 'This is a test message\n';
      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), logContent);

      await logsCommand.searchLogs('nonexistent');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No matches found')
      );
    });

    it('should filter by date range when --from and --to options are provided', async () => {
      const logContent = 'test error message\n';
      
      fs.writeFileSync(path.join(testLogsDir, '2024-01-10_agent-123_test.log'), logContent);
      fs.writeFileSync(path.join(testLogsDir, '2024-01-20_agent-124_test.log'), logContent);

      await logsCommand.searchLogs('error', { from: '2024-01-15', to: '2024-01-25' });

      const matchingCalls = console.log.mock.calls.filter(call => 
        call[0].includes('agent-124')
      );
      expect(matchingCalls.length).toBeGreaterThan(0);
    });
  });

  describe('searchByPrompt', () => {
    beforeEach(async () => {
      await logsCommand.initialize();
    });

    it('should find logs by prompt keyword', async () => {
      const filename = '2024-01-15_agent-123_fix-authentication-bug.log';
      fs.writeFileSync(path.join(testLogsDir, filename), 'test content');

      await logsCommand.searchByPrompt('authentication');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 logs matching')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('fix-authentication-bug')
      );
    });

    it('should show message when no matching prompts found', async () => {
      const filename = '2024-01-15_agent-123_fix-bug.log';
      fs.writeFileSync(path.join(testLogsDir, filename), 'test content');

      await logsCommand.searchByPrompt('nonexistent');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No logs found with prompt keyword')
      );
    });

    it('should limit results when --limit option is provided', async () => {
      for (let i = 1; i <= 5; i++) {
        const filename = `2024-01-1${i}_agent-${i}_test-authentication.log`;
        fs.writeFileSync(path.join(testLogsDir, filename), 'test content');
      }

      await logsCommand.searchByPrompt('authentication', { limit: 2 });

      const calls = console.log.mock.calls.filter(call => 
        call[0].includes('2024-01-1')
      );
      expect(calls.length).toBe(2);
    });
  });

  describe('helper methods', () => {
    it('should format file sizes correctly', () => {
      expect(LogsCommand.formatFileSize(0)).toBe('0B');
      expect(LogsCommand.formatFileSize(1024)).toBe('1KB');
      expect(LogsCommand.formatFileSize(1048576)).toBe('1MB');
      expect(LogsCommand.formatFileSize(1536)).toBe('1.5KB');
    });

    it('should get relative time correctly', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      expect(LogsCommand.getRelativeTime(oneHourAgo)).toBe('1h ago');
      expect(LogsCommand.getRelativeTime(oneDayAgo)).toBe('1d ago');
    });

    it('should extract date from filename correctly', () => {
      const filename = '2024-01-15_agent-123_test.log';
      expect(LogsCommand.extractDateFromFilename(filename)).toBe('2024-01-15');
    });

    it('should extract prompt from filename correctly', () => {
      const filename = '2024-01-15_agent-123_fix-auth-bug.log';
      expect(LogsCommand.extractPromptFromFilename(filename)).toBe('fix-auth-bug');
    });

    it('should check date range correctly', () => {
      expect(LogsCommand.isDateInRange('2024-01-15', '2024-01-10', '2024-01-20')).toBe(true);
      expect(LogsCommand.isDateInRange('2024-01-05', '2024-01-10', '2024-01-20')).toBe(false);
      expect(LogsCommand.isDateInRange('2024-01-25', '2024-01-10', '2024-01-20')).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await logsCommand.initialize();
    });

    it('should handle permission errors gracefully', async () => {
      const mockReaddir = jest.spyOn(fs.promises, 'readdir').mockRejectedValue(new Error('Permission denied'));

      await expect(logsCommand.listLogs()).rejects.toThrow('Failed to list logs');
      
      mockReaddir.mockRestore();
    });

    it('should handle file read errors gracefully', async () => {
      const filename = '2024-01-15_agent-123_test.log';
      fs.writeFileSync(path.join(testLogsDir, filename), 'test content');
      
      const mockReadFile = jest.spyOn(fs.promises, 'readFile').mockRejectedValue(new Error('File read error'));

      await expect(logsCommand.viewLog('test')).rejects.toThrow('Failed to view log');
      
      mockReadFile.mockRestore();
    });
  });
});