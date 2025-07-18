const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const AgentManager = require('../src/core/agent-manager');

jest.mock('child_process');
jest.mock('fs');

describe('Git Worktree Integration Tests', () => {
  let agentManager;
  let mockProcess;
  let timers = [];

  beforeEach(() => {
    jest.clearAllMocks();
    timers = [];

    // Mock file system
    fs.existsSync.mockReturnValue(false);
    fs.readFileSync.mockReturnValue('{"sessions": []}');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.rmSync.mockImplementation(() => {});

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
    
    // Mock git commands to simulate clean repository
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git rev-parse --is-inside-work-tree') return 'true';
      if (cmd === 'git rev-parse --show-toplevel') return '/repo/root';
      if (cmd === 'git diff-index --quiet HEAD --') return '';
      if (cmd === 'git ls-files --others --exclude-standard') return '';
      if (cmd === 'claude --version') return 'claude 1.0.0';
      return 'true';
    });

    // Mock exec for git worktree commands
    exec.mockImplementation((cmd, options, callback) => {
      if (cmd.includes('git worktree add')) {
        const timer = setTimeout(() => callback(null, 'Preparing worktree (identifier: abc123)', ''), 10);
        timers.push(timer);
      } else if (cmd.includes('git worktree remove')) {
        const timer = setTimeout(() => callback(null, '', ''), 10);
        timers.push(timer);
      } else {
        callback(new Error('Unknown command'));
      }
    });

    agentManager = new AgentManager();
  });

  afterEach(() => {
    // Clean up any pending timers
    timers.forEach(timer => clearTimeout(timer));
    timers = [];
    
    // Clean up any agent manager resources
    if (agentManager) {
      // Force cleanup of any remaining resources
      agentManager = null;
    }
  });

  it('should create complete worktree workflow', async () => {
    await agentManager.initialize();

    const instructions = 'Test agent with worktree integration';
    
    const session = await agentManager.spawnAgent(instructions);

    // Verify session has worktree information
    expect(session.worktreePath).toBeDefined();
    expect(session.worktreeName).toBeDefined();
    expect(session.workingDirectory).toBe(session.worktreePath);
    expect(session.worktreePath).toContain('.napoleon-worktrees');
    expect(session.worktreeName).toMatch(/^agent-.*-\d+$/);

    // Verify git worktree add was called
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('git worktree add'),
      expect.any(Object),
      expect.any(Function)
    );

    // Clear mock calls before testing termination
    exec.mockClear();

    // Mock fs.existsSync to return true for the worktree path so removal is attempted
    fs.existsSync.mockImplementation((path) => {
      if (path === session.worktreePath) {
        return true; // Simulate that the worktree directory exists for removal
      }
      return false; // Default for other paths
    });

    // Test termination with cleanup
    await agentManager.terminateAgent(session.id);

    // Wait for async worktree removal to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify git worktree remove was called
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('git worktree remove'),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should handle worktree creation failure gracefully', async () => {
    await agentManager.initialize();

    // Mock worktree creation failure
    exec.mockImplementation((cmd, options, callback) => {
      if (cmd.includes('git worktree add')) {
        const timer = setTimeout(() => callback(new Error('Branch already exists'), '', 'fatal: branch exists'), 10);
        timers.push(timer);
      } else {
        callback(null, '', '');
      }
    });

    // Mock fs.existsSync to return true for the failed worktree path so cleanup is attempted
    fs.existsSync.mockImplementation((path) => {
      if (path.includes('.napoleon-worktrees')) {
        return true; // Simulate that the directory was partially created
      }
      return false;
    });

    const instructions = 'Test agent that should fail worktree creation';

    await expect(agentManager.spawnAgent(instructions))
      .rejects
      .toThrow('Worktree creation failed');

    // Verify cleanup was attempted
    expect(fs.rmSync).toHaveBeenCalled();
  });

  it('should validate git repository state before worktree creation', async () => {
    await agentManager.initialize();

    // Mock repository with uncommitted changes
    execSync.mockImplementation((cmd) => {
      if (cmd === 'git rev-parse --is-inside-work-tree') return 'true';
      if (cmd === 'git rev-parse --show-toplevel') return '/repo/root';
      if (cmd === 'git diff-index --quiet HEAD --') {
        throw new Error('Uncommitted changes');
      }
      return 'true';
    });

    const instructions = 'Test agent with dirty repo';

    await expect(agentManager.spawnAgent(instructions))
      .rejects
      .toThrow(/uncommitted changes/);
  });

  it('should ensure worktree directory exists', async () => {
    await agentManager.initialize();

    fs.existsSync.mockReturnValue(false); // Directory doesn't exist

    const instructions = 'Test worktree directory creation';
    
    await agentManager.spawnAgent(instructions);

    // Verify directory creation was called
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.napoleon-worktrees'),
      { recursive: true, mode: 0o755 }
    );
  });

  it('should generate unique worktree names', async () => {
    await agentManager.initialize();

    const instructions = 'Test unique worktree names';
    
    const session1 = await agentManager.spawnAgent(instructions);
    
    // Mock a different timestamp for the second agent
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => originalDateNow() + 1000);
    
    const session2 = await agentManager.spawnAgent(instructions);
    
    Date.now = originalDateNow;

    expect(session1.worktreeName).not.toBe(session2.worktreeName);
    expect(session1.worktreePath).not.toBe(session2.worktreePath);
  });
});