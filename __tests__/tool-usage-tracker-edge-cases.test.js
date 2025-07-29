const toolUsageTracker = require('../src/core/tool-usage-tracker');

describe('ToolUsageTracker Edge Cases and Additional Coverage', () => {
  const testAgentId = 'edge-case-agent';

  beforeEach(() => {
    // Clean up any existing tracking data
    const trackedAgents = toolUsageTracker.getTrackedAgents();
    trackedAgents.forEach(agentId => {
      toolUsageTracker.cleanupAgent(agentId);
    });
  });

  afterEach(() => {
    toolUsageTracker.cleanupAgent(testAgentId);
  });

  describe('Edge Cases for initializeAgent', () => {
    it('should handle multiple initializations without duplicating data', () => {
      toolUsageTracker.initializeAgent(testAgentId);
      toolUsageTracker.initializeAgent(testAgentId);
      toolUsageTracker.initializeAgent(testAgentId);
      
      const trackedAgents = toolUsageTracker.getTrackedAgents();
      const matchingAgents = trackedAgents.filter(id => id === testAgentId);
      expect(matchingAgents).toHaveLength(1);
      
      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(0);
      expect(agentData.currentTodos).toEqual([]);
    });

    it('should handle empty string agent ID', () => {
      expect(() => {
        toolUsageTracker.initializeAgent('');
      }).not.toThrow();

      const agentData = toolUsageTracker.getAgentToolUsage('');
      expect(agentData.totalToolCalls).toBe(0);
      
      toolUsageTracker.cleanupAgent('');
    });

    it('should handle numeric agent ID', () => {
      const numericAgentId = 12345;
      
      expect(() => {
        toolUsageTracker.initializeAgent(numericAgentId);
      }).not.toThrow();

      const agentData = toolUsageTracker.getAgentToolUsage(numericAgentId);
      expect(agentData.totalToolCalls).toBe(0);
      
      toolUsageTracker.cleanupAgent(numericAgentId);
    });
  });

  describe('Edge Cases for trackTodoWrite', () => {
    beforeEach(() => {
      toolUsageTracker.initializeAgent(testAgentId);
    });

    it('should handle malformed tool use object', () => {
      const malformedToolUse = {
        // Missing required fields
        name: 'TodoWrite'
      };

      const mockMessage = { id: 'malformed_msg' };

      expect(() => {
        toolUsageTracker.trackTodoWrite(testAgentId, malformedToolUse, mockMessage);
      }).not.toThrow();

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(1);
      expect(agentData.toolCallHistory[0].success).toBe(false);
      expect(agentData.currentTodos).toEqual([]);
    });

    it('should handle empty todos array', () => {
      const toolUseEmptyTodos = {
        id: 'tool_empty',
        name: 'TodoWrite',
        input: { todos: [] }
      };

      const mockMessage = { id: 'empty_msg' };

      toolUsageTracker.trackTodoWrite(testAgentId, toolUseEmptyTodos, mockMessage);

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(1);
      expect(agentData.toolCallHistory[0].success).toBe(true);
      expect(agentData.currentTodos).toEqual([]);
    });

    it('should handle todos with missing fields', () => {
      const incompleteTodos = [
        { id: 'task-1' }, // Missing content, priority, status
        { content: 'Task with no ID', priority: 'high' }, // Missing id, status
        { id: 'task-2', content: 'Task 2', status: 'pending' } // Missing priority
      ];

      const toolUse = {
        id: 'tool_incomplete',
        name: 'TodoWrite',
        input: { todos: incompleteTodos }
      };

      const mockMessage = { id: 'incomplete_msg' };

      toolUsageTracker.trackTodoWrite(testAgentId, toolUse, mockMessage);

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(1);
      expect(agentData.currentTodos).toHaveLength(3);
      
      // Check that missing fields are handled gracefully
      expect(agentData.currentTodos[0]).toMatchObject({
        id: 'task-1',
        content: undefined,
        priority: undefined,
        status: undefined
      });
    });

    it('should handle todos with special characters and unicode', () => {
      const specialTodos = [
        {
          id: 'task-emojis',
          content: '🚀 Deploy app with 💻 code',
          priority: 'high',
          status: 'pending'
        },
        {
          id: 'task-unicode',
          content: 'Handle ñ, é, ü, 中文, العربية characters',
          priority: 'medium',
          status: 'in_progress'
        },
        {
          id: 'task-special',
          content: 'Process <script>alert("test")</script> safely',
          priority: 'low',
          status: 'completed'
        }
      ];

      const toolUse = {
        id: 'tool_special',
        name: 'TodoWrite',
        input: { todos: specialTodos }
      };

      const mockMessage = { id: 'special_msg' };

      toolUsageTracker.trackTodoWrite(testAgentId, toolUse, mockMessage);

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.currentTodos).toHaveLength(3);
      expect(agentData.currentTodos[0].content).toBe('🚀 Deploy app with 💻 code');
      expect(agentData.currentTodos[1].content).toBe('Handle ñ, é, ü, 中文, العربية characters');
    });

    it('should handle missing message object', () => {
      const toolUse = {
        id: 'tool_no_msg',
        name: 'TodoWrite',
        input: { todos: [{ id: 'task-1', content: 'Test', priority: 'high', status: 'pending' }] }
      };

      // Tool usage tracker does not handle null message gracefully - this is expected to throw
      expect(() => {
        toolUsageTracker.trackTodoWrite(testAgentId, toolUse, null);
      }).toThrow('Cannot read properties of null');
    });

    it('should handle message object without ID', () => {
      const toolUse = {
        id: 'tool_no_msg_id',
        name: 'TodoWrite',
        input: { todos: [{ id: 'task-1', content: 'Test', priority: 'high', status: 'pending' }] }
      };

      const messageWithoutId = { timestamp: '2025-01-25T10:00:00.000Z' };

      toolUsageTracker.trackTodoWrite(testAgentId, toolUse, messageWithoutId);

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(1);
      expect(agentData.toolCallHistory[0].messageId).toBeNull();
    });
  });

  describe('Edge Cases for Data Retrieval', () => {
    it('should handle agent that was never initialized', () => {
      const nonExistentAgent = 'never-initialized';
      
      const todos = toolUsageTracker.getAgentTodos(nonExistentAgent);
      expect(todos).toEqual([]);

      const stats = toolUsageTracker.getAgentToolUsage(nonExistentAgent);
      expect(stats).toMatchObject({
        totalToolCalls: 0,
        todoWriteCalls: 0,
        currentTodos: [],
        toolCallHistory: []
      });
    });

    it('should handle null and undefined agent IDs', () => {
      expect(() => toolUsageTracker.getAgentTodos(null)).not.toThrow();
      expect(() => toolUsageTracker.getAgentTodos(undefined)).not.toThrow();
      expect(() => toolUsageTracker.getAgentToolUsage(null)).not.toThrow();
      expect(() => toolUsageTracker.getAgentToolUsage(undefined)).not.toThrow();
      
      expect(toolUsageTracker.getAgentTodos(null)).toEqual([]);
      expect(toolUsageTracker.getAgentTodos(undefined)).toEqual([]);
    });
  });

  describe('Edge Cases for Data Persistence', () => {
    beforeEach(() => {
      toolUsageTracker.initializeAgent(testAgentId);
    });

    it('should export data for agent with no activity', () => {
      const exportedData = toolUsageTracker.exportAgentData(testAgentId);
      
      expect(exportedData).toEqual({
        todos: [],
        toolCalls: []
      });
    });

    it('should handle import with malformed data structures', () => {
      const validMalformedData = [
        null,
        undefined,
        'string-instead-of-object'
      ];

      validMalformedData.forEach((data, index) => {
        const agentId = `malformed-${index}`;
        
        expect(() => {
          toolUsageTracker.importAgentData(agentId, data);
        }).not.toThrow();

        const agentData = toolUsageTracker.getAgentToolUsage(agentId);
        expect(agentData.currentTodos).toEqual([]);
        expect(agentData.totalToolCalls).toBe(0);
        
        toolUsageTracker.cleanupAgent(agentId);
      });
    });

    it('should handle import with object containing valid but empty arrays', () => {
      const validData = [
        { todos: [], toolCalls: [] },
        { todos: [{ id: 'valid', content: 'test' }], toolCalls: [] },
        { todos: [], toolCalls: [{ toolName: 'test', success: true }] }
      ];

      validData.forEach((data, index) => {
        const agentId = `valid-data-${index}`;
        
        expect(() => {
          toolUsageTracker.importAgentData(agentId, data);
        }).not.toThrow();

        const agentData = toolUsageTracker.getAgentToolUsage(agentId);
        expect(agentData).toBeDefined();
        expect(Array.isArray(agentData.currentTodos)).toBe(true);
        expect(Array.isArray(agentData.toolCallHistory)).toBe(true);
        
        toolUsageTracker.cleanupAgent(agentId);
      });
    });

    it('should handle circular references in import data', () => {
      const circularData = { todos: [], toolCalls: [] };
      circularData.self = circularData;

      expect(() => {
        toolUsageTracker.importAgentData('circular-agent', circularData);
      }).not.toThrow();

      toolUsageTracker.cleanupAgent('circular-agent');
    });
  });

  describe('Stress Testing and Performance', () => {
    it('should handle many agents efficiently', () => {
      const agentCount = 100;
      const agentIds = Array.from({ length: agentCount }, (_, i) => `stress-agent-${i}`);

      // Initialize many agents
      agentIds.forEach(agentId => {
        toolUsageTracker.initializeAgent(agentId);
      });

      // Verify all agents exist
      const trackedAgents = toolUsageTracker.getTrackedAgents();
      agentIds.forEach(agentId => {
        expect(trackedAgents).toContain(agentId);
      });

      // Clean up
      agentIds.forEach(agentId => {
        toolUsageTracker.cleanupAgent(agentId);
      });
    });

    it('should handle large todo lists efficiently', () => {
      toolUsageTracker.initializeAgent(testAgentId);

      const largeTodoList = Array.from({ length: 500 }, (_, i) => ({
        id: `large-task-${i}`,
        content: `Task ${i} with long description: ${'x'.repeat(100)}`,
        priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        status: i % 4 === 0 ? 'completed' : i % 4 === 1 ? 'in_progress' : 'pending'
      }));

      const toolUse = {
        id: 'tool_large',
        name: 'TodoWrite',
        input: { todos: largeTodoList }
      };

      const mockMessage = { id: 'large_msg' };

      const startTime = Date.now();
      toolUsageTracker.trackTodoWrite(testAgentId, toolUse, mockMessage);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.currentTodos).toHaveLength(500);
    });

    it('should handle rapid consecutive updates', () => {
      toolUsageTracker.initializeAgent(testAgentId);

      const updateCount = 50;
      
      for (let i = 0; i < updateCount; i++) {
        const toolUse = {
          id: `rapid-tool-${i}`,
          name: 'TodoWrite',
          input: { 
            todos: [{ 
              id: `rapid-task-${i}`, 
              content: `Rapid task ${i}`, 
              priority: 'high', 
              status: 'pending' 
            }] 
          }
        };

        const mockMessage = { id: `rapid-msg-${i}` };
        toolUsageTracker.trackTodoWrite(testAgentId, toolUse, mockMessage);
      }

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(updateCount);
      expect(agentData.currentTodos).toHaveLength(1); // Latest update overwrites
      expect(agentData.currentTodos[0].content).toBe(`Rapid task ${updateCount - 1}`);
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up agent data', () => {
      const tempAgentId = 'temp-agent';
      
      toolUsageTracker.initializeAgent(tempAgentId);
      
      // Add some data
      toolUsageTracker.trackTodoWrite(tempAgentId, {
        id: 'temp-tool',
        name: 'TodoWrite',
        input: { todos: [{ id: 'temp-task', content: 'Temp', priority: 'high', status: 'pending' }] }
      }, { id: 'temp-msg' });

      // Verify data exists
      expect(toolUsageTracker.getTrackedAgents()).toContain(tempAgentId);
      expect(toolUsageTracker.getAgentToolUsage(tempAgentId).totalToolCalls).toBe(1);

      // Clean up
      toolUsageTracker.cleanupAgent(tempAgentId);

      // Verify data is cleaned
      expect(toolUsageTracker.getTrackedAgents()).not.toContain(tempAgentId);
      expect(toolUsageTracker.getAgentToolUsage(tempAgentId).totalToolCalls).toBe(0);
    });

    it('should handle cleanup of non-existent agents gracefully', () => {
      expect(() => {
        toolUsageTracker.cleanupAgent('non-existent-agent');
      }).not.toThrow();

      expect(() => {
        toolUsageTracker.cleanupAgent(null);
      }).not.toThrow();

      expect(() => {
        toolUsageTracker.cleanupAgent(undefined);
      }).not.toThrow();
    });
  });
});