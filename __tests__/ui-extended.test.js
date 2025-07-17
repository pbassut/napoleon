const blessed = require('blessed');
const TerminalUI = require('../src/ui/index');
const { loadConfig } = require('../src/core/config');
const AgentManager = require('../src/core/agent-manager');

jest.mock('blessed');
jest.mock('../src/core/config');
jest.mock('../src/core/agent-manager');
jest.mock('../src/utils/logger');

describe('Terminal UI Extended Functionality', () => {
  let ui;
  let mockScreen;
  let mockBox;
  let mockText;
  let mockList;
  let mockAgentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock blessed components
    mockScreen = {
      key: jest.fn(),
      on: jest.fn(),
      render: jest.fn(),
      destroy: jest.fn(),
      width: 80,
      height: 24,
    };

    mockBox = {
      setContent: jest.fn(),
      style: {},
      show: jest.fn(),
      hide: jest.fn(),
      scroll: jest.fn(),
    };

    mockText = {
      setContent: jest.fn(),
      style: {},
      show: jest.fn(),
      hide: jest.fn(),
    };

    mockList = {
      setItems: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      on: jest.fn(),
      key: jest.fn(),
      focus: jest.fn(),
      style: {},
    };

    mockAgentManager = {
      initialize: jest.fn().mockResolvedValue(),
      getActiveAgents: jest.fn().mockReturnValue([]),
      spawnAgent: jest.fn().mockResolvedValue({ id: 'test-agent', status: 'running' }),
      canSpawnAgent: jest.fn().mockReturnValue(true),
      maxAgents: 3,
    };

    blessed.screen.mockReturnValue(mockScreen);
    blessed.box.mockReturnValue(mockBox);
    blessed.text.mockReturnValue(mockText);
    blessed.list.mockReturnValue(mockList);
    AgentManager.mockImplementation(() => mockAgentManager);

    loadConfig.mockReturnValue({
      maxAgents: 3,
      logLevel: 'info',
    });

    ui = new TerminalUI();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('agent list management', () => {
    beforeEach(async () => {
      await ui.initialize();
      ui.agentsList = mockList;
    });

    it('should update agents list display', () => {
      const mockAgents = [
        { id: 'agent-1', status: 'running', spawnTime: new Date().toISOString() },
        { id: 'agent-2', status: 'stopped', spawnTime: new Date().toISOString() },
      ];
      mockAgentManager.getActiveAgents.mockReturnValue(mockAgents);
      
      // Mock the helper methods
      ui.getStatusIcon = jest.fn().mockImplementation((status) => {
        return status === 'running' ? '🟢' : '⚪';
      });
      ui.getTimeAgo = jest.fn().mockReturnValue('0s ago');
      
      ui.updateAgentsList();
      
      expect(mockList.setItems).toHaveBeenCalledWith([
        '🟢 agent-1 - running (0s ago)',
        '⚪ agent-2 - stopped (0s ago)',
      ]);
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should display empty state when no agents', () => {
      mockAgentManager.getActiveAgents.mockReturnValue([]);
      
      // Create separate mock objects
      const mockStatusText = { show: jest.fn(), hide: jest.fn() };
      const mockInstructionText = { show: jest.fn(), hide: jest.fn() };
      
      // Mock the UI components
      ui.statusText = mockStatusText;
      ui.instructionText = mockInstructionText;
      ui.agentsList = mockList;
      
      ui.updateAgentsList();
      
      expect(mockStatusText.show).toHaveBeenCalled();
      expect(mockInstructionText.show).toHaveBeenCalled();
      expect(mockList.hide).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle agent list with different statuses', () => {
      const mockAgents = [
        { id: 'agent-1', status: 'running', spawnTime: new Date().toISOString() },
        { id: 'agent-2', status: 'error', spawnTime: new Date().toISOString() },
        { id: 'agent-3', status: 'stopped', spawnTime: new Date().toISOString() },
      ];
      mockAgentManager.getActiveAgents.mockReturnValue(mockAgents);
      
      // Mock the helper methods
      ui.getStatusIcon = jest.fn().mockImplementation((status) => {
        if (status === 'running') return '🟢';
        if (status === 'error') return '🔴';
        return '⚪';
      });
      ui.getTimeAgo = jest.fn().mockReturnValue('0s ago');
      
      ui.updateAgentsList();
      
      expect(mockList.setItems).toHaveBeenCalledWith([
        '🟢 agent-1 - running (0s ago)',
        '🔴 agent-2 - error (0s ago)',
        '⚪ agent-3 - stopped (0s ago)',
      ]);
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should handle keypress events', () => {
      const keypressHandler = mockScreen.on.mock.calls.find(call => call[0] === 'keypress')[1];
      
      keypressHandler(null, { name: 'n' });
      
      // Should trigger agent spawn dialog
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle n key for new agent', () => {
      const nKeyHandler = mockScreen.key.mock.calls.find(call => call[0][0] === 'n')[1];
      const showSpawnDialogSpy = jest.spyOn(ui, 'showSpawnDialog').mockImplementation(() => {});
      
      nKeyHandler();
      
      expect(showSpawnDialogSpy).toHaveBeenCalled();
    });

    it('should handle unknown keys gracefully', () => {
      const keypressHandler = mockScreen.on.mock.calls.find(call => call[0] === 'keypress')[1];
      
      expect(() => keypressHandler(null, { name: 'unknown' })).not.toThrow();
    });
  });

  describe('spawn dialog integration', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should show spawn dialog', () => {
      // Mock the spawn dialog creation
      const mockSpawnDialog = {
        show: jest.fn(),
        hide: jest.fn(),
        create: jest.fn(),
      };
      ui.spawnDialog = mockSpawnDialog;
      
      ui.showSpawnDialog();
      
      expect(mockSpawnDialog.show).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle spawn dialog callback', async () => {
      const instructions = 'Test instructions for agent';
      
      await ui.handleSpawnAgent(instructions);
      
      expect(mockAgentManager.spawnAgent).toHaveBeenCalledWith(instructions);
    });

    it('should handle spawn dialog cancel', () => {
      ui.handleSpawnCancel();
      
      expect(mockScreen.render).toHaveBeenCalled();
    });
  });

  describe('timer management', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should track timers in activeTimers set', () => {
      const callback = jest.fn();
      const timerId = ui.setTimeout(callback, 1000);
      
      expect(ui.activeTimers.has(timerId)).toBe(true);
      
      jest.advanceTimersByTime(1000);
      
      expect(callback).toHaveBeenCalled();
      expect(ui.activeTimers.has(timerId)).toBe(false);
    });

    it('should clear timers properly', () => {
      const callback = jest.fn();
      const timerId = ui.setTimeout(callback, 1000);
      
      ui.clearTimeout(timerId);
      
      expect(ui.activeTimers.has(timerId)).toBe(false);
      
      jest.advanceTimersByTime(1000);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle clearing invalid timer', () => {
      expect(() => ui.clearTimeout(null)).not.toThrow();
      expect(() => ui.clearTimeout(undefined)).not.toThrow();
    });
  });

  describe('terminal requirements', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should check terminal requirements with adequate size', () => {
      mockScreen.width = 100;
      mockScreen.height = 30;
      
      expect(ui.checkTerminalRequirements()).toBe(true);
    });

    it('should check terminal requirements with inadequate size', () => {
      mockScreen.width = 60;
      mockScreen.height = 20;
      
      expect(ui.checkTerminalRequirements()).toBe(false);
    });

    it('should check terminal requirements at minimum size', () => {
      mockScreen.width = 80;
      mockScreen.height = 24;
      
      expect(ui.checkTerminalRequirements()).toBe(true);
    });
  });

  describe('screen dimensions', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should get screen dimensions', () => {
      const dimensions = ui.getScreenDimensions();
      
      expect(dimensions).toEqual({
        width: 80,
        height: 24,
      });
    });
  });

  describe('render method', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should render screen if available', () => {
      ui.render();
      
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle render when screen is null', () => {
      ui.screen = null;
      
      expect(() => ui.render()).not.toThrow();
    });
  });

  describe('resize handling', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should handle resize event', () => {
      const renderSpy = jest.spyOn(ui, 'render').mockImplementation(() => {});
      
      ui.handleResize();
      
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should handle resize event from screen', () => {
      const resizeHandler = mockScreen.on.mock.calls.find(call => call[0] === 'resize')[1];
      const handleResizeSpy = jest.spyOn(ui, 'handleResize').mockImplementation(() => {});
      
      resizeHandler();
      
      expect(handleResizeSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      mockAgentManager.initialize.mockRejectedValue(new Error('Init failed'));
      
      await expect(ui.initialize()).rejects.toThrow('Init failed');
    });

    it('should handle spawn agent errors', async () => {
      await ui.initialize();
      mockAgentManager.spawnAgent.mockRejectedValue(new Error('Spawn failed'));
      
      const updateStatusSpy = jest.spyOn(ui, 'updateStatus').mockImplementation(() => {});
      
      // The method should handle the error internally, not throw
      await expect(ui.handleSpawnAgent('test')).resolves.toBeUndefined();
      
      // Should show error message
      expect(updateStatusSpy).toHaveBeenCalledWith(
        'Failed to spawn agent: Spawn failed',
        { fg: 'red', bold: true }
      );
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should clean up timers on quit', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => {});
      
      // Add some timers
      ui.setTimeout(() => {}, 1000);
      ui.setTimeout(() => {}, 2000);
      
      expect(ui.activeTimers.size).toBe(2);
      
      ui.quit();
      
      expect(ui.activeTimers.size).toBe(0);
      expect(mockScreen.destroy).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
      mockWrite.mockRestore();
    });
  });
});