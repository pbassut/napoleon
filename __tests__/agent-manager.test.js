const { spawn } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');
const AgentManager = require('../src/core/agent-manager');
const { loadConfig, SESSIONS_FILE } = require('../src/core/config');
const { EnvironmentValidationError } = require('../src/utils/errors');

jest.mock('child_process');
jest.mock('fs');
jest.mock('../src/core/config');

describe('AgentManager', () => {
  let agentManager;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock configuration
    loadConfig.mockReturnValue({
      maxAgents: 3,
      logLevel: 'info',
    });

    // Mock file system
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{"sessions": []}');
    fs.writeFileSync.mockImplementation(() => {});

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
    execSync.mockReturnValue('inside work tree');

    agentManager = new AgentManager();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await agentManager.initialize();

      expect(loadConfig).toHaveBeenCalled();
      expect(agentManager.maxAgents).toBe(3);
      expect(agentManager.agents.size).toBe(0);
    });

    it('should load existing sessions', async () => {
      const existingSessions = {
        sessions: [
          {
            id: 'agent-123',
            pid: 12345,
            status: 'running',
            instructions: 'Test instructions',
          },
        ],
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existingSessions));

      // Mock process.kill to simulate running process
      jest.spyOn(process, 'kill').mockImplementation(() => {});

      await agentManager.initialize();

      expect(agentManager.agents.size).toBe(1);
      expect(agentManager.agents.get('agent-123')).toBeDefined();
    });

    it('should remove stale sessions', async () => {
      const existingSessions = {
        sessions: [
          {
            id: 'agent-stale',
            pid: 99999,
            status: 'running',
            instructions: 'Test instructions',
          },
        ],
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(existingSessions));

      // Mock process.kill to simulate dead process
      jest.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('Process not found');
      });

      await agentManager.initialize();

      expect(agentManager.agents.size).toBe(0);
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
    });

    it('should spawn agent with valid instructions', async () => {
      const instructions = 'Please help me implement a new feature';
      
      // Mock Claude CLI availability
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      const session = await agentManager.spawnAgent(instructions);

      expect(session).toBeDefined();
      expect(session.instructions).toBe(instructions);
      expect(session.status).toBe('running');
      expect(session.pid).toBe(12345);
      expect(spawn).toHaveBeenCalledWith('claude', [], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({
          CLAUDE_SESSION_ID: session.id,
        }),
      });
    });

    it('should reject instructions that are too short', async () => {
      const instructions = 'short';

      await expect(agentManager.spawnAgent(instructions)).rejects.toThrow(EnvironmentValidationError);
      await expect(agentManager.spawnAgent(instructions)).rejects.toThrow('at least 10 characters');
    });

    it('should reject spawning when maximum agents reached', async () => {
      // Fill up to max agents
      for (let i = 0; i < 3; i++) {
        await agentManager.spawnAgent('Valid instructions for agent');
      }

      await expect(agentManager.spawnAgent('Another agent')).rejects.toThrow(EnvironmentValidationError);
      await expect(agentManager.spawnAgent('Another agent')).rejects.toThrow('Maximum 3 agents');
    });

    it('should reject spawning when not in git repository', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      await expect(agentManager.spawnAgent('Valid instructions')).rejects.toThrow(EnvironmentValidationError);
    });

    it('should reject spawning when Claude CLI not found', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') throw new Error('Command not found');
        return 'true';
      });

      await expect(agentManager.spawnAgent('Valid instructions')).rejects.toThrow(EnvironmentValidationError);
      await expect(agentManager.spawnAgent('Valid instructions')).rejects.toThrow('Claude CLI is not installed');
    });

    it('should send instructions to spawned agent', async () => {
      const instructions = 'Please help me implement a new feature';
      
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      await agentManager.spawnAgent(instructions);

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(`${instructions}\n`);
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should save sessions to file', async () => {
      const instructions = 'Test instructions';
      
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      await agentManager.spawnAgent(instructions);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        SESSIONS_FILE,
        expect.stringContaining('"sessions"'),
        { mode: 0o600 }
      );
    });

    it('should get active agents', async () => {
      const instructions = 'Test instructions';
      
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

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

      const session = await agentManager.spawnAgent(instructions);
      const agent = agentManager.getAgent(session.id);

      expect(agent).toBeDefined();
      expect(agent.instructions).toBe(instructions);
    });

    it('should check if can spawn more agents', async () => {
      expect(agentManager.canSpawnAgent()).toBe(true);

      // Spawn max agents
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      for (let i = 0; i < 3; i++) {
        await agentManager.spawnAgent('Valid instructions for agent');
      }

      expect(agentManager.canSpawnAgent()).toBe(false);
    });

    it('should get agent count', async () => {
      expect(agentManager.getAgentCount()).toBe(0);

      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      await agentManager.spawnAgent('Valid instructions');
      expect(agentManager.getAgentCount()).toBe(1);
    });
  });

  describe('process management', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should handle process output', async () => {
      const instructions = 'Test instructions';
      
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

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

      const session = await agentManager.spawnAgent(instructions);
      
      agentManager.updateAgentStatus(session.id, 'error');
      
      // Agent should be removed from active agents when status is error
      expect(agentManager.getAgent(session.id)).toBeUndefined();
    });

    it('should terminate agent', async () => {
      const instructions = 'Test instructions';
      
      execSync.mockImplementation((cmd) => {
        if (cmd === 'claude --version') return 'claude 1.0.0';
        return 'true';
      });

      const session = await agentManager.spawnAgent(instructions);
      
      await agentManager.terminateAgent(session.id);
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(agentManager.getAgent(session.id)).toBeUndefined();
    });
  });
});