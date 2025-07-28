/**
 * Working tests for AgentManager - focusing on static methods and basic functionality
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

describe('AgentManager Working Tests', () => {
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
    });
  });

  describe('Validation Methods', () => {
    describe('validateOptions', () => {
      it('should validate valid options with existing directory', () => {
        // Mock fs.statSync to simulate valid directory
        fs.statSync.mockReturnValue({
          isDirectory: () => true,
        });
        
        const validOptions = {
          workingDirectory: '/home/test',
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

      it('should throw for non-existent directory', () => {
        // Mock fs.statSync to throw error for invalid directory
        fs.statSync.mockImplementation(() => {
          throw new Error('Directory not found');
        });
        
        const invalidOptions = {
          workingDirectory: '/nonexistent/path',
        };
        
        expect(() => {
          AgentManager.validateOptions(invalidOptions);
        }).toThrow('Working directory is not accessible');
      });
    });

    describe('validateInstructions', () => {
      it('should accept valid instructions', () => {
        const validInstructions = [
          'Create a React component',
          'Fix the bug in auth.js',
          'Add tests for the API endpoints',
        ];

        validInstructions.forEach(instruction => {
          expect(() => {
            AgentManager.validateInstructions(instruction);
          }).not.toThrow();
        });
      });

      it('should reject dangerous patterns', () => {
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

      it('should reject empty instructions', () => {
        expect(() => {
          AgentManager.validateInstructions('');
        }).toThrow('Instructions must be a non-empty string');
      });

      it('should reject null/undefined instructions', () => {
        expect(() => {
          AgentManager.validateInstructions(null);
        }).toThrow('Instructions must be a non-empty string');

        expect(() => {
          AgentManager.validateInstructions(undefined);
        }).toThrow('Instructions must be a non-empty string');
      });

      it('should reject instructions that are too long', () => {
        const longInstruction = 'Create a component '.repeat(300); // Over 5000 chars
        
        expect(() => {
          AgentManager.validateInstructions(longInstruction);
        }).toThrow('Agent instructions must be less than 5000 characters');
      });
    });
  });

  describe('Basic Agent Management', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    describe('getActiveAgents', () => {
      it('should return empty array when no agents', () => {
        const activeAgents = agentManager.getActiveAgents();
        
        expect(Array.isArray(activeAgents)).toBe(true);
        expect(activeAgents).toHaveLength(0);
      });

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
  });
});