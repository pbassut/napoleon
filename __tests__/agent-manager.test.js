const { EnvironmentValidationError } = require('../src/utils/errors');

const childProcess = {
  spawn: jest.fn(),
  execSync: jest.fn(),
  exec: jest.fn(),
};
jest.mock('child_process', () => childProcess);

const { spawn, execSync, exec } = require('child_process');
const fs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
  rmSync: jest.fn(),
};
jest.mock('fs', () => fs);
jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    logLevel: 'info',
    features: {
      autoCleanup: true,
    },
  }),
  SESSIONS_FILE: '/test/.napoleon/sessions.json',
  initializeSessionStorage: jest.fn(),
}));

// Mock SDKCommunicationManager
jest.mock('../src/core/sdk/communication-manager', () => {
  return jest.fn().mockImplementation(() => ({
    executeQuery: jest.fn().mockResolvedValue('Mock response from Claude SDK'),
    executeQueryStream: jest.fn().mockImplementation(() => {
      // Return the same async iterator that the Claude SDK mock provides
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
  }));
});

// Mock other required managers
jest.mock('../src/core/worktree-lifecycle-manager', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
    registerActiveAgent: jest.fn(),
    deregisterActiveAgent: jest.fn(),
    isWorktreeActive: jest.fn().mockReturnValue(false),
    getActiveAgents: jest.fn().mockReturnValue([]),
    getMetrics: jest.fn().mockReturnValue({}),
    forceCleanupWorktree: jest.fn().mockResolvedValue(),
  }));
});

jest.mock('../src/core/logging/agent-log-manager', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
  }));
});

jest.mock('../src/core/tool-usage-tracker', () => ({
  initializeAgent: jest.fn(),
  trackTodoWrite: jest.fn(),
  getAgentTodos: jest.fn().mockReturnValue([]),
  cleanupAgent: jest.fn(),
}));

const AgentManager = require('../src/core/agent-manager');
const { AgentStatus } = require('../src/core/agent-manager');
const { loadConfig, SESSIONS_FILE } = require('../src/core/config');

describe('AgentManager', () => {
  let agentManager;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply config mock after clearAllMocks
    loadConfig.mockReturnValue({
      logLevel: 'info',
      features: {
        autoCleanup: true,
      },
    });

    jest.useFakeTimers();

    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-key';

    // Mock file system with dynamic behavior
    fs.existsSync.mockImplementation((path) => {
      // Sessions file and worktree base dir should exist
      if (path.includes('sessions.json') || path.includes('.napoleon-worktrees')) {
        return true;
      }
      // Worktree paths should exist after creation
      if (path.includes('agent-') && path.includes('-')) {
        return true;
      }
      return false;
    });
    fs.readFileSync.mockReturnValue('{"sessions": []}');
    fs.writeFileSync.mockImplementation(() => {});

    // Mock statSync to return directory info for worktree paths
    fs.statSync.mockImplementation((path) => {
      if (path.includes('agent-') && path.includes('-')) {
        return { isDirectory: () => true };
      }
      return { isDirectory: () => false };
    });

    // Mock process
    mockProcess = {
      pid: 12345,
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      stdin: { write: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
    };

    spawn.mockReturnValue(mockProcess);

    // Mock execSync for git commands with proper validation
    execSync.mockImplementation((cmd) => {
      if (cmd.includes('git rev-parse --is-inside-work-tree')) return 'true';
      if (cmd.includes('git rev-parse --show-toplevel')) return '/repo/root';
      if (cmd.includes('git diff-index --quiet HEAD --')) return '';
      if (cmd.includes('git ls-files --others --exclude-standard')) return '';
      if (cmd === 'claude --version') return 'claude 1.0.0';
      return 'true';
    });

    // Mock exec for git worktree and npm commands
    exec.mockImplementation((cmd, options, callback) => {
      if (cmd.includes('git worktree add')) {
        callback(null, 'Preparing worktree', '');
      } else if (cmd.includes('git worktree remove')) {
        callback(null, '', '');
      } else if (cmd.includes('npm ci')) {
        callback(null, 'npm ci complete', '');
      } else if (cmd.includes('npm install')) {
        callback(null, 'Dependencies installed', '');
      } else {
        callback(new Error('Unknown command'));
      }
    });

    agentManager = new AgentManager();
  });

  afterEach(() => {
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await agentManager.initialize();

      expect(loadConfig).toHaveBeenCalled();
      expect(agentManager.canSpawnAgent()).toBe(true);
      expect(agentManager.agents.size).toBe(0);
    });

    it('should load existing sessions', async () => {
      const existingSessions = {
        sessions: [
          {
            id: 'agent-123',
            sessionId: 'agent-123',
            sdkStatus: 'active',
            status: 'running',
            instructions: 'Test instructions',
            lastActivity: new Date().toISOString(),
          },
        ],
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existingSessions));

      // Mock SDK manager to return active session
      jest.spyOn(agentManager.sdkManager, 'getSession').mockReturnValue({
        isActive: true,
        agentId: 'agent-123',
        workingDirectory: '/test/dir',
      });

      await agentManager.initialize();

      expect(agentManager.agents.size).toBe(1);
      expect(agentManager.agents.get('agent-123')).toBeDefined();
    });

    it('should remove stale sessions', async () => {
      // Use real timers for this test
      jest.useRealTimers();
      
      const existingSessions = {
        sessions: [
          {
            id: 'agent-stale',
            sessionId: 'agent-stale',
            pid: 99999,
            status: 'running',
            instructions: 'Test instructions',
          },
        ],
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existingSessions));

      // Mock the SDK manager to return null for stale sessions (simulating inactive SDK session)
      agentManager.sdkManager.getSession.mockReturnValue(null);

      // Mock process.kill to simulate dead process
      jest.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('Process not found');
      });

      await agentManager.initialize();
      
      // Wait for background session loading to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(agentManager.agents.size).toBe(0);
      
      // Restore fake timers
      jest.useFakeTimers();
    });
  });

  describe('git repository validation', () => {
    it('should validate git repository successfully', () => {
      execSync.mockReturnValueOnce('true');
      execSync.mockReturnValueOnce('/path/to/repo');

      const result = agentManager.validateGitRepository();

      expect(result.isValid).toBe(true);
      expect(result.rootPath).toBe('/path/to/repo');
    });

    it('should fail validation when not in git repository', () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const result = agentManager.validateGitRepository();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Not in a git repository');
    });
  });

  describe('agent spawning', () => {
    beforeEach(async () => {
      await agentManager.initialize();

      // Override exec mock to handle all commands for spawning tests
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
          callback(null, 'Dependencies installed', '');
        } else {
          callback(new Error('Unknown command'));
        }
      });
    });

    it('should spawn agent with valid instructions', async () => {
      const instructions = 'Please help me implement a new feature';

      // Mock git commands
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      const session = await agentManager.spawnAgent(instructions);

      expect(session).toBeDefined();
      expect(session.instructions).toBe(instructions);
      expect(['spawning', 'forking']).toContain(session.status); // Status may be spawning or forking
      expect(session.sessionId).toBeDefined(); // SDK generates session ID
      expect(session.sdkStatus).toBe('connecting'); // SDK starts in connecting state
    });

    it('should accept short instructions (no minimum length)', async () => {
      const instructions = 'hi';

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      const agent = await agentManager.spawnAgent(instructions);
      expect(agent).toBeDefined();
      expect(agent.instructions).toBe('hi');
      expect(['spawning', 'forking']).toContain(agent.status);
    });

    it('should allow unlimited agents (no limit check)', async () => {
      await agentManager.initialize();

      // Test that canSpawnAgent always returns true (no limit)
      expect(agentManager.canSpawnAgent()).toBe(true);

      // Add some mock agents to the internal map to simulate existing agents
      for (let i = 0; i < 10; i++) {
        agentManager.agents.set(`agent-${i}`, { id: `agent-${i}`, status: 'running' });
      }

      // Even with 10 agents, canSpawnAgent should still return true
      expect(agentManager.canSpawnAgent()).toBe(true);
      expect(agentManager.getAgentCount()).toBe(10);
    });

    it.skip('should reject spawning when not in git repository', async () => {
      // Create a new agent manager instance with git validation failing
      const testAgentManager = new AgentManager();
      
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      await expect(testAgentManager.spawnAgent('Valid instructions')).rejects.toThrow(EnvironmentValidationError);
    });

    it.skip('should reject spawning when API key not found (TODO: SDK validation)', async () => {
      // TODO: SDK validation needs to be implemented in SDK communication manager
      // Remove API key from environment
      delete process.env.ANTHROPIC_API_KEY;

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      await expect(agentManager.spawnAgent('Valid instructions')).rejects.toThrow(EnvironmentValidationError);
      await expect(agentManager.spawnAgent('Valid instructions')).rejects.toThrow('ANTHROPIC_API_KEY');

      // Restore API key for other tests
      process.env.ANTHROPIC_API_KEY = 'test-key';
    });

    it.skip('should send instructions to spawned agent', async () => {
      // Use real timers for this test to allow async processing
      jest.useRealTimers();
      
      const instructions = 'Please help me implement a new feature';

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      const session = await agentManager.spawnAgent(instructions);

      // Wait for async SDK processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // With SDK, instructions are sent directly via the query function
      expect(session.logs).toBeDefined();
      expect(session.logs.length).toBeGreaterThan(0);

      // Check that SDK response is in the logs (may not be first due to spawn logging)
      const sdkResponseLog = session.logs.find((log) => log.content === 'Mock response from Claude SDK');
      expect(sdkResponseLog).toBeDefined();
      
      // Restore fake timers
      jest.useFakeTimers();
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await agentManager.initialize();

      // Setup exec mock for session management tests
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git worktree add')) {
          callback(null, 'Preparing worktree', '');
        } else if (cmd.includes('git worktree remove')) {
          callback(null, '', '');
        } else if (cmd.includes('npm ci')) {
          callback(null, 'Dependencies installed', '');
        } else {
          callback(new Error('Unknown command'));
        }
      });
    });

    it('should save sessions to file', async () => {
      const instructions = 'Test instructions';

      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      await agentManager.spawnAgent(instructions);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        SESSIONS_FILE,
        expect.stringContaining('"sessions"'),
        { mode: 0o600 },
      );
    });

    it('should get active agents', async () => {
      const instructions = 'Test instructions';

      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      await agentManager.spawnAgent(instructions);

      const agents = agentManager.getActiveAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].instructions).toBe(instructions);
    });

    it('should get agent by ID', async () => {
      const instructions = 'Test instructions';

      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      const session = await agentManager.spawnAgent(instructions);
      const agent = agentManager.getAgent(session.id);

      expect(agent).toBeDefined();
      expect(agent.instructions).toBe(instructions);
    });

    it('should check if can spawn more agents (unlimited)', async () => {
      expect(agentManager.canSpawnAgent()).toBe(true);

      // Spawn some agents
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      await Promise.all([
        agentManager.spawnAgent('Valid instructions for agent'),
        agentManager.spawnAgent('Valid instructions for agent'),
        agentManager.spawnAgent('Valid instructions for agent'),
      ]);

      // Should still allow spawning more agents (unlimited)
      expect(agentManager.canSpawnAgent()).toBe(true);
    });

    it('should get agent count', async () => {
      expect(agentManager.getAgentCount()).toBe(0);

      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      await agentManager.spawnAgent('Valid instructions');
      expect(agentManager.getAgentCount()).toBe(1);
    });
  });

  describe('process management', () => {
    beforeEach(async () => {
      await agentManager.initialize();

      // Setup exec mock for process management tests
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git worktree add')) {
          callback(null, 'Preparing worktree', '');
        } else if (cmd.includes('git worktree remove')) {
          callback(null, '', '');
        } else if (cmd.includes('npm ci')) {
          callback(null, 'Dependencies installed', '');
        } else {
          callback(new Error('Unknown command'));
        }
      });
    });

    it('should handle process output', async () => {
      const instructions = 'Test instructions';

      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      const session = await agentManager.spawnAgent(instructions);

      // Simulate process output
      const outputData = Buffer.from('Agent response');
      agentManager.handleAgentOutput(session.id, 'stdout', outputData);

      const agent = agentManager.getAgent(session.id);
      expect(agent.output).toHaveLength(1);
      expect(agent.output[0].type).toBe('stdout');
      expect(agent.output[0].data).toBe('Agent response');
    });

    it('should update agent status', async () => {
      const instructions = 'Test instructions';

      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      const session = await agentManager.spawnAgent(instructions);

      agentManager.updateAgentStatus(session.id, 'error');

      // Agent status should be updated but agent should still exist
      const agent = agentManager.getAgent(session.id);
      expect(agent).toBeDefined();
      expect(agent.status).toBe('error');
    });

    it.skip('should terminate agent', async () => {
      const instructions = 'Test instructions';

      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      // Mock filesystem for worktree validation
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('worktrees/agent-')) return true;
        return false;
      });
      fs.statSync.mockReturnValue({ isDirectory: () => true });

      const session = await agentManager.spawnAgent(instructions);

      await agentManager.terminateAgent(session.id);

      // With SDK, the session should be terminated and removed
      expect(agentManager.getAgent(session.id)).toBeUndefined();
    });

    it('should terminate agent with deleteWorktree option', async () => {
      // Create a mock agent session directly to avoid spawn complications
      const testAgentId = 'test-agent-delete';
      const mockSession = {
        id: testAgentId,
        status: 'running',
        worktreePath: '/test/worktree/path',
        sdkStatus: 'ACTIVE',
      };

      // Add the session directly to the agents map
      agentManager.agents.set(testAgentId, mockSession);

      // Mock worktree lifecycle manager
      const mockForceCleanupWorktree = jest.fn().mockResolvedValue();
      agentManager.worktreeLifecycle = {
        forceCleanupWorktree: mockForceCleanupWorktree,
      };

      // Mock SDK manager
      agentManager.sdkManager = {
        terminateSession: jest.fn().mockResolvedValue(true),
      };

      // Test deletion mode
      await agentManager.terminateAgent(testAgentId, { deleteWorktree: true });

      // Verify worktree cleanup was called with correct options for deletion
      expect(mockForceCleanupWorktree).toHaveBeenCalledWith(
        '/test/worktree/path',
        {
          force: true,
          preserveBranch: false,
          bypassAutoCleanupCheck: true,
        },
      );

      // Agent should be removed
      expect(agentManager.getAgent(testAgentId)).toBeUndefined();
    });

    it('should terminate agent without deleteWorktree option (normal termination)', async () => {
      // Create a mock agent session directly to avoid spawn complications
      const testAgentId = 'test-agent-normal';
      const mockSession = {
        id: testAgentId,
        status: 'running',
        worktreePath: '/test/worktree/path',
        sdkStatus: 'ACTIVE',
      };

      // Add the session directly to the agents map
      agentManager.agents.set(testAgentId, mockSession);

      // Mock worktree lifecycle manager
      const mockForceCleanupWorktree = jest.fn().mockResolvedValue();
      agentManager.worktreeLifecycle = {
        forceCleanupWorktree: mockForceCleanupWorktree,
      };

      // Mock SDK manager
      agentManager.sdkManager = {
        terminateSession: jest.fn().mockResolvedValue(true),
      };

      // Test normal termination (no deleteWorktree option)
      await agentManager.terminateAgent(testAgentId, { force: true });

      // Verify worktree cleanup was called with normal options
      expect(mockForceCleanupWorktree).toHaveBeenCalledWith(
        '/test/worktree/path',
        {
          force: true,
          preserveBranch: false,
        },
      );

      // Agent should be removed
      expect(agentManager.getAgent(testAgentId)).toBeUndefined();
    });

    it('should handle worktree deletion errors gracefully', async () => {
      // Create a mock agent session directly to avoid spawn complications
      const testAgentId = 'test-agent-error';
      const mockSession = {
        id: testAgentId,
        status: 'running',
        worktreePath: '/test/worktree/path',
        sdkStatus: 'ACTIVE',
      };

      // Add the session directly to the agents map
      agentManager.agents.set(testAgentId, mockSession);

      // Mock worktree lifecycle manager that throws error
      const mockForceCleanupWorktree = jest.fn().mockRejectedValue(new Error('Worktree deletion failed'));
      agentManager.worktreeLifecycle = {
        forceCleanupWorktree: mockForceCleanupWorktree,
      };

      // Mock SDK manager
      agentManager.sdkManager = {
        terminateSession: jest.fn().mockResolvedValue(true),
      };

      // Test that errors are propagated
      await expect(agentManager.terminateAgent(testAgentId, { deleteWorktree: true }))
        .rejects.toThrow('Worktree deletion failed');

      // Verify cleanup was attempted
      expect(mockForceCleanupWorktree).toHaveBeenCalledWith(
        '/test/worktree/path',
        {
          force: true,
          preserveBranch: false,
          bypassAutoCleanupCheck: true,
        },
      );
    });
  });

  describe('pending agent management', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should add pending agent with spawning status', () => {
      const agentConfig = {
        id: 'test-pending-agent',
        instructions: 'Test pending instructions',
        startTime: Date.now(),
      };

      const pendingAgent = agentManager.addPendingAgent(agentConfig);

      expect(pendingAgent.id).toBe('test-pending-agent');
      expect(pendingAgent.status).toBe(AgentStatus.SPAWNING);
      expect(pendingAgent.instructions).toBe('Test pending instructions');
      expect(pendingAgent.progress).toBe('Initializing...');
      expect(pendingAgent.spawnTime).toBeDefined();
      expect(pendingAgent.lastActivity).toBeDefined();
      expect(agentManager.getAgent(pendingAgent.id)).toBe(pendingAgent);
    });

    it('should update pending agent status with progress', () => {
      const agentConfig = {
        id: 'test-pending-agent',
        instructions: 'Test instructions',
        startTime: Date.now(),
      };
      const pendingAgent = agentManager.addPendingAgent(agentConfig);

      agentManager.updatePendingAgentStatus(pendingAgent.id, AgentStatus.IDLE);

      const updatedAgent = agentManager.getAgent(pendingAgent.id);
      expect(updatedAgent.status).toBe(AgentStatus.IDLE);
      expect(updatedAgent.progress).toBe('Ready');
      expect(updatedAgent.lastActivity).toBeDefined();
    });

    it('should update pending agent with error status and message', () => {
      const agentConfig = {
        id: 'test-pending-agent',
        instructions: 'Test instructions',
        startTime: Date.now(),
      };
      const pendingAgent = agentManager.addPendingAgent(agentConfig);

      agentManager.updatePendingAgentStatus(pendingAgent.id, AgentStatus.ERROR, 'Test error message');

      // Agent should be removed when status is error
      expect(agentManager.getAgent(pendingAgent.id)).toBeUndefined();
    });

    it('should preserve existing progress for spawning status', () => {
      const agentConfig = {
        id: 'test-pending-agent',
        instructions: 'Test instructions',
        startTime: Date.now(),
      };
      const pendingAgent = agentManager.addPendingAgent(agentConfig);
      pendingAgent.progress = 'Creating git worktree...';

      agentManager.updatePendingAgentStatus(pendingAgent.id, AgentStatus.SPAWNING);

      const updatedAgent = agentManager.getAgent(pendingAgent.id);
      expect(updatedAgent.progress).toBe('Creating git worktree...');
    });
  });

  describe('Git Worktree Operations', () => {
    beforeEach(async () => {
      // Mock exec for git worktree commands
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git worktree add')) {
          callback(null, 'Preparing worktree', '');
        } else if (cmd.includes('git worktree remove')) {
          callback(null, '', '');
        } else if (cmd.includes('npm ci')) {
          callback(null, 'Dependencies installed', '');
        } else {
          callback(new Error('Unknown command'));
        }
      });

      // Initialize agent manager for tests that need config
      await agentManager.initialize();
    });

    describe('generateWorktreeName', () => {
      it('should generate valid worktree name', () => {
        const agentId = 'agent-1234567890-abc123def';
        const worktreeName = AgentManager.generateWorktreeName(agentId);

        expect(worktreeName).toMatch(/^agent-1234567890-abc123def-\d+$/);
      });

      it('should handle agent ID format correctly', () => {
        const agentId = 'agent-test-123';
        const worktreeName = AgentManager.generateWorktreeName(agentId);

        expect(worktreeName).toMatch(/^agent-test-123-\d+$/);
      });
    });

    describe('ensureWorktreeDirectory', () => {
      it('should create worktree directory if it does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {});

        const result = AgentManager.ensureWorktreeDirectory();

        expect(fs.mkdirSync).toHaveBeenCalledWith(
          expect.stringContaining('worktrees'),
          { recursive: true, mode: 0o755 },
        );
        expect(result).toContain('worktrees');
      });

      it('should not create directory if it already exists', () => {
        fs.existsSync.mockReturnValue(true);

        const result = AgentManager.ensureWorktreeDirectory();

        expect(fs.mkdirSync).not.toHaveBeenCalled();
        expect(result).toContain('worktrees');
      });

      it('should throw error if directory creation fails', () => {
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        expect(() => {
          AgentManager.ensureWorktreeDirectory();
        }).toThrow('Failed to create worktrees directory');
      });
    });

    describe('validateGitForWorktree', () => {
      it('should validate clean git repository', () => {
        execSync
          .mockReturnValueOnce('true') // git rev-parse --is-inside-work-tree
          .mockReturnValueOnce('/repo/root') // git rev-parse --show-toplevel
          .mockReturnValueOnce('') // git diff-index --quiet HEAD --
          .mockReturnValueOnce(''); // git ls-files --others --exclude-standard

        const result = AgentManager.validateGitForWorktree();

        expect(result.isValid).toBe(true);
        expect(result.clean).toBe(true);
        expect(result.rootPath).toBe('/repo/root');
      });

      it.skip('should fail validation with uncommitted changes', () => {
        execSync
          .mockReturnValueOnce('true') // git rev-parse --is-inside-work-tree
          .mockReturnValueOnce('/repo/root') // git rev-parse --show-toplevel
          .mockImplementationOnce(() => { // git diff-index --quiet HEAD --
            throw new Error('Uncommitted changes');
          });

        const result = AgentManager.validateGitForWorktree();

        expect(result.isValid).toBe(false);
        expect(result.hasUncommittedChanges).toBe(true);
        expect(result.error).toContain('uncommitted changes');
      });

      it.skip('should handle invalid git repository', () => {
        execSync.mockImplementationOnce(() => {
          throw new Error('Not a git repository');
        });

        const result = AgentManager.validateGitForWorktree();

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Not in a git repository');
      });
    });

    describe('createWorktree', () => {
      it('should create worktree successfully', async () => {
        const agentId = 'test-agent-123';

        // Mock successful validation
        execSync
          .mockReturnValueOnce('true') // git validation
          .mockReturnValueOnce('/repo/root')
          .mockReturnValueOnce('') // clean repo
          .mockReturnValueOnce('');

        fs.existsSync.mockReturnValue(true); // worktree dir exists

        exec.mockImplementation((cmd, options, callback) => {
          callback(null, 'Preparing worktree (identifier: abc123)', '');
        });

        const result = await agentManager.createWorktree(agentId);

        expect(result.agentId).toBe(agentId);
        expect(result.worktreeName).toMatch(/^agent-test-123-\d+$/);
        expect(result.worktreePath).toContain('worktrees');
        expect(exec).toHaveBeenCalledWith(
          expect.stringContaining('git worktree add'),
          expect.any(Object),
          expect.any(Function),
        );
      });

      it('should handle worktree creation failure', async () => {
        const agentId = 'test-agent-123';

        // Mock successful validation
        execSync
          .mockReturnValueOnce('true')
          .mockReturnValueOnce('/repo/root')
          .mockReturnValueOnce('')
          .mockReturnValueOnce('');

        fs.existsSync.mockReturnValue(true);
        fs.rmSync.mockImplementation(() => {}); // for cleanup

        exec.mockImplementation((cmd, options, callback) => {
          callback(new Error('Git worktree failed'), '', 'fatal: branch already exists');
        });

        await expect(agentManager.createWorktree(agentId))
          .rejects
          .toThrow('Worktree creation failed');

        expect(fs.rmSync).toHaveBeenCalled(); // cleanup should be called
      });

      it.skip('should reject if git validation fails', async () => {
        const agentId = 'test-agent-123';

        execSync.mockImplementationOnce(() => {
          throw new Error('Not a git repository');
        });

        await expect(agentManager.createWorktree(agentId))
          .rejects
          .toThrow('Not in a git repository');
      });
    });

    describe('removeWorktree', () => {
      it('should remove worktree successfully', async () => {
        const worktreePath = '/path/to/worktree';

        fs.existsSync.mockReturnValue(true);
        exec.mockImplementation((cmd, options, callback) => {
          callback(null, '', '');
        });

        await agentManager.removeWorktree(worktreePath);

        expect(exec).toHaveBeenCalledWith(
          expect.stringContaining('git worktree remove'),
          expect.any(Object),
          expect.any(Function),
        );
      });

      it('should handle worktree removal failure with manual cleanup', async () => {
        const worktreePath = '/path/to/worktree';

        fs.existsSync.mockReturnValue(true);
        fs.rmSync.mockImplementation(() => {});

        exec.mockImplementation((cmd, options, callback) => {
          callback(new Error('Git worktree remove failed'), '', 'fatal: worktree locked');
        });

        await agentManager.removeWorktree(worktreePath);

        expect(fs.rmSync).toHaveBeenCalledWith(worktreePath, { recursive: true, force: true });
      });

      it('should resolve immediately if worktree does not exist', async () => {
        const worktreePath = '/path/to/nonexistent';

        fs.existsSync.mockReturnValue(false);

        // Clear previous exec calls from initialization
        exec.mockClear();

        await agentManager.removeWorktree(worktreePath);

        expect(exec).not.toHaveBeenCalled();
      });
    });

    describe('cleanupFailedWorktree', () => {
      it('should clean up failed worktree directory', () => {
        const worktreePath = '/path/to/failed/worktree';

        fs.existsSync.mockReturnValue(true);
        fs.rmSync.mockImplementation(() => {});

        agentManager.cleanupFailedWorktree(worktreePath);

        expect(fs.rmSync).toHaveBeenCalledWith(worktreePath, { recursive: true, force: true });
      });

      it('should handle cleanup errors gracefully', () => {
        const worktreePath = '/path/to/failed/worktree';

        fs.existsSync.mockReturnValue(true);
        fs.rmSync.mockImplementation(() => {
          throw new Error('Cleanup failed');
        });

        // Should not throw
        expect(() => {
          agentManager.cleanupFailedWorktree(worktreePath);
        }).not.toThrow();
      });
    });
  });

  describe('Agent Spawning with Worktrees', () => {
    it.skip('should spawn agent with worktree integration', async () => {
      const instructions = 'Test agent with worktree';

      // Mock git validation
      execSync
        .mockReturnValueOnce('true') // validateGitRepository
        .mockReturnValueOnce('/repo/root')
        .mockReturnValueOnce('true') // validateGitForWorktree
        .mockReturnValueOnce('/repo/root')
        .mockReturnValueOnce('') // clean repo
        .mockReturnValueOnce('')
        .mockReturnValueOnce('claude 1.0.0'); // claude --version

      fs.existsSync.mockReturnValue(true);

      // Mock worktree creation
      exec.mockImplementation((cmd, options, callback) => {
        callback(null, 'Preparing worktree', '');
      });

      const session = await agentManager.spawnAgent(instructions);

      expect(session.worktreePath).toContain('worktrees');
      expect(session.worktreeName).toMatch(/^agent-.*-\d+$/);
      expect(session.workingDirectory).toBe(session.worktreePath);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('git worktree add'),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it.skip('should clean up worktree on agent termination', async () => {
      // Use real timers for this test to allow async processing
      jest.useRealTimers();
      
      const instructions = 'Test agent termination with worktree cleanup';

      // Mock git validation and worktree creation
      execSync
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('/repo/root')
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('/repo/root')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('claude 1.0.0');

      fs.existsSync.mockReturnValue(true);

      exec.mockImplementation((cmd, options, callback) => {
        callback(null, 'Success', '');
      });

      const session = await agentManager.spawnAgent(instructions);

      expect(session.worktreePath).toBeDefined();

      await agentManager.terminateAgent(session.id, { deleteWorktree: true });

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify worktree cleanup was called through the lifecycle manager
      expect(agentManager.worktreeLifecycle.forceCleanupWorktree).toHaveBeenCalledWith(
        session.worktreePath,
        expect.objectContaining({
          force: true,
          preserveBranch: false,
          bypassAutoCleanupCheck: true,
        }),
      );

      // Verify agent was removed from active sessions after termination
      expect(agentManager.getAgent(session.id)).toBeUndefined();
      
      // Restore fake timers
      jest.useFakeTimers();
    });

    it.skip('should handle worktree creation failure during spawn', async () => {
      const instructions = 'Test agent spawn with worktree failure';

      // Mock git validation
      execSync
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('/repo/root')
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('/repo/root')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      fs.existsSync.mockReturnValue(true);
      fs.rmSync.mockImplementation(() => {});

      // Mock worktree creation failure
      exec.mockImplementation((cmd, options, callback) => {
        callback(new Error('Worktree creation failed'), '', 'fatal: branch exists');
      });

      await expect(agentManager.spawnAgent(instructions))
        .rejects
        .toThrow('Worktree creation failed');

      expect(fs.rmSync).toHaveBeenCalled(); // cleanup should be called
    });
  });
});
