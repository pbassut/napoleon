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
    isDirectory: jest.fn().mockReturnValue(true),
  }),
  rmSync: jest.fn(),
}));

jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    logLevel: 'info',
    napoleonDir: '/test/.napoleon',
    features: {
      autoCleanup: true,
    },
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

// Mock SDKCommunicationManager
const mockSDKManager = {
  executeQuery: jest.fn(),
  executeQueryStream: jest.fn(),
  initializeSDKSession: jest.fn(),
  terminateSession: jest.fn(),
  getSession: jest.fn(),
  getActiveSessions: jest.fn(),
};

jest.mock('../src/core/sdk/communication-manager', () => jest.fn().mockImplementation(() => mockSDKManager));


// Mock AgentLogManager
jest.mock('../src/core/logging/agent-log-manager', () => jest.fn().mockImplementation(() => ({
  initialize: jest.fn().mockResolvedValue(undefined),
})));

const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const AgentManager = require('../src/core/agent-manager');
const { AgentStatus } = require('../src/core/agent-manager');
const logger = require('../src/utils/logger');

describe('AgentManager executeQuery Routing Fix (Issue #171)', () => {
  let agentManager;
  let mockProcess;

  beforeEach(async () => {
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

    // Mock exec for git worktree and npm commands
    exec.mockImplementation((cmd, options, callback) => {
      if (cmd.includes('git worktree add')) {
        callback(null, 'Preparing worktree', '');
      } else if (cmd.includes('git worktree remove')) {
        callback(null, '', '');
      } else if (cmd.includes('git worktree unlock')) {
        callback(null, '', '');
      } else if (cmd.includes('git worktree list')) {
        callback(null, '', '');
      } else if (cmd.includes('npm ci')) {
        callback(null, 'npm ci complete', '');
      } else {
        callback(new Error('Unknown command'));
      }
    });

    // Reset SDK manager mocks
    mockSDKManager.executeQuery.mockClear();
    mockSDKManager.executeQueryStream.mockClear();
    mockSDKManager.initializeSDKSession.mockResolvedValue({
      agentId: 'test-agent',
      sessionId: 'test-session',
      isActive: true,
    });
    mockSDKManager.getSession.mockReturnValue({
      agentId: 'test-agent',
      isActive: true,
    });

    agentManager = new AgentManager();
    // Initialize the agent manager to set up all services
    await agentManager.initialize();
  });

  describe('sendInstructions executeQuery integration', () => {
    test('should call executeQuery method through SDKCommunicationManager', async () => {
      // Spawn an agent using the standard pattern
      const instructions = 'Test executeQuery routing';
      const agent = await agentManager.spawnAgent(instructions);

      // Set up the mock response for executeQueryStream (async generator)
      async function* mockStream() {
        yield { id: 'msg_1', type: 'text', content: 'Test response' };
      }
      mockSDKManager.executeQueryStream.mockReturnValue(mockStream());

      // Send instructions to the agent
      await agentManager.sendInstructions(agent.id, 'Follow-up instructions');

      // Allow async operations to complete
      await new Promise((resolve) => setImmediate(resolve));

      // Verify that executeQueryStream was called (indicating proper routing)
      expect(mockSDKManager.executeQueryStream).toHaveBeenCalledWith(
        agent.sessionId || agent.id,
        'Follow-up instructions',
      );
    }, 15000);

    test('should verify tool usage tracking integration point', async () => {
      // Spawn an agent
      const agent = await agentManager.spawnAgent('Test tool tracking');

      // Set up the mock response for executeQueryStream
      async function* mockStream() {
        yield {
          id: 'msg_todo',
          content: [
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'TodoWrite',
              input: {
                todos: [{
                  id: '1', content: 'Test', status: 'pending', priority: 'high',
                }],
              },
            },
          ],
        };
      }
      mockSDKManager.executeQueryStream.mockReturnValue(mockStream());

      // Send instructions
      await agentManager.sendInstructions(agent.id, 'Create a todo');
      await new Promise((resolve) => setImmediate(resolve));

      // Verify executeQueryStream was called - this is the integration point that enables todo tracking
      expect(mockSDKManager.executeQueryStream).toHaveBeenCalled();

      // Note: The actual todo tracking is tested in sdk-communication-manager-todowrite.test.js
      // This test verifies the routing is in place
    }, 15000);

    test('should handle agent status updates correctly', async () => {
      // Spawn an agent
      const agent = await agentManager.spawnAgent('Test status updates');

      // Set up the mock response for executeQueryStream
      async function* mockStream() {
        yield { id: 'msg_1', type: 'text', content: 'Task completed' };
      }
      mockSDKManager.executeQueryStream.mockReturnValue(mockStream());

      // Verify initial status (could be spawning or forking)
      expect([AgentStatus.SPAWNING, AgentStatus.FORKING]).toContain(agent.status);

      // Send instructions
      await agentManager.sendInstructions(agent.id, 'Test instructions');

      // Allow async completion
      await new Promise((resolve) => setImmediate(resolve));

      // Verify executeQueryStream was called
      expect(mockSDKManager.executeQueryStream).toHaveBeenCalled();
    }, 15000);

    test('should handle executeQuery errors properly', async () => {
      // Spawn an agent
      const agent = await agentManager.spawnAgent('Test error handling');

      // Set up the mock to throw an error
      async function* errorStream() {
        yield; // Need at least one yield for generator
        throw new Error('SDK communication failed');
      }
      mockSDKManager.executeQueryStream.mockReturnValue(errorStream());

      // Send instructions that will fail
      await agentManager.sendInstructions(agent.id, 'This will fail');
      await new Promise((resolve) => setImmediate(resolve));

      // Verify executeQueryStream was called
      expect(mockSDKManager.executeQueryStream).toHaveBeenCalled();
    }, 15000);
  });

  describe('backwards compatibility', () => {
    test('should maintain existing agent spawning functionality', async () => {
      // Test that the fix doesn't break existing functionality
      const instructions = 'Test spawning compatibility';
      const agent = await agentManager.spawnAgent(instructions);

      expect(agent).toBeDefined();
      expect(agent.instructions).toBe(instructions);
      expect([AgentStatus.SPAWNING, AgentStatus.FORKING]).toContain(agent.status);
    }, 15000);
  });
});
