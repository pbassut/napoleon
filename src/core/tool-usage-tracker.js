/**
 * Tool Usage Tracker
 * Tracks TodoWrite and other tool usage for agent sessions
 */
class ToolUsageTracker {
  constructor() {
    this.agentToolUsage = new Map(); // agentId -> { todos: [], toolCalls: [] }
  }

  /**
   * Initialize tracking for an agent
   * @param {string} agentId - The agent ID
   */
  initializeAgent(agentId) {
    if (!this.agentToolUsage.has(agentId)) {
      this.agentToolUsage.set(agentId, {
        todos: [],
        toolCalls: []
      });
    }
  }

  /**
   * Track TodoWrite tool usage
   * @param {string} agentId - The agent ID
   * @param {Object} toolUse - The tool use object from Claude SDK
   * @param {Object} message - The full message object
   */
  trackTodoWrite(agentId, toolUse, message) {
    this.initializeAgent(agentId);
    
    const agentData = this.agentToolUsage.get(agentId);
    
    try {
      const input = toolUse.input;
      if (input && input.todos && Array.isArray(input.todos)) {
        // Update the todos array with new data
        agentData.todos = input.todos.map(todo => ({
          id: todo.id,
          content: todo.content,
          priority: todo.priority,
          status: todo.status,
          timestamp: new Date().toISOString()
        }));

        // Track successful tool call
        agentData.toolCalls.push({
          toolName: 'TodoWrite',
          timestamp: new Date().toISOString(),
          messageId: message.id || null,
          input: input.todos,
          success: true
        });
      } else {
        // Track failed tool call for invalid input
        agentData.toolCalls.push({
          toolName: 'TodoWrite',
          timestamp: new Date().toISOString(),
          messageId: message.id || null,
          error: 'Invalid input: todos array not found or not an array',
          success: false
        });
      }
    } catch (error) {
      console.error('Error tracking TodoWrite usage:', error);
      
      // Track failed tool call for exceptions
      agentData.toolCalls.push({
        toolName: 'TodoWrite',
        timestamp: new Date().toISOString(),
        messageId: message.id || null,
        error: error.message,
        success: false
      });
    }
  }

  /**
   * Get current todos for an agent
   * @param {string} agentId - The agent ID
   * @returns {Array} Current todos array
   */
  getAgentTodos(agentId) {
    const agentData = this.agentToolUsage.get(agentId);
    const todos = agentData ? agentData.todos : [];
    
    return todos;
  }

  /**
   * Get tool usage statistics for an agent
   * @param {string} agentId - The agent ID
   * @returns {Object} Tool usage statistics
   */
  getAgentToolUsage(agentId) {
    const agentData = this.agentToolUsage.get(agentId);
    if (!agentData) {
      return {
        totalToolCalls: 0,
        todoWriteCalls: 0,
        currentTodos: [],
        toolCallHistory: []
      };
    }

    return {
      totalToolCalls: agentData.toolCalls.length,
      todoWriteCalls: agentData.toolCalls.filter(call => call.toolName === 'TodoWrite').length,
      currentTodos: agentData.todos,
      toolCallHistory: agentData.toolCalls
    };
  }

  /**
   * Clean up tracking data for terminated agents
   * @param {string} agentId - The agent ID
   */
  cleanupAgent(agentId) {
    this.agentToolUsage.delete(agentId);
  }

  /**
   * Get all tracked agents
   * @returns {Array} Array of agent IDs being tracked
   */
  getTrackedAgents() {
    return Array.from(this.agentToolUsage.keys());
  }

  /**
   * Export tracking data for an agent (for persistence)
   * @param {string} agentId - The agent ID
   * @returns {Object} Serializable tracking data
   */
  exportAgentData(agentId) {
    const agentData = this.agentToolUsage.get(agentId);
    return agentData ? JSON.parse(JSON.stringify(agentData)) : null;
  }

  /**
   * Import tracking data for an agent (for restoration)
   * @param {string} agentId - The agent ID
   * @param {Object} data - The tracking data to import
   */
  importAgentData(agentId, data) {
    if (data && typeof data === 'object') {
      this.agentToolUsage.set(agentId, {
        todos: data.todos || [],
        toolCalls: data.toolCalls || []
      });
    }
  }
}

// Create singleton instance
const toolUsageTracker = new ToolUsageTracker();

module.exports = toolUsageTracker;
