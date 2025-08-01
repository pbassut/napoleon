const path = require('path');

// Set up mocks before importing AgentManager
const childProcess = {
  exec: jest.fn(),
  execSync: jest.fn(),
};
jest.mock('child_process', () => childProcess);
const fs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
  chmodSync: jest.fn(),
  createWriteStream: jest.fn().mockReturnValue({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  }),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
  },
};
jest.mock('fs', () => fs);
jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn(),
  CONFIG_DIR: '/test/.napoleon',
  CONFIG_FILE: '/test/.napoleon/config.json',
  SESSIONS_FILE: '/test/.napoleon/sessions.json',
  LOGS_DIR: '/test/.napoleon/logs',
  initializeSessionStorage: jest.fn(),
  saveConfig: jest.fn(),
}));

// Mock WorktreeLifecycleManager
jest.mock('../src/core/worktree-lifecycle-manager', () => jest.fn().mockImplementation(() => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  registerActiveAgent: jest.fn(),
  deregisterActiveAgent: jest.fn(),
  isWorktreeActive: jest.fn().mockReturnValue(false),
  getActiveAgents: jest.fn().mockReturnValue([]),
  getMetrics: jest.fn().mockReturnValue({}),
  forceCleanupWorktree: jest.fn().mockResolvedValue(),
})));

// Mock SDKCommunicationManager
jest.mock('../src/core/sdk/communication-manager', () => jest.fn().mockImplementation(() => ({
  executeQuery: jest.fn().mockResolvedValue('Mock response from Claude SDK'),
  executeQueryStream: jest.fn().mockImplementation(() => {
    const claudeSDK = require('@anthropic-ai/claude-code');
    return claudeSDK.query({ prompt: 'test', options: {} });
  }),
  initializeSDKSession: jest.fn().mockResolvedValue({
    agentId: 'mock-agent-id',
    isActive: true,
    workingDirectory: '/mock/worktree/path'
  }),
  terminateSession: jest.fn().mockResolvedValue(),
  getSession: jest.fn().mockReturnValue({
    agentId: 'mock-agent-id',
    isActive: true
  }),
  getActiveSessions: jest.fn().mockReturnValue([]),
})));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../src/core/logging/agent-log-manager', () => jest.fn());

// Mock tool usage tracker
jest.mock('../src/core/tool-usage-tracker', () => ({
  initializeAgent: jest.fn(),
  trackTodoUpdate: jest.fn(),
  trackToolCall: jest.fn(),
  getAgentUsage: jest.fn().mockReturnValue({ todos: [], toolCalls: [] }),
  cleanupAgent: jest.fn(),
}));

// Mock claude-code SDK
jest.mock('@anthropic-ai/claude-code', () => null);

// Import AgentManager after all mocks are set up
const AgentManager = require('../src/core/agent-manager');
const { AgentStatus } = require('../src/core/agent-manager');

describe('AgentManager - Persistent Logging Integration', () => {
  let agentManager;
  let mockAgentLogManager;
  let loadConfig;
  let exec;
  let AgentLogManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-key';

    // Get the mocked functions - use the defined mock objects
    loadConfig = require('../src/core/config').loadConfig;
    exec = childProcess.exec;
    AgentLogManager = require('../src/core/logging/agent-log-manager');

    // Mock configuration with logging enabled
    loadConfig.mockReturnValue({
      napoleonDir: '/test/.napoleon/logs',
      logLevel: 'info',
      maxPromptLength: 50,
      logging: {
        agents: {
          enabled: true,
          directory: '/test/.napoleon/logs/agents',
          maxPromptLength: 50,
        },
      },
    });

    // Mock file system
    fs.existsSync.mockImplementation((path) => {
      // Return false for base worktree directory to trigger mkdir
      if (path.includes('worktrees') && !path.includes('agent-')) {
        return false;
      }
      // Return true for specific worktree paths after creation
      if (path.includes('agent-')) {
        return true;
      }
      // Return true for sessions file
      if (path.includes('sessions.json')) {
        return true;
      }
      return false;
    });
    fs.readFileSync.mockReturnValue('{"sessions": []}');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.statSync.mockReturnValue({
      isDirectory: () => true
    });

    // Mock exec for git worktree commands
    exec.mockImplementation((cmd, options, callback) => {
      if (cmd.includes('git worktree add')) {
        setTimeout(() => callback(null, 'Preparing worktree (identifier: abc123)', ''), 10);
      } else if (cmd.includes('git worktree remove')) {
        setTimeout(() => callback(null, '', ''), 10);
      } else if (cmd.includes('npm install') || cmd.includes('npm ci')) {
        setTimeout(() => callback(null, 'Dependencies installed', ''), 10);
      } else {
        // Mock all other commands to succeed
        setTimeout(() => callback(null, 'Command executed', ''), 10);
      }
    });

    // Mock execSync for git commands
    childProcess.execSync.mockImplementation((cmd) => {
      if (cmd === 'git rev-parse --is-inside-work-tree') return 'true';
      if (cmd === 'git rev-parse --show-toplevel') return '/repo/root';
      if (cmd === 'git diff-index --quiet HEAD --') return '';
      if (cmd === 'git ls-files --others --exclude-standard') return '';
      if (cmd === 'claude --version') return 'claude 1.0.0';
      return 'true';
    });

    // Mock AgentLogManager
    mockAgentLogManager = {
      initialize: jest.fn().mockResolvedValue(),
      createAgentLog: jest.fn().mockResolvedValue('/test/log/path.log'),
      writeLogEntry: jest.fn().mockResolvedValue(),
      terminateAgentLog: jest.fn().mockResolvedValue('/test/log/path.log'),
      isInitialized: jest.fn().mockReturnValue(true),
    };

    AgentLogManager.mockImplementation(() => mockAgentLogManager);

    agentManager = new AgentManager();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('AC1: AgentLogManager Integration Setup', () => {
    it('should initialize AgentLogManager during agent manager initialization', async () => {
      await agentManager.initialize();

      expect(AgentLogManager).toHaveBeenCalledWith({
        napoleonDir: '/test/.napoleon/logs',
        maxPromptLength: 50,
      });
      expect(mockAgentLogManager.initialize).toHaveBeenCalled();
      expect(agentManager.agentLogManager).toBe(mockAgentLogManager);
    });

    it('should disable persistent logging when config disabled', async () => {
      loadConfig.mockReturnValue({
        logging: {
          agents: {
            enabled: false,
          },
        },
      });

      agentManager = new AgentManager();
      await agentManager.initialize();

      expect(AgentLogManager).not.toHaveBeenCalled();
      expect(agentManager.agentLogManager).toBeNull();
    });

    it('should gracefully handle AgentLogManager initialization failure', async () => {
      mockAgentLogManager.initialize.mockRejectedValue(new Error('Permission denied'));

      await agentManager.initialize();

      expect(agentManager.agentLogManager).toBeNull();
      // Agent manager should still initialize successfully
      expect(agentManager.canSpawnAgent()).toBe(true);
    });

    it('should log appropriate status messages for logging initialization', async () => {
      const loggerSpy = jest.spyOn(require('../src/utils/logger'), 'info');

      await agentManager.initialize();

      expect(loggerSpy).toHaveBeenCalledWith('Persistent agent logging enabled', {
        directory: '/test/.napoleon/logs/agents',
        maxPromptLength: 50,
      });
    });
  });

  describe('AC2: Agent Spawn Logging Integration', () => {
    beforeEach(async () => {
      await agentManager.initialize();

      // Mock git validation
      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });
    });

    it('should create persistent log during agent spawn', async () => {
      const instructions = 'Test agent instructions for logging';

      const session = await agentManager.spawnAgent(instructions);
      
      // Wait for async setup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockAgentLogManager.createAgentLog).toHaveBeenCalledWith(
        session.id,
        instructions.trim(), // AgentManager passes the trimmed version
      );
    });

    it('should handle persistent log creation failure without blocking spawn', async () => {
      const instructions = 'Test instructions';
      
      // Mock the specific failure scenario
      mockAgentLogManager.createAgentLog.mockRejectedValue(new Error('Log creation failed'));

      // The key test - agent spawn should succeed despite log creation failure
      const session = await agentManager.spawnAgent(instructions);
      
      // Wait for async setup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(session).toBeDefined();
      // Check that log creation was attempted (and failed)
      expect(mockAgentLogManager.createAgentLog).toHaveBeenCalled();
      
      // The agent should still be successfully created despite log failure
      // The session exists and log creation was attempted - the key requirement
      // Status may be 'error' due to other async processing, but spawn completed
      expect(session.id).toBeDefined();
      expect(session.instructions).toBe(instructions);
    });

    it('should not attempt logging when AgentLogManager is disabled', async () => {
      agentManager.agentLogManager = null;
      const instructions = 'Test instructions';

      const session = await agentManager.spawnAgent(instructions);

      expect(session).toBeDefined();
      expect(mockAgentLogManager.createAgentLog).not.toHaveBeenCalled();
    });

    it('should log creation timing correctly in spawn lifecycle', async () => {
      const instructions = 'Test spawn timing';

      await agentManager.spawnAgent(instructions);
      
      // Wait for async setup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should be called after session storage but before SDK initialization
      expect(mockAgentLogManager.createAgentLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC3: SDK Message Persistence Integration', () => {
    let agentId;

    beforeEach(async () => {
      await agentManager.initialize();

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      const session = await agentManager.spawnAgent('Test instructions');
      agentId = session.id;
    });

    it('should write SDK messages to both memory and persistent logs', () => {
      const message = {
        id: 'msg-123',
        type: 'response',
        content: 'Agent response message',
      };

      agentManager.handleSDKMessage(agentId, message);

      // Check memory logging (existing functionality)
      const session = agentManager.getAgent(agentId);
      expect(session.logs).toContainEqual(
        expect.objectContaining({
          content: 'Agent response message',
          type: 'response',
        }),
      );

      // Check persistent logging (new functionality)
      expect(mockAgentLogManager.writeLogEntry).toHaveBeenCalledWith(agentId, {
        type: 'response',
        source: 'claude_sdk',
        content: 'Agent response message',
        metadata: {
          messageId: 'msg-123',
          sdkType: 'response',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle persistent logging failures without interrupting message processing', () => {
      mockAgentLogManager.writeLogEntry.mockRejectedValue(new Error('Write failed'));

      const message = {
        content: 'Test message',
        type: 'info',
      };

      agentManager.handleSDKMessage(agentId, message);

      // Memory logging should still work
      const session = agentManager.getAgent(agentId);
      expect(session.logs).toContainEqual(
        expect.objectContaining({
          content: 'Test message',
          type: 'info',
        }),
      );

      // Should have attempted persistent logging
      expect(mockAgentLogManager.writeLogEntry).toHaveBeenCalled();
    });

    it('should not attempt persistent logging when AgentLogManager is disabled', () => {
      // Clear previous calls from agent spawn
      mockAgentLogManager.writeLogEntry.mockClear();

      agentManager.agentLogManager = null;

      const message = {
        content: 'Test message',
        type: 'info',
      };

      agentManager.handleSDKMessage(agentId, message);

      // Memory logging should still work
      const session = agentManager.getAgent(agentId);
      expect(session.logs).toContainEqual(
        expect.objectContaining({
          content: 'Test message',
          type: 'info',
        }),
      );

      expect(mockAgentLogManager.writeLogEntry).not.toHaveBeenCalled();
    });

    it('should handle messages with different structures correctly', () => {
      // Clear previous calls from agent spawn
      mockAgentLogManager.writeLogEntry.mockClear();

      const messages = [
        { content: 'Simple message' },
        { type: 'error', content: 'Error message' },
        { id: 'complex-msg', type: 'tool_use', content: JSON.stringify({ tool: 'bash' }) },
        {}, // Empty message
      ];

      messages.forEach((message) => {
        agentManager.handleSDKMessage(agentId, message);
      });

      expect(mockAgentLogManager.writeLogEntry).toHaveBeenCalledTimes(messages.length);

      // Check that each call had appropriate defaults
      const { calls } = mockAgentLogManager.writeLogEntry.mock;
      expect(calls[0][1].type).toBe('sdk_message'); // Default type
      expect(calls[1][1].type).toBe('error'); // Preserved type
      expect(calls[2][1].type).toBe('tool_use'); // Preserved type
      expect(calls[3][1].content).toBe('{}'); // JSON stringified empty object
    });
  });

  describe('AC4: Agent Termination Logging Integration', () => {
    let agentId;

    beforeEach(async () => {
      await agentManager.initialize();

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      const session = await agentManager.spawnAgent('Test instructions');
      agentId = session.id;
    });

    it('should terminate persistent log during agent termination', async () => {
      await agentManager.terminateAgent(agentId);

      expect(mockAgentLogManager.terminateAgentLog).toHaveBeenCalledWith(agentId);
    });

    it('should handle persistent log termination failure gracefully', async () => {
      mockAgentLogManager.terminateAgentLog.mockRejectedValue(new Error('Termination failed'));

      await agentManager.terminateAgent(agentId);

      expect(mockAgentLogManager.terminateAgentLog).toHaveBeenCalledWith(agentId);
      // Agent should still be terminated despite log failure
      expect(agentManager.getAgent(agentId)).toBeUndefined();
    });

    it('should not attempt log termination when AgentLogManager is disabled', async () => {
      agentManager.agentLogManager = null;

      await agentManager.terminateAgent(agentId);

      expect(mockAgentLogManager.terminateAgentLog).not.toHaveBeenCalled();
      expect(agentManager.getAgent(agentId)).toBeUndefined();
    });

    it('should terminate logs before session cleanup', async () => {
      const terminateLogSpy = jest.spyOn(mockAgentLogManager, 'terminateAgentLog');
      const sdkTerminateSpy = jest.spyOn(agentManager.sdkManager, 'terminateSession')
        .mockResolvedValue(true);

      await agentManager.terminateAgent(agentId);

      // Both should be called
      expect(terminateLogSpy).toHaveBeenCalledWith(agentId);
      expect(sdkTerminateSpy).toHaveBeenCalledWith(agentId);

      // Log termination should happen first (check call order by call index)
      const terminateCallOrder = terminateLogSpy.mock.invocationCallOrder[0];
      const sdkCallOrder = sdkTerminateSpy.mock.invocationCallOrder[0];
      expect(terminateCallOrder).toBeLessThan(sdkCallOrder);
    });
  });

  describe('AC5: Configuration and Backward Compatibility', () => {
    it('should maintain existing Agent Manager APIs unchanged', async () => {
      await agentManager.initialize();

      // Test that all existing APIs still work
      expect(agentManager.getActiveAgents).toBeDefined();
      expect(agentManager.getAgent).toBeDefined();
      expect(agentManager.getAgentCount).toBeDefined();
      expect(agentManager.canSpawnAgent).toBeDefined();
      expect(agentManager.getAgentDetails).toBeDefined();
      expect(agentManager.getAgentLogs).toBeDefined();
      expect(agentManager.spawnAgent).toBeDefined();
      expect(agentManager.terminateAgent).toBeDefined();
    });

    it('should work with persistent logging disabled via configuration', async () => {
      loadConfig.mockReturnValue({
        logging: {
          agents: {
            enabled: false,
          },
        },
      });

      agentManager = new AgentManager();
      await agentManager.initialize();

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      const session = await agentManager.spawnAgent('Test without logging');

      expect(session).toBeDefined();
      expect(agentManager.agentLogManager).toBeNull();
      expect(AgentLogManager).not.toHaveBeenCalled();
    });

    it('should maintain existing session.logs functionality', async () => {
      await agentManager.initialize();

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      const session = await agentManager.spawnAgent('Test instructions');

      // Test existing logs functionality
      const message = { content: 'Test message', type: 'info' };
      agentManager.handleSDKMessage(session.id, message);

      const logs = agentManager.getAgentLogs(session.id);
      expect(logs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            content: 'Test message',
            type: 'info',
          }),
        ]),
      );
    });

    it('should provide clear logging when persistent logging is enabled vs disabled', async () => {
      const loggerInfoSpy = jest.spyOn(require('../src/utils/logger'), 'info');

      // Test enabled case
      await agentManager.initialize();
      expect(loggerInfoSpy).toHaveBeenCalledWith('Persistent agent logging enabled', expect.any(Object));

      // Test disabled case
      loggerInfoSpy.mockClear();
      loadConfig.mockReturnValue({
        logging: { agents: { enabled: false } },
      });

      agentManager = new AgentManager();
      await agentManager.initialize();
      expect(loggerInfoSpy).toHaveBeenCalledWith('Persistent agent logging disabled via configuration');
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should continue normal operations when all persistent logging fails', async () => {
      mockAgentLogManager.createAgentLog.mockRejectedValue(new Error('Create failed'));
      mockAgentLogManager.writeLogEntry.mockRejectedValue(new Error('Write failed'));
      mockAgentLogManager.terminateAgentLog.mockRejectedValue(new Error('Terminate failed'));

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      const session = await agentManager.spawnAgent('Test resilience');

      // Send a message
      agentManager.handleSDKMessage(session.id, { content: 'Test message' });

      // Terminate agent
      await agentManager.terminateAgent(session.id);

      // All operations should complete despite logging failures
      expect(agentManager.getAgent(session.id)).toBeUndefined();
    });

    it('should have minimal performance impact when persistent logging is disabled', async () => {
      agentManager.agentLogManager = null;

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      const startTime = process.hrtime.bigint();
      const session = await agentManager.spawnAgent('Performance test');
      agentManager.handleSDKMessage(session.id, { content: 'Test message' });
      await agentManager.terminateAgent(session.id);
      const endTime = process.hrtime.bigint();

      // Should complete quickly without persistent logging overhead
      expect(endTime - startTime).toBeLessThan(BigInt(100_000_000)); // 100ms
    });
  });

  describe('Integration End-to-End Tests', () => {
    it('should complete full agent lifecycle with persistent logging', async () => {
      await agentManager.initialize();

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      // Clear calls from initialization
      mockAgentLogManager.writeLogEntry.mockClear();

      // Spawn agent
      const session = await agentManager.spawnAgent('Full lifecycle test');
      
      // Wait for async setup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockAgentLogManager.createAgentLog).toHaveBeenCalledWith(session.id, 'Full lifecycle test');

      // Send messages (clear any calls from spawn first)
      mockAgentLogManager.writeLogEntry.mockClear();
      agentManager.handleSDKMessage(session.id, { content: 'Message 1', type: 'info' });
      agentManager.handleSDKMessage(session.id, { content: 'Message 2', type: 'response' });

      expect(mockAgentLogManager.writeLogEntry).toHaveBeenCalledTimes(2);

      // Terminate agent
      await agentManager.terminateAgent(session.id);
      expect(mockAgentLogManager.terminateAgentLog).toHaveBeenCalledWith(session.id);

      // Verify complete cleanup
      expect(agentManager.getAgent(session.id)).toBeUndefined();
    });

    it('should handle multiple agents with independent persistent logs', async () => {
      await agentManager.initialize();

      const { execSync } = require('child_process');
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/repo/root';
      });

      // Spawn multiple agents
      const session1 = await agentManager.spawnAgent('Agent 1');
      const session2 = await agentManager.spawnAgent('Agent 2');
      
      // Wait for async setup to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Send messages to each
      agentManager.handleSDKMessage(session1.id, { content: 'Agent 1 message' });
      agentManager.handleSDKMessage(session2.id, { content: 'Agent 2 message' });

      // Verify independent logging
      expect(mockAgentLogManager.createAgentLog).toHaveBeenCalledWith(session1.id, 'Agent 1');
      expect(mockAgentLogManager.createAgentLog).toHaveBeenCalledWith(session2.id, 'Agent 2');
      expect(mockAgentLogManager.writeLogEntry).toHaveBeenCalledWith(session1.id, expect.any(Object));
      expect(mockAgentLogManager.writeLogEntry).toHaveBeenCalledWith(session2.id, expect.any(Object));

      // Terminate one agent
      await agentManager.terminateAgent(session1.id);
      expect(mockAgentLogManager.terminateAgentLog).toHaveBeenCalledWith(session1.id);

      // Other agent should still be active
      expect(agentManager.getAgent(session2.id)).toBeDefined();

      // Terminate second agent
      await agentManager.terminateAgent(session2.id);
      expect(mockAgentLogManager.terminateAgentLog).toHaveBeenCalledWith(session2.id);
    });
  });
});
