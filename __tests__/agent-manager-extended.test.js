/**
 * Extended tests for AgentManager - focusing on high-impact methods for coverage
 * This supplements the existing agent-manager.test.js with additional edge cases and untested methods
 */

// Mock all external dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');
jest.mock('os');
jest.mock('../src/core/config');
jest.mock('../src/core/sdk/communication-manager', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    shutdown: jest.fn().mockResolvedValue(),
  }));
});
jest.mock('../src/core/worktree-lifecycle-manager');
jest.mock('../src/core/logging/agent-log-manager');
jest.mock('../src/core/tool-usage-tracker', () => ({
  getAgentTodos: jest.fn(),
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const AgentManager = require('../src/core/agent-manager');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig } = require('../src/core/config');
const logger = require('../src/utils/logger');

describe('AgentManager Extended Coverage', () => {
  let agentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('[]');
    fs.writeFileSync.mockImplementation(() => {});
    path.join.mockImplementation((...args) => args.join('/'));
    os.homedir.mockReturnValue('/home/test');
    
    loadConfig.mockReturnValue({
      logLevel: 'info',
      features: {
        autoCleanup: true,
        agentLogging: true,
      },
    });

    agentManager = new AgentManager();
  });

  describe('Static Utility Methods', () => {
    describe('generateAgentId', () => {
      it('should generate unique agent IDs', () => {
        const id1 = AgentManager.generateAgentId();
        const id2 = AgentManager.generateAgentId();
        
        expect(id1).toBeDefined();
        expect(id2).toBeDefined();
        expect(id1).not.toBe(id2);
        expect(typeof id1).toBe('string');
        expect(id1.length).toBeGreaterThan(0);
      });

      it('should generate IDs in expected format', () => {
        const id = AgentManager.generateAgentId();
        
        // Should contain timestamp and random component
        expect(id).toMatch(/^agent-\d+/);
      });

      it('should handle rapid generation without duplicates', () => {
        const ids = [];
        for (let i = 0; i < 100; i++) {
          ids.push(AgentManager.generateAgentId());
        }
        
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });
    });

    describe('formatRuntime', () => {
      it('should format runtime in minutes only', () => {
        const result = AgentManager.formatRuntime(90); // 90 seconds = 1.5 minutes
        expect(result).toBe('01min');
      });

      it('should format runtime in hours and minutes', () => {
        const result = AgentManager.formatRuntime(3661); // 1h 1m 1s
        expect(result).toBe('01:01');
      });

      it('should handle zero runtime', () => {
        const result = AgentManager.formatRuntime(0);
        expect(result).toBe('00min');
      });

      it('should handle large runtimes', () => {
        const result = AgentManager.formatRuntime(7200); // 2 hours
        expect(result).toBe('02:00');
      });

      it('should format minutes correctly for less than hour', () => {
        const result = AgentManager.formatRuntime(300); // 5 minutes
        expect(result).toBe('05min');
      });

      it('should pad single digits', () => {
        const result = AgentManager.formatRuntime(65); // 1 minute 5 seconds
        expect(result).toBe('01min');
      });
    });

    describe('getCurrentTask', () => {
      it('should return null when no agent todos exist', () => {
        const toolUsageTracker = require('../src/core/tool-usage-tracker');
        toolUsageTracker.getAgentTodos = jest.fn().mockReturnValue(null);
        
        const task = AgentManager.getCurrentTask('test-agent');
        expect(task).toBeNull();
      });

      it('should return null when no in-progress tasks exist', () => {
        const toolUsageTracker = require('../src/core/tool-usage-tracker');
        toolUsageTracker.getAgentTodos = jest.fn().mockReturnValue([
          { status: 'completed', content: 'Task 1' },
          { status: 'pending', content: 'Task 2' },
        ]);
        
        const task = AgentManager.getCurrentTask('test-agent');
        expect(task).toBeNull();
      });

      it('should return single in-progress task', () => {
        const toolUsageTracker = require('../src/core/tool-usage-tracker');
        const mockTask = { status: 'in_progress', content: 'Current task' };
        toolUsageTracker.getAgentTodos = jest.fn().mockReturnValue([
          { status: 'completed', content: 'Task 1' },
          mockTask,
          { status: 'pending', content: 'Task 2' },
        ]);
        
        const task = AgentManager.getCurrentTask('test-agent');
        expect(task).toEqual(mockTask);
      });

      it('should handle multiple in-progress tasks', () => {
        const toolUsageTracker = require('../src/core/tool-usage-tracker');
        const mockTasks = [
          { status: 'in_progress', content: 'Task 1' },
          { status: 'in_progress', content: 'Task 2' },
        ];
        toolUsageTracker.getAgentTodos = jest.fn().mockReturnValue([
          { status: 'completed', content: 'Done task' },
          ...mockTasks,
        ]);
        
        const task = AgentManager.getCurrentTask('test-agent');
        expect(task).toBeDefined();
        expect(['Task 1', 'Task 2']).toContain(task.content);
      });

      it('should handle invalid todos array', () => {
        const toolUsageTracker = require('../src/core/tool-usage-tracker');
        toolUsageTracker.getAgentTodos = jest.fn().mockReturnValue('not-an-array');
        
        const task = AgentManager.getCurrentTask('test-agent');
        expect(task).toBeNull();
      });
    });
  });

  describe('Validation Methods Extended', () => {
    describe('validateOptions', () => {
      it('should validate valid options', () => {
        // Mock fs.statSync to simulate valid directory
        fs.statSync.mockReturnValue({
          isDirectory: () => true,
        });
        
        const validOptions = {
          workingDirectory: '/home/test',
          priority: 'normal',
          timeout: 30000,
        };
        
        expect(() => {
          AgentManager.validateOptions(validOptions);
        }).not.toThrow();
      });

      it('should handle null options', () => {
        expect(() => {
          AgentManager.validateOptions(null);
        }).not.toThrow();
      });

      it('should handle undefined options', () => {
        expect(() => {
          AgentManager.validateOptions(undefined);
        }).not.toThrow();
      });

      it('should validate working directory paths', () => {
        // Mock fs.statSync to throw error for invalid directory
        fs.statSync.mockImplementation(() => {
          throw new Error('Directory not found');
        });
        
        const invalidOptions = {
          workingDirectory: '../../../etc/passwd',
        };
        
        expect(() => {
          AgentManager.validateOptions(invalidOptions);
        }).toThrow();
      });

      it('should handle directory that is not a directory', () => {
        // Mock fs.statSync to return a file instead of directory
        fs.statSync.mockReturnValue({
          isDirectory: () => false,
        });
        
        const invalidOptions = {
          workingDirectory: '/path/to/file',
        };
        
        expect(() => {
          AgentManager.validateOptions(invalidOptions);
        }).toThrow('Working directory is not a valid directory');
      });

      it('should handle valid options without working directory', () => {
        const validOptions = {
          priority: 'normal',
          timeout: 30000,
        };
        
        expect(() => {
          AgentManager.validateOptions(validOptions);
        }).not.toThrow();
      });
    });

    describe('validateInstructions edge cases', () => {
      it('should reject command injection attempts', () => {
        const dangerousInstructions = [
          'Hello $(rm -rf /)',
          'Path with ../../../etc/passwd',
        ];

        dangerousInstructions.forEach(instruction => {
          expect(() => {
            AgentManager.validateInstructions(instruction);
          }).toThrow('Instructions contain potentially dangerous patterns');
        });
      });

      it('should reject control characters', () => {
        const controlCharInstructions = [
          'Hello\x00world',
          'Test\x01content',
          'Normal\x7Ftext',
        ];

        controlCharInstructions.forEach(instruction => {
          expect(() => {
            AgentManager.validateInstructions(instruction);
          }).toThrow();
        });
      });

      it('should allow safe special characters', () => {
        const safeInstructions = [
          'Create a React component with props like {name: "test"}',
          'Handle arrays like [1, 2, 3] and objects {key: value}',
          'Process paths like ./src/components/Header.jsx',
          'Use backticks for code: var x = 5;',
        ];

        safeInstructions.forEach(instruction => {
          expect(() => {
            AgentManager.validateInstructions(instruction);
          }).not.toThrow();
        });
      });

      it('should reject characters outside ASCII printable range', () => {
        const unicodeInstructions = [
          'Create component with emoji: 🚀 ✨ 💻',
          'Handle accented characters: café, naïve, résumé',
          'Process symbols: © ® ™ € ¥ £',
        ];

        unicodeInstructions.forEach(instruction => {
          expect(() => {
            AgentManager.validateInstructions(instruction);
          }).toThrow('Instructions contain invalid characters');
        });
      });

      it('should handle very long instructions', () => {
        const longInstruction = 'Create a component '.repeat(300); // Over 5000 chars
        
        expect(() => {
          AgentManager.validateInstructions(longInstruction);
        }).toThrow('Agent instructions must be less than 5000 characters');
      });

      it('should handle empty instructions', () => {
        expect(() => {
          AgentManager.validateInstructions('');
        }).toThrow('Instructions must be a non-empty string');
      });

      it('should handle null/undefined instructions', () => {
        expect(() => {
          AgentManager.validateInstructions(null);
        }).toThrow('Instructions must be a non-empty string');

        expect(() => {
          AgentManager.validateInstructions(undefined);
        }).toThrow('Instructions must be a non-empty string');
      });
    });
  });

  describe('Agent Runtime and Status Methods', () => {
    beforeEach(async () => {
      await agentManager.initialize();
      
      // Add a mock agent
      const mockAgent = {
        id: 'test-agent-1',
        status: 'running',
        spawnTime: new Date(Date.now() - 60000), // 1 minute ago
        lastActivity: new Date(),
        instructions: 'Test instructions',
        workingDirectory: '/test/path',
      };
      
      agentManager.agents.set('test-agent-1', mockAgent);
    });

    describe('getAgentRuntime', () => {
      it('should calculate runtime for active agent', () => {
        const runtime = agentManager.getAgentRuntime('test-agent-1');
        
        expect(runtime).toBeGreaterThan(50); // Should be around 60 seconds
        expect(runtime).toBeLessThan(70);
      });

      it('should return 0 for non-existent agent', () => {
        const runtime = agentManager.getAgentRuntime('non-existent');
        expect(runtime).toBe(0);
      });

      it('should handle agents without spawn time', () => {
        const agentWithoutSpawnTime = {
          id: 'no-spawn-time',
          status: 'running',
        };
        
        agentManager.agents.set('no-spawn-time', agentWithoutSpawnTime);
        
        const runtime = agentManager.getAgentRuntime('no-spawn-time');
        expect(runtime).toBeNaN(); // Should be NaN due to invalid date calculation
      });
    });

    describe('getAgentDetails', () => {
      it('should return detailed agent information', () => {
        const details = agentManager.getAgentDetails('test-agent-1');
        
        expect(details).toHaveProperty('id', 'test-agent-1');
        expect(details).toHaveProperty('status', 'running');
        expect(details).toHaveProperty('instructions', 'Test instructions');
        expect(details).toHaveProperty('workingDirectory', '/test/path');
        expect(details).toHaveProperty('runtime');
        expect(details).toHaveProperty('formattedRuntime');
      });

      it('should return null for non-existent agent', () => {
        const details = agentManager.getAgentDetails('non-existent');
        expect(details).toBeNull();
      });

      it('should include current task information', () => {
        const details = agentManager.getAgentDetails('test-agent-1');
        
        expect(details).toHaveProperty('currentTask');
        expect(details.currentTask).toContain('Test instructions');
      });
    });

    describe('getAgentStatusDisplay', () => {
      it('should return display-friendly status for running agent', () => {
        const display = agentManager.getAgentStatusDisplay('test-agent-1');
        
        expect(display).toHaveProperty('status', 'running');
        expect(display).toHaveProperty('displayText');
        expect(display).toHaveProperty('color');
        expect(display.displayText).toContain('Running');
      });

      it('should handle different agent statuses', () => {
        const statuses = ['spawning', 'idle', 'error', 'terminated'];
        
        statuses.forEach(status => {
          const mockAgent = {
            id: `agent-${status}`,
            status,
            spawnTime: new Date(),
          };
          
          agentManager.agents.set(`agent-${status}`, mockAgent);
          
          const display = agentManager.getAgentStatusDisplay(`agent-${status}`);
          expect(display).toHaveProperty('status', status);
          expect(display).toHaveProperty('displayText');
          expect(display).toHaveProperty('color');
        });
      });

      it('should return default status for non-existent agent', () => {
        const display = agentManager.getAgentStatusDisplay('non-existent');
        
        expect(display).toHaveProperty('status', 'unknown');
        expect(display).toHaveProperty('displayText', 'Unknown');
        expect(display).toHaveProperty('color', 'gray');
      });
    });
  });

  describe('Background Operations', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    describe('startBackgroundOrphanScanning', () => {
      it('should start orphan scanning interval', () => {
        const originalSetInterval = global.setInterval;
        const mockSetInterval = jest.fn();
        global.setInterval = mockSetInterval;

        agentManager.startBackgroundOrphanScanning();

        expect(mockSetInterval).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Number)
        );

        global.setInterval = originalSetInterval;
      });

      it('should not start multiple intervals', () => {
        const originalSetInterval = global.setInterval;
        const mockSetInterval = jest.fn();
        global.setInterval = mockSetInterval;

        agentManager.startBackgroundOrphanScanning();
        agentManager.startBackgroundOrphanScanning();

        expect(mockSetInterval).toHaveBeenCalledTimes(1);

        global.setInterval = originalSetInterval;
      });
    });

    describe('stopBackgroundOrphanScanning', () => {
      it('should stop orphan scanning interval', () => {
        const originalClearInterval = global.clearInterval;
        const mockClearInterval = jest.fn();
        global.clearInterval = mockClearInterval;

        // Simulate active interval
        agentManager.orphanScanInterval = 12345;
        
        agentManager.stopBackgroundOrphanScanning();

        expect(mockClearInterval).toHaveBeenCalledWith(12345);
        expect(agentManager.orphanScanInterval).toBeNull();

        global.clearInterval = originalClearInterval;
      });

      it('should handle no active interval gracefully', () => {
        expect(() => {
          agentManager.stopBackgroundOrphanScanning();
        }).not.toThrow();
      });
    });
  });

  describe('Shutdown and Cleanup', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    describe('shutdown', () => {
      it('should perform graceful shutdown', async () => {
        // Add some mock agents
        agentManager.agents.set('agent1', { id: 'agent1', status: 'running' });
        agentManager.agents.set('agent2', { id: 'agent2', status: 'idle' });

        await agentManager.shutdown();

        expect(logger.info).toHaveBeenCalledWith('Shutting down AgentManager');
        expect(agentManager.agents.size).toBe(0);
      });

      it('should stop background scanning during shutdown', async () => {
        const stopScanSpy = jest.spyOn(agentManager, 'stopBackgroundOrphanScanning');
        
        await agentManager.shutdown();

        expect(stopScanSpy).toHaveBeenCalled();
      });

      it('should handle shutdown errors gracefully', async () => {
        // Mock a shutdown error
        if (agentManager.worktreeLifecycle) {
          agentManager.worktreeLifecycle.shutdown = jest.fn().mockRejectedValue(new Error('Shutdown failed'));
        }

        await expect(agentManager.shutdown()).resolves.not.toThrow();
        expect(logger.error).toHaveBeenCalledWith(
          'Error during AgentManager shutdown',
          expect.any(Object)
        );
      });

      it('should save sessions during shutdown', async () => {
        const saveSpy = jest.spyOn(agentManager, 'saveSessions');
        
        await agentManager.shutdown();

        expect(saveSpy).toHaveBeenCalled();
      });
    });

    describe('forceCleanupWorktree', () => {
      it('should delegate to worktree lifecycle manager', async () => {
        const mockForceCleanup = jest.fn().mockResolvedValue('cleanup-result');
        agentManager.worktreeLifecycle = {
          forceCleanupWorktree: mockForceCleanup,
        };

        const result = await agentManager.forceCleanupWorktree('/test/path', { force: true });

        expect(mockForceCleanup).toHaveBeenCalledWith('/test/path', { force: true });
        expect(result).toBe('cleanup-result');
      });

      it('should handle missing worktree lifecycle manager', async () => {
        agentManager.worktreeLifecycle = null;

        await expect(agentManager.forceCleanupWorktree('/test/path')).rejects.toThrow();
      });
    });
  });

  describe('Log Management', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    describe('getAgentLogs', () => {
      it('should retrieve logs for existing agent', async () => {
        // Mock agent log manager
        const mockGetLogs = jest.fn().mockResolvedValue(['log1', 'log2', 'log3']);
        agentManager.agentLogManager = {
          getAgentLogs: mockGetLogs,
        };

        const logs = await agentManager.getAgentLogs('test-agent', { limit: 10 });

        expect(mockGetLogs).toHaveBeenCalledWith('test-agent', { limit: 10 });
        expect(logs).toEqual(['log1', 'log2', 'log3']);
      });

      it('should handle missing log manager', async () => {
        agentManager.agentLogManager = null;

        const logs = await agentManager.getAgentLogs('test-agent');
        expect(logs).toEqual([]);
      });

      it('should handle log retrieval errors', async () => {
        const mockGetLogs = jest.fn().mockRejectedValue(new Error('Log error'));
        agentManager.agentLogManager = {
          getAgentLogs: mockGetLogs,
        };

        const logs = await agentManager.getAgentLogs('test-agent');
        expect(logs).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to get agent logs',
          expect.any(Object)
        );
      });
    });
  });

  describe('Agent Management Methods', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    describe('getActiveAgents', () => {
      it('should return array of active agents', () => {
        // Add mock agents
        agentManager.agents.set('agent1', {
          id: 'agent1',
          status: 'running',
          instructions: 'Task 1',
        });
        
        agentManager.agents.set('agent2', {
          id: 'agent2',
          status: 'idle',
          instructions: 'Task 2',
        });
        
        const activeAgents = agentManager.getActiveAgents();
        
        expect(Array.isArray(activeAgents)).toBe(true);
        expect(activeAgents).toHaveLength(2);
        expect(activeAgents[0]).toHaveProperty('id');
        expect(activeAgents[0]).toHaveProperty('status');
      });

      it('should return empty array when no agents', () => {
        const activeAgents = agentManager.getActiveAgents();
        
        expect(Array.isArray(activeAgents)).toBe(true);
        expect(activeAgents).toHaveLength(0);
      });
    });

    describe('getAgent', () => {
      it('should return agent by ID', () => {
        const mockAgent = {
          id: 'test-agent',
          status: 'running',
          instructions: 'Test task',
        };
        
        agentManager.agents.set('test-agent', mockAgent);
        
        const agent = agentManager.getAgent('test-agent');
        expect(agent).toEqual(mockAgent);
      });

      it('should return undefined for non-existent agent', () => {
        const agent = agentManager.getAgent('non-existent');
        expect(agent).toBeUndefined();
      });
    });

    describe('getAgentCount', () => {
      it('should return correct agent count', () => {
        expect(agentManager.getAgentCount()).toBe(0);
        
        agentManager.agents.set('agent1', { id: 'agent1' });
        agentManager.agents.set('agent2', { id: 'agent2' });
        
        expect(agentManager.getAgentCount()).toBe(2);
      });
    });

    describe('updateAgentStatus', () => {
      it('should update agent status', () => {
        const mockAgent = {
          id: 'test-agent',
          status: 'running',
        };
        
        agentManager.agents.set('test-agent', mockAgent);
        
        agentManager.updateAgentStatus('test-agent', 'idle');
        
        const updatedAgent = agentManager.agents.get('test-agent');
        expect(updatedAgent.status).toBe('idle');
        expect(updatedAgent.lastActivity).toBeInstanceOf(Date);
      });

      it('should handle non-existent agent gracefully', () => {
        expect(() => {
          agentManager.updateAgentStatus('non-existent', 'idle');
        }).not.toThrow();
        
        expect(logger.warn).toHaveBeenCalledWith(
          'Attempted to update status for unknown agent',
          { agentId: 'non-existent', status: 'idle' }
        );
      });
    });
  });

  describe('Additional Agent Methods', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    describe('getAgentLogs', () => {
      it('should retrieve logs for existing agent', async () => {
        // Mock agent log manager
        const mockGetLogs = jest.fn().mockResolvedValue(['log1', 'log2', 'log3']);
        agentManager.agentLogManager = {
          getAgentLogs: mockGetLogs,
        };

        const logs = await agentManager.getAgentLogs('test-agent');

        expect(mockGetLogs).toHaveBeenCalledWith('test-agent');
        expect(logs).toEqual(['log1', 'log2', 'log3']);
      });

      it('should handle missing log manager', async () => {
        agentManager.agentLogManager = null;

        const logs = await agentManager.getAgentLogs('test-agent');
        expect(logs).toEqual([]);
      });

      it('should handle log retrieval errors', async () => {
        const mockGetLogs = jest.fn().mockRejectedValue(new Error('Log error'));
        agentManager.agentLogManager = {
          getAgentLogs: mockGetLogs,
        };

        const logs = await agentManager.getAgentLogs('test-agent');
        expect(logs).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to retrieve agent logs',
          expect.any(Object)
        );
      });
    });

    describe('getWorktreeLifecycleStatus', () => {
      it('should return status when lifecycle manager exists', () => {
        const mockStatus = {
          activeAgents: 2,
          recoveredWorktrees: 1,
          cleanupQueue: { length: 0 },
        };
        
        agentManager.worktreeLifecycle = {
          getStatus: jest.fn().mockReturnValue(mockStatus),
        };

        const status = agentManager.getWorktreeLifecycleStatus();
        expect(status).toEqual(mockStatus);
      });

      it('should return null when no lifecycle manager', () => {
        agentManager.worktreeLifecycle = null;

        const status = agentManager.getWorktreeLifecycleStatus();
        expect(status).toBeNull();
      });
    });

    describe('isFullyInitialized', () => {
      it('should return true when fully initialized', async () => {
        await agentManager.initialize();
        
        const isInitialized = agentManager.isFullyInitialized();
        expect(isInitialized).toBe(true);
      });

      it('should return false when not initialized', () => {
        const newManager = new AgentManager();
        
        const isInitialized = newManager.isFullyInitialized();
        expect(isInitialized).toBe(false);
      });
    });

    describe('handleSDKMessage', () => {
      it('should handle SDK messages with valid agent', async () => {
        // Add a mock agent
        agentManager.agents.set('test-agent', {
          id: 'test-agent',
          status: 'running',
        });

        const mockMessage = {
          type: 'status_update',
          agentId: 'test-agent',
          data: { status: 'idle' },
        };

        await expect(
          agentManager.handleSDKMessage('test-agent', mockMessage)
        ).resolves.not.toThrow();
      });

      it('should handle SDK messages for non-existent agent', async () => {
        const mockMessage = {
          type: 'status_update',
          agentId: 'non-existent',
          data: { status: 'idle' },
        };

        await expect(
          agentManager.handleSDKMessage('non-existent', mockMessage)
        ).resolves.not.toThrow();
        
        expect(logger.warn).toHaveBeenCalledWith(
          'Received SDK message for unknown agent',
          expect.objectContaining({ agentId: 'non-existent' })
        );
      });
    });
  });
});