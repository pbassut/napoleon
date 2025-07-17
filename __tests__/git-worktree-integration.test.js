const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const AgentManager = require('../src/core/agent-manager');

jest.mock('child_process');
jest.mock('fs');

describe('Git Worktree Integration Tests', () => {
  let agentManager;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();

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
        setTimeout(() => callback(null, 'Preparing worktree (identifier: abc123)', ''), 10);
      } else if (cmd.includes('git worktree remove')) {
        setTimeout(() => callback(null, '', ''), 10);
      } else {
        callback(new Error('Unknown command'));
      }
    });

    agentManager = new AgentManager();
  });

  it('should create complete worktree workflow', async () => {
    await agentManager.initialize();

    const instructions = 'Test agent with worktree integration';
    
    const session = await agentManager.spawnAgent(instructions);

    // Verify session has worktree information
    expect(session.worktreePath).toBeDefined();
    expect(session.worktreeName).toBeDefined();
    expect(session.workingDirectory).toBe(session.worktreePath);
    expect(session.worktreePath).toContain('.add-manager-worktrees');
    expect(session.worktreeName).toMatch(/^agent-.*-\d+$/);

    // Verify git worktree add was called
    expect(exec).toHaveBeenCalledWith(
      expect.stringContaining('git worktree add'),
      expect.any(Object),
      expect.any(Function)
    );

    // Test termination with cleanup
    await agentManager.terminateAgent(session.id);

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
        setTimeout(() => callback(new Error('Branch already exists'), '', 'fatal: branch exists'), 10);
      } else {
        callback(null, '', '');
      }
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
      expect.stringContaining('.add-manager-worktrees'),
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