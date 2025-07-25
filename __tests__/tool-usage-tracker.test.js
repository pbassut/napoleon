const toolUsageTracker = require('../src/core/tool-usage-tracker');

describe('ToolUsageTracker', () => {
  const testAgentId = 'test-agent-123';
  const testTodos = [
    {
      id: 'task-1',
      content: 'Complete first task',
      priority: 'high',
      status: 'pending'
    },
    {
      id: 'task-2', 
      content: 'Review code changes',
      priority: 'medium',
      status: 'in_progress'
    },
    {
      id: 'task-3',
      content: 'Update documentation',
      priority: 'low',
      status: 'completed'
    }
  ];

  beforeEach(() => {
    // Clean up any existing tracking data
    const trackedAgents = toolUsageTracker.getTrackedAgents();
    trackedAgents.forEach(agentId => {
      toolUsageTracker.cleanupAgent(agentId);
    });
  });

  afterEach(() => {
    // Clean up test data
    toolUsageTracker.cleanupAgent(testAgentId);
  });

  describe('Agent Initialization', () => {
    test('should initialize agent tracking', () => {
      toolUsageTracker.initializeAgent(testAgentId);
      
      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(0);
      expect(agentData.todoWriteCalls).toBe(0);
      expect(agentData.currentTodos).toEqual([]);
      expect(agentData.toolCallHistory).toEqual([]);
    });

    test('should not duplicate agent initialization', () => {
      toolUsageTracker.initializeAgent(testAgentId);
      toolUsageTracker.initializeAgent(testAgentId);
      
      expect(toolUsageTracker.getTrackedAgents()).toContain(testAgentId);
      expect(toolUsageTracker.getTrackedAgents().filter(id => id === testAgentId)).toHaveLength(1);
    });
  });

  describe('TodoWrite Tracking', () => {
    test('should track TodoWrite tool usage', () => {
      const mockToolUse = {
        id: 'tool_123',
        name: 'TodoWrite',
        input: {
          todos: testTodos
        }
      };

      const mockMessage = {
        id: 'msg_123',
        timestamp: '2025-01-25T10:30:00.000Z'
      };

      toolUsageTracker.trackTodoWrite(testAgentId, mockToolUse, mockMessage);

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(1);
      expect(agentData.todoWriteCalls).toBe(1);
      expect(agentData.currentTodos).toHaveLength(3);
      expect(agentData.toolCallHistory).toHaveLength(1);

      // Check todos structure
      const todos = agentData.currentTodos;
      expect(todos[0]).toMatchObject({
        id: 'task-1',
        content: 'Complete first task',
        priority: 'high',
        status: 'pending'
      });
      expect(todos[0]).toHaveProperty('timestamp');

      // Check tool call history
      const toolCall = agentData.toolCallHistory[0];
      expect(toolCall).toMatchObject({
        toolName: 'TodoWrite',
        messageId: 'msg_123',
        success: true
      });
      expect(toolCall).toHaveProperty('timestamp');
      expect(toolCall.input).toEqual(testTodos);
    });

    test('should update todos on subsequent TodoWrite calls', () => {
      const initialTodos = [testTodos[0]];
      const updatedTodos = [
        { ...testTodos[0], status: 'completed' },
        testTodos[1]
      ];

      // First TodoWrite call
      toolUsageTracker.trackTodoWrite(testAgentId, {
        id: 'tool_1',
        name: 'TodoWrite',
        input: { todos: initialTodos }
      }, { id: 'msg_1' });

      // Second TodoWrite call with updates
      toolUsageTracker.trackTodoWrite(testAgentId, {
        id: 'tool_2', 
        name: 'TodoWrite',
        input: { todos: updatedTodos }
      }, { id: 'msg_2' });

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(2);
      expect(agentData.todoWriteCalls).toBe(2);
      expect(agentData.currentTodos).toHaveLength(2);
      expect(agentData.currentTodos[0].status).toBe('completed');
    });

    test('should handle TodoWrite errors gracefully', () => {
      const invalidToolUse = {
        id: 'tool_invalid',
        name: 'TodoWrite',
        input: null // Invalid input
      };

      const mockMessage = { id: 'msg_error' };

      // Should not throw error
      expect(() => {
        toolUsageTracker.trackTodoWrite(testAgentId, invalidToolUse, mockMessage);
      }).not.toThrow();

      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(1);
      expect(agentData.toolCallHistory[0].success).toBe(false);
      expect(agentData.currentTodos).toEqual([]);
    });
  });

  describe('Data Retrieval', () => {
    beforeEach(() => {
      toolUsageTracker.trackTodoWrite(testAgentId, {
        id: 'setup_tool',
        name: 'TodoWrite', 
        input: { todos: testTodos }
      }, { id: 'setup_msg' });
    });

    test('should get agent todos', () => {
      const todos = toolUsageTracker.getAgentTodos(testAgentId);
      expect(todos).toHaveLength(3);
      expect(todos[0].id).toBe('task-1');
    });

    test('should return empty array for non-existent agent', () => {
      const todos = toolUsageTracker.getAgentTodos('non-existent');
      expect(todos).toEqual([]);
    });

    test('should get comprehensive tool usage statistics', () => {
      const stats = toolUsageTracker.getAgentToolUsage(testAgentId);
      
      expect(stats).toMatchObject({
        totalToolCalls: 1,
        todoWriteCalls: 1
      });
      expect(stats.currentTodos).toHaveLength(3);
      expect(stats.toolCallHistory).toHaveLength(1);
    });

    test('should return empty statistics for non-existent agent', () => {
      const stats = toolUsageTracker.getAgentToolUsage('non-existent');
      
      expect(stats).toMatchObject({
        totalToolCalls: 0,
        todoWriteCalls: 0,
        currentTodos: [],
        toolCallHistory: []
      });
    });

    test('should list tracked agents', () => {
      const anotherAgentId = 'another-agent';
      toolUsageTracker.initializeAgent(anotherAgentId);
      
      const trackedAgents = toolUsageTracker.getTrackedAgents();
      expect(trackedAgents).toContain(testAgentId);
      expect(trackedAgents).toContain(anotherAgentId);
      
      toolUsageTracker.cleanupAgent(anotherAgentId);
    });
  });

  describe('Data Persistence', () => {
    beforeEach(() => {
      toolUsageTracker.trackTodoWrite(testAgentId, {
        id: 'persistence_tool',
        name: 'TodoWrite',
        input: { todos: testTodos }
      }, { id: 'persistence_msg' });
    });

    test('should export agent data', () => {
      const exportedData = toolUsageTracker.exportAgentData(testAgentId);
      
      expect(exportedData).toHaveProperty('todos');
      expect(exportedData).toHaveProperty('toolCalls');
      expect(exportedData.todos).toHaveLength(3);
      expect(exportedData.toolCalls).toHaveLength(1);
      
      // Should be serializable
      expect(() => JSON.stringify(exportedData)).not.toThrow();
    });

    test('should return null for non-existent agent export', () => {
      const exportedData = toolUsageTracker.exportAgentData('non-existent');
      expect(exportedData).toBeNull();
    });

    test('should import agent data', () => {
      const dataToImport = {
        todos: [testTodos[0]],
        toolCalls: [{
          toolName: 'TodoWrite',
          timestamp: '2025-01-25T10:00:00.000Z',
          messageId: 'imported_msg',
          success: true
        }]
      };

      const newAgentId = 'imported-agent';
      toolUsageTracker.importAgentData(newAgentId, dataToImport);
      
      const agentData = toolUsageTracker.getAgentToolUsage(newAgentId);
      expect(agentData.currentTodos).toHaveLength(1);
      expect(agentData.totalToolCalls).toBe(1);
      expect(agentData.currentTodos[0].id).toBe('task-1');
      
      toolUsageTracker.cleanupAgent(newAgentId);
    });

    test('should handle invalid import data gracefully', () => {
      const newAgentId = 'invalid-import-agent';
      
      // Should not throw with invalid data
      expect(() => {
        toolUsageTracker.importAgentData(newAgentId, null);
      }).not.toThrow();
      
      expect(() => {
        toolUsageTracker.importAgentData(newAgentId, 'invalid');
      }).not.toThrow();
      
      const agentData = toolUsageTracker.getAgentToolUsage(newAgentId);
      expect(agentData.currentTodos).toEqual([]);
      expect(agentData.totalToolCalls).toBe(0);
      
      toolUsageTracker.cleanupAgent(newAgentId);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup agent data', () => {
      toolUsageTracker.initializeAgent(testAgentId);
      expect(toolUsageTracker.getTrackedAgents()).toContain(testAgentId);
      
      toolUsageTracker.cleanupAgent(testAgentId);
      expect(toolUsageTracker.getTrackedAgents()).not.toContain(testAgentId);
      
      const agentData = toolUsageTracker.getAgentToolUsage(testAgentId);
      expect(agentData.totalToolCalls).toBe(0);
    });

    test('should handle cleanup of non-existent agent gracefully', () => {
      expect(() => {
        toolUsageTracker.cleanupAgent('non-existent');
      }).not.toThrow();
    });
  });
});