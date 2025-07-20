const blessed = require('blessed');
const TerminalUI = require('../src/ui/index');
const { loadConfig } = require('../src/core/config');
const AgentManager = require('../src/core/agent-manager');
const { AgentStatus } = require('../src/core/agent-manager');

jest.mock('blessed');
jest.mock('../src/core/config');
jest.mock('../src/core/agent-manager');
jest.mock('../src/utils/logger');

// Mock process.exit to prevent tests from actually exiting
const mockExit = jest.fn();
global.process.exit = mockExit;

describe('Terminal UI Termination Integration', () => {
  let ui;
  let mockScreen;
  let mockBox;
  let mockText;
  let mockList;
  let mockAgentManager;
  let mockTerminationDialog;

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
      style: { border: {} },
      show: jest.fn(),
      hide: jest.fn(),
      scroll: jest.fn(),
      key: jest.fn(),
      on: jest.fn(),
      focus: jest.fn(),
      destroy: jest.fn(),
    };

    mockText = {
      setContent: jest.fn(),
      style: { fg: 'white' },
      show: jest.fn(),
      hide: jest.fn(),
    };

    mockList = {
      setItems: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      select: jest.fn(),
      style: {},
    };

    // Mock termination dialog
    mockTerminationDialog = {
      show: jest.fn(),
      hide: jest.fn(),
      destroy: jest.fn(),
      isShown: jest.fn().mockReturnValue(false),
    };

    // Mock agent manager
    mockAgentManager = {
      initialize: jest.fn(),
      spawnAgent: jest.fn(),
      terminateAgent: jest.fn(),
      getActiveSessions: jest.fn(),
      getActiveAgents: jest.fn().mockReturnValue([]),
    };

    // Mock blessed components
    blessed.screen.mockReturnValue(mockScreen);
    blessed.box.mockReturnValue(mockBox);
    blessed.text.mockReturnValue(mockText);
    blessed.list.mockReturnValue(mockList);

    // Mock AgentManager
    AgentManager.mockImplementation(() => mockAgentManager);

    // Mock config
    loadConfig.mockReturnValue({
      maxAgents: 3,
      sessionFile: '/tmp/test-sessions.json',
    });

    // Create UI instance
    ui = new TerminalUI();
  });
  
  afterEach(() => {
    // Clean up UI instance if it was created
    if (ui && typeof ui.stopStatusPolling === 'function') {
      ui.stopStatusPolling();
    }
    
    // Restore all mocks
    jest.restoreAllMocks();
  });


  describe('Agent Termination Flow', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should handle d key press to initiate termination', () => {
      // Set up mock agents
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          status: AgentStatus.RUNNING,
          pid: 12345,
          createdAt: new Date('2023-01-01T10:00:00Z'),
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          status: AgentStatus.IDLE,
          pid: 12346,
          createdAt: new Date('2023-01-01T10:05:00Z'),
        },
      ];

      ui.agents = mockAgents;
      ui.selectedAgentIndex = 0;

      // Mock the termination dialog
      ui.terminationDialog = mockTerminationDialog;

      // Find and call the 'd' key handler
      const dKeyHandler = mockScreen.key.mock.calls.find(call => call[0][0] === 'd')[1];
      dKeyHandler();

      // Should show termination dialog with selected agent
      expect(mockTerminationDialog.show).toHaveBeenCalledWith(mockAgents[0]);
    });

    it('should not show termination dialog when no agents exist', () => {
      ui.agents = [];
      ui.terminationDialog = mockTerminationDialog;

      // Find and call the 'd' key handler
      const dKeyHandler = mockScreen.key.mock.calls.find(call => call[0][0] === 'd')[1];
      dKeyHandler();

      // Should not show termination dialog
      expect(mockTerminationDialog.show).not.toHaveBeenCalled();
    });

    it('should handle termination confirmation', async () => {
      // Set up mock agents
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: AgentStatus.RUNNING,
        pid: 12345,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      };

      ui.agents = [mockAgent];
      ui.selectedAgentIndex = 0;
      mockAgentManager.terminateAgent.mockResolvedValue();

      // Call the termination confirmation handler
      await ui.handleTerminationConfirm();

      // Should call agent manager to terminate the agent
      expect(mockAgentManager.terminateAgent).toHaveBeenCalledWith('agent-1');
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle termination confirmation with selection reset', async () => {
      // Set up mock agents
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          status: AgentStatus.RUNNING,
          pid: 12345,
          createdAt: new Date('2023-01-01T10:00:00Z'),
        },
      ];

      ui.agents = mockAgents;
      ui.selectedAgentIndex = 0; // Selecting the last (and only) agent
      mockAgentManager.terminateAgent.mockResolvedValue();

      // Call the termination confirmation handler
      await ui.handleTerminationConfirm();

      // Should reset selection index appropriately
      expect(ui.selectedAgentIndex).toBe(0);
      expect(mockAgentManager.terminateAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should handle termination confirmation errors', async () => {
      // Set up mock agents
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: AgentStatus.RUNNING,
        pid: 12345,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      };

      ui.agents = [mockAgent];
      ui.selectedAgentIndex = 0;
      mockAgentManager.terminateAgent.mockRejectedValue(new Error('Termination failed'));

      // Call the termination confirmation handler
      await ui.handleTerminationConfirm();

      // Should handle error gracefully
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle termination cancellation', () => {
      // Call the termination cancel handler
      ui.handleTerminationCancel();

      // Should render screen to restore UI state
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should handle termination when no agents exist', async () => {
      ui.agents = [];
      ui.selectedAgentIndex = 0;

      // Call the termination confirmation handler
      await ui.handleTerminationConfirm();

      // Should not call agent manager
      expect(mockAgentManager.terminateAgent).not.toHaveBeenCalled();
    });

    it('should handle termination when selected agent is null', async () => {
      ui.agents = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          status: AgentStatus.RUNNING,
          pid: 12345,
          createdAt: new Date('2023-01-01T10:00:00Z'),
        },
      ];
      ui.selectedAgentIndex = 1; // Out of bounds

      // Call the termination confirmation handler
      await ui.handleTerminationConfirm();

      // Should not call agent manager
      expect(mockAgentManager.terminateAgent).not.toHaveBeenCalled();
    });

    it('should update status message on successful termination', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: AgentStatus.RUNNING,
        pid: 12345,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      };

      ui.agents = [mockAgent];
      ui.selectedAgentIndex = 0;
      mockAgentManager.terminateAgent.mockResolvedValue();

      // Mock the updateStatus method
      const updateStatusSpy = jest.spyOn(ui, 'updateStatus').mockImplementation(() => {});

      await ui.handleTerminationConfirm();

      expect(updateStatusSpy).toHaveBeenCalledWith(
        'Agent agent-1 terminated',
        { fg: 'yellow', bold: true },
      );
    });

    it('should update status message on termination failure', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: AgentStatus.RUNNING,
        pid: 12345,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      };

      ui.agents = [mockAgent];
      ui.selectedAgentIndex = 0;
      mockAgentManager.terminateAgent.mockRejectedValue(new Error('Termination failed'));

      // Mock the updateStatus method
      const updateStatusSpy = jest.spyOn(ui, 'updateStatus').mockImplementation(() => {});

      await ui.handleTerminationConfirm();

      expect(updateStatusSpy).toHaveBeenCalledWith(
        'Failed to terminate agent: Termination failed',
        { fg: 'red', bold: true },
      );
    });

    it('should handle multiple agents termination sequence', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          status: AgentStatus.RUNNING,
          pid: 12345,
          createdAt: new Date('2023-01-01T10:00:00Z'),
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          status: AgentStatus.IDLE,
          pid: 12346,
          createdAt: new Date('2023-01-01T10:05:00Z'),
        },
      ];

      ui.agents = mockAgents;
      ui.selectedAgentIndex = 0;
      ui.terminationDialog = mockTerminationDialog;
      mockAgentManager.terminateAgent.mockResolvedValue();

      // Show termination dialog for first agent
      const dKeyHandler = mockScreen.key.mock.calls.find(call => call[0][0] === 'd')[1];
      dKeyHandler();

      expect(mockTerminationDialog.show).toHaveBeenCalledWith(mockAgents[0]);

      // Confirm termination
      await ui.handleTerminationConfirm();

      expect(mockAgentManager.terminateAgent).toHaveBeenCalledWith('agent-1');
      expect(ui.selectedAgentIndex).toBe(0); // Should remain at 0 since we still have agents
    });

    it('should adjust selection index when terminating the last agent', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          status: AgentStatus.RUNNING,
          pid: 12345,
          createdAt: new Date('2023-01-01T10:00:00Z'),
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          status: AgentStatus.IDLE,
          pid: 12346,
          createdAt: new Date('2023-01-01T10:05:00Z'),
        },
      ];

      ui.agents = mockAgents;
      ui.selectedAgentIndex = 1; // Select the last agent
      mockAgentManager.terminateAgent.mockResolvedValue();

      await ui.handleTerminationConfirm();

      expect(mockAgentManager.terminateAgent).toHaveBeenCalledWith('agent-2');
      expect(ui.selectedAgentIndex).toBe(0); // Should adjust to 0 (last valid index)
    });
  });

  describe('Dialog Integration', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should create termination dialog during initialization', () => {
      expect(ui.terminationDialog).toBeDefined();
    });

    it('should clean up termination dialog on quit', () => {
      ui.terminationDialog = mockTerminationDialog;

      ui.quit();

      expect(mockTerminationDialog.destroy).toHaveBeenCalled();
    });

    it('should handle termination dialog creation error gracefully', () => {
      // Mock AgentTerminationDialog to throw error
      const originalTerminationDialog = require('../src/ui/blessed/components/agent-termination-dialog');
      jest.doMock('../src/ui/blessed/components/agent-termination-dialog', () => {
        return jest.fn(() => {
          throw new Error('Dialog creation failed');
        });
      });

      // Should not throw during initialization
      expect(() => new TerminalUI()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await ui.initialize();
    });

    it('should handle termination without termination dialog', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: AgentStatus.RUNNING,
        pid: 12345,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      };

      ui.agents = [mockAgent];
      ui.selectedAgentIndex = 0;
      ui.terminationDialog = null;

      // Should not throw error since we added null check
      expect(() => {
        const dKeyHandler = mockScreen.key.mock.calls.find(call => call[0][0] === 'd')[1];
        dKeyHandler();
      }).not.toThrow();
    });

    it('should handle concurrent termination attempts', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: AgentStatus.RUNNING,
        pid: 12345,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      };

      ui.agents = [mockAgent];
      ui.selectedAgentIndex = 0;
      mockAgentManager.terminateAgent.mockResolvedValue();

      // Start two termination attempts
      const promise1 = ui.handleTerminationConfirm();
      const promise2 = ui.handleTerminationConfirm();

      await Promise.all([promise1, promise2]);

      // Should handle both attempts gracefully
      expect(mockAgentManager.terminateAgent).toHaveBeenCalledTimes(2);
    });

    it('should handle termination timeout scenarios', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent 1',
        status: AgentStatus.RUNNING,
        pid: 12345,
        createdAt: new Date('2023-01-01T10:00:00Z'),
      };

      ui.agents = [mockAgent];
      ui.selectedAgentIndex = 0;
      
      // Mock a timeout scenario
      mockAgentManager.terminateAgent.mockRejectedValue(new Error('Termination timeout'));

      await ui.handleTerminationConfirm();

      // Should handle timeout gracefully
      expect(mockScreen.render).toHaveBeenCalled();
    }, 10000); // 10 second timeout
  });
});