const { spawn, execSync, exec } = require('child_process');
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
    
    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-key';
    
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
    
    // Mock exec for git worktree commands
    exec.mockImplementation((cmd, options, callback) => {
      if (cmd.includes('git worktree add')) {
        callback(null, 'Preparing worktree', '');
      } else if (cmd.includes('git worktree remove')) {
        callback(null, '', '');
      } else {
        callback(new Error('Unknown command'));
      }
    });

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
      
      // Mock git commands
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      const session = await agentManager.spawnAgent(instructions);

      expect(session).toBeDefined();
      expect(session.instructions).toBe(instructions);
      expect(session.status).toBe('idle'); // SDK completes and goes to idle
      expect(session.pid).toBeDefined(); // SDK generates a timestamp-based PID
      expect(session.claudeSession).toBeDefined(); // Should have SDK session
      expect(session.claudeSession.isActive).toBe(true);
    });

    it('should accept short instructions (no minimum length)', async () => {
      const instructions = 'hi';

      const agent = await agentManager.spawnAgent(instructions);
      expect(agent).toBeDefined();
      expect(agent.instructions).toBe('hi');
      expect(agent.status).toBe('idle');
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

    it('should reject spawning when API key not found', async () => {
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

    it('should send instructions to spawned agent', async () => {
      const instructions = 'Please help me implement a new feature';
      
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      const session = await agentManager.spawnAgent(instructions);

      // With SDK, instructions are sent directly via the query function
      expect(session.logs).toBeDefined();
      expect(session.logs.length).toBeGreaterThan(0);
      expect(session.logs[0].content).toBe('Mock response from Claude SDK');
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
        if (cmd.includes('git rev-parse')) return 'true';
        return '/path/to/repo';
      });

      const session = await agentManager.spawnAgent(instructions);
      
      await agentManager.terminateAgent(session.id);
      
      // With SDK, the abort controller is used instead of process.kill
      expect(session.claudeSession.isActive).toBe(false);
      expect(agentManager.getAgent(session.id)).toBeUndefined();
    });
  });

  describe('Git Worktree Operations', () => {
    
    beforeEach(() => {
      // Mock exec for git worktree commands
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git worktree add')) {
          callback(null, 'Preparing worktree', '');
        } else if (cmd.includes('git worktree remove')) {
          callback(null, '', '');
        } else {
          callback(new Error('Unknown command'));
        }
      });
    });

    describe('generateWorktreeName', () => {
      it('should generate valid worktree name', () => {
        const agentId = 'agent-1234567890-abc123def';
        const worktreeName = agentManager.generateWorktreeName(agentId);
        
        expect(worktreeName).toMatch(/^agent-1234567890-abc123def-\d+$/);
      });

      it('should handle agent ID format correctly', () => {
        const agentId = 'agent-test-123';
        const worktreeName = agentManager.generateWorktreeName(agentId);
        
        expect(worktreeName).toMatch(/^agent-test-123-\d+$/);
      });
    });

    describe('ensureWorktreeDirectory', () => {
      it('should create worktree directory if it does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {});

        const result = agentManager.ensureWorktreeDirectory();
        
        expect(fs.mkdirSync).toHaveBeenCalledWith(
          expect.stringContaining('.napoleon-worktrees'),
          { recursive: true, mode: 0o755 }
        );
        expect(result).toContain('.napoleon-worktrees');
      });

      it('should not create directory if it already exists', () => {
        fs.existsSync.mockReturnValue(true);

        const result = agentManager.ensureWorktreeDirectory();
        
        expect(fs.mkdirSync).not.toHaveBeenCalled();
        expect(result).toContain('.napoleon-worktrees');
      });

      it('should throw error if directory creation fails', () => {
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        expect(() => {
          agentManager.ensureWorktreeDirectory();
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

        const result = agentManager.validateGitForWorktree();
        
        expect(result.isValid).toBe(true);
        expect(result.clean).toBe(true);
        expect(result.rootPath).toBe('/repo/root');
      });

      it('should fail validation with uncommitted changes', () => {
        execSync
          .mockReturnValueOnce('true') // git rev-parse --is-inside-work-tree
          .mockReturnValueOnce('/repo/root') // git rev-parse --show-toplevel
          .mockImplementationOnce(() => { // git diff-index --quiet HEAD --
            throw new Error('Uncommitted changes');
          });

        const result = agentManager.validateGitForWorktree();
        
        expect(result.isValid).toBe(false);
        expect(result.hasUncommittedChanges).toBe(true);
        expect(result.error).toContain('uncommitted changes');
      });

      it('should handle invalid git repository', () => {
        execSync.mockImplementationOnce(() => {
          throw new Error('Not a git repository');
        });

        const result = agentManager.validateGitForWorktree();
        
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
        expect(result.worktreePath).toContain('.napoleon-worktrees');
        expect(exec).toHaveBeenCalledWith(
          expect.stringContaining('git worktree add'),
          expect.any(Object),
          expect.any(Function)
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

      it('should reject if git validation fails', async () => {
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
          expect.any(Function)
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
    it('should spawn agent with worktree integration', async () => {
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
      
      expect(session.worktreePath).toContain('.napoleon-worktrees');
      expect(session.worktreeName).toMatch(/^agent-.*-\d+$/);
      expect(session.workingDirectory).toBe(session.worktreePath);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('git worktree add'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should clean up worktree on agent termination', async () => {
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
      
      await agentManager.terminateAgent(session.id);
      
      // Verify worktree removal was called
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('git worktree remove'),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle worktree creation failure during spawn', async () => {
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