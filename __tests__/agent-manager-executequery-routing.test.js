/**
 * Test agent-manager executeQuery routing fix (Issue #171)
 * Verifies that sendInstructions properly routes through SDKCommunicationManager.executeQuery
 * to enable todo tracking, logging, and other critical functionality
 */

jest.mock('child_process');
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('{"sessions": []}'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    isDirectory: jest.fn().mockReturnValue(true)
  }),
  rmSync: jest.fn(),
}));

jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    logLevel: 'info',
    napoleonDir: '/test/.napoleon'
  }),
  SESSIONS_FILE: '/test/.napoleon/sessions.json',
  initializeSessionStorage: jest.fn(),
}));

// Mock tool usage tracker
const mockToolUsageTracker = {
  initializeAgent: jest.fn(),
  trackTodoWrite: jest.fn(),
  getAgentTodos: jest.fn().mockReturnValue([]),
  cleanupAgent: jest.fn(),
};

jest.mock('../src/core/tool-usage-tracker', () => mockToolUsageTracker);

// Mock logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const AgentManager = require('../src/core/agent-manager');
const { AgentStatus } = require('../src/core/agent-manager');
const logger = require('../src/utils/logger');

describe('AgentManager executeQuery Routing Fix (Issue #171)', () => {
  let agentManager;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-key';

    // Mock process for agent spawning
    mockProcess = {
      pid: 12345,
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
    };
    spawn.mockReturnValue(mockProcess);

    // Mock git commands to return valid responses
    execSync.mockImplementation((cmd) => {
      if (cmd.includes('git rev-parse')) return 'true';
      return '/path/to/repo';
    });

    agentManager = new AgentManager();
  });

  describe('sendInstructions executeQuery integration', () => {
    test('should call executeQuery method through SDKCommunicationManager', async () => {
      // Spawn an agent using the standard pattern
      const instructions = 'Test executeQuery routing';
      const agent = await agentManager.spawnAgent(instructions);
      
      // Mock the executeQuery method to verify it's called
      const executeQuerySpy = jest.spyOn(agentManager.sdkManager, 'executeQuery');
      executeQuerySpy.mockResolvedValue([
        { id: 'msg_1', type: 'text', content: 'Test response' }
      ]);

      // Send instructions to the agent
      await agentManager.sendInstructions(agent.id, 'Follow-up instructions');
      
      // Allow async operations to complete
      await new Promise(resolve => setImmediate(resolve));

      // Verify that executeQuery was called (indicating proper routing)
      expect(executeQuerySpy).toHaveBeenCalledWith(
        agent.id,
        'Follow-up instructions',
        expect.objectContaining({
          permissionMode: 'bypassPermissions',
          cwd: expect.any(String),
          abortController: expect.any(AbortController)
        })
      );
    });

    test('should verify tool usage tracking integration point', async () => {
      // Spawn an agent
      const agent = await agentManager.spawnAgent('Test tool tracking');
      
      // Mock executeQuery to verify it processes messages
      const executeQuerySpy = jest.spyOn(agentManager.sdkManager, 'executeQuery');
      executeQuerySpy.mockResolvedValue([
        {
          id: 'msg_todo',
          content: [
            {
              type: 'tool_use', 
              id: 'tool_123',
              name: 'TodoWrite',
              input: { todos: [{ id: '1', content: 'Test', status: 'pending', priority: 'high' }] }
            }
          ]
        }
      ]);

      // Send instructions
      await agentManager.sendInstructions(agent.id, 'Create a todo');
      await new Promise(resolve => setImmediate(resolve));

      // Verify executeQuery was called - this is the integration point that enables todo tracking
      expect(executeQuerySpy).toHaveBeenCalled();
      
      // Note: The actual todo tracking is tested in sdk-communication-manager-todowrite.test.js
      // This test verifies the routing is in place
    });

    test('should handle agent status updates correctly', async () => {
      // Spawn an agent
      const agent = await agentManager.spawnAgent('Test status updates');
      
      // Mock executeQuery to simulate normal operation
      const executeQuerySpy = jest.spyOn(agentManager.sdkManager, 'executeQuery');
      executeQuerySpy.mockResolvedValue([
        { id: 'msg_1', type: 'text', content: 'Task completed' }
      ]);

      // Verify initial status
      expect(agent.status).toBe(AgentStatus.IDLE);

      // Send instructions
      await agentManager.sendInstructions(agent.id, 'Test instructions');
      
      // Status should be set to RUNNING during execution
      expect(agent.status).toBe(AgentStatus.RUNNING);

      // Allow async completion
      await new Promise(resolve => setImmediate(resolve));

      // Status should return to IDLE after completion
      expect(agent.status).toBe(AgentStatus.IDLE);
    });

    test('should handle executeQuery errors properly', async () => {
      // Spawn an agent
      const agent = await agentManager.spawnAgent('Test error handling');
      
      // Mock executeQuery to throw an error
      const executeQuerySpy = jest.spyOn(agentManager.sdkManager, 'executeQuery');
      executeQuerySpy.mockRejectedValue(new Error('SDK communication failed'));

      // Send instructions that will fail
      await agentManager.sendInstructions(agent.id, 'This will fail');
      await new Promise(resolve => setImmediate(resolve));

      // Verify agent status was updated to ERROR
      expect(agent.status).toBe(AgentStatus.ERROR);
      expect(agent.error).toBe('SDK communication failed');
    });
  });

  describe('backwards compatibility', () => {
    test('should maintain existing agent spawning functionality', async () => {
      // Test that the fix doesn't break existing functionality
      const instructions = 'Test spawning compatibility';
      const agent = await agentManager.spawnAgent(instructions);
      
      expect(agent).toBeDefined();
      expect(agent.instructions).toBe(instructions);
      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });
});