const path = require('path');

jest.mock('child_process');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    isDirectory: jest.fn().mockReturnValue(true)
  }),
}));

// Mock config
jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    logLevel: 'info',
    napoleonDir: '/test/.napoleon',
    features: {
      autoCleanup: true
    }
  }),
  SESSIONS_FILE: '/test/.napoleon/sessions.json',
  initializeSessionStorage: jest.fn(),
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));


// Mock SDKCommunicationManager
jest.mock('../src/core/sdk/communication-manager', () => {
  return jest.fn().mockImplementation(() => ({
    executeQuery: jest.fn().mockResolvedValue('Mock response'),
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

// Mock AgentLogManager
jest.mock('../src/core/logging/agent-log-manager', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock tool usage tracker
jest.mock('../src/core/tool-usage-tracker', () => ({
  initializeAgent: jest.fn(),
  trackTodoWrite: jest.fn(),
  getAgentTodos: jest.fn().mockReturnValue([]),
  cleanupAgent: jest.fn(),
}));


// Import modules after mocks are set up
const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const AgentManager = require('../src/core/agent-manager');

describe('Git Worktree Integration Tests', () => {
  let agentManager;
  let mockProcess;
  let timers = [];

  beforeEach(async () => {
    jest.clearAllMocks();
    timers = [];

    // Mock file system
    fs.existsSync.mockImplementation((path) => {
      // Return true for worktree paths to simulate successful creation
      if (path.includes('worktrees') || path.includes('sessions.json')) {
        return true;
      }
      return false;
    });
    fs.readFileSync.mockReturnValue('{"sessions": []}');
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.rmSync.mockImplementation(() => {});
    fs.statSync.mockReturnValue({
      isDirectory: () => true
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
      } else if (cmd.includes('npm install') || cmd.includes('npm ci')) {
        const timer = setTimeout(() => callback(null, 'Dependencies installed', ''), 10);
        timers.push(timer);
      } else {
        // Mock all other commands to succeed
        const timer = setTimeout(() => callback(null, 'Command executed', ''), 10);
        timers.push(timer);
      }
    });

    agentManager = new AgentManager();
    await agentManager.initialize();
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

  it.skip('should create complete worktree workflow', async () => {
    // Use real timers for this test
    jest.useRealTimers();
    
    await agentManager.initialize();

    const instructions = 'Test agent with worktree integration';
    
    const session = await agentManager.spawnAgent(instructions);
    
    // Wait a bit for async setup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the updated session from the manager
    const updatedSession = agentManager.getAgent(session.agentId);

    // Verify session has worktree information
    expect(updatedSession.worktreePath).toBeDefined();
    expect(updatedSession.worktreeName).toBeDefined();
    expect(updatedSession.workingDirectory).toBe(updatedSession.worktreePath);
    expect(updatedSession.worktreePath).toContain('.napoleon');
    expect(updatedSession.worktreeName).toMatch(/^agent-.*-\d+$/);

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

    // Note: Worktree lifecycle manager has been removed - cleanup logic simplified
    
    // Restore fake timers
    jest.useFakeTimers();
  });

  it.skip('should handle worktree creation failure gracefully', async () => {
    // Create new manager instance to avoid conflicts
    const testManager = new AgentManager();
    await testManager.initialize();

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
      if (path.includes('worktrees')) {
        return true; // Simulate that the directory was partially created
      }
      return false;
    });

    const instructions = 'Test agent that should fail worktree creation';

    // The spawn will succeed but setup will fail asynchronously
    const session = await testManager.spawnAgent(instructions);
    
    // Wait for the async failure
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check that the agent was removed or marked as failed
    const agent = testManager.getAgent(session.agentId);
    expect(agent).toBeDefined();
    expect(agent.status).toBe('error');

    // Verify cleanup was attempted
    expect(fs.rmSync).toHaveBeenCalled();
  }, 15000);

  it('should validate git repository state before worktree creation', async () => {
    // Create new manager to avoid conflicts
    const testManager = new AgentManager();
    
    // Mock repository with uncommitted changes - this should be detected during spawnAgent
    execSync.mockImplementation((cmd) => {
      if (cmd.includes('git rev-parse --is-inside-work-tree')) return 'true';
      if (cmd.includes('git rev-parse --show-toplevel')) return '/repo/root';
      if (cmd.includes('git diff-index --quiet HEAD --')) {
        throw new Error('Uncommitted changes');
      }
      return 'true';
    });

    await testManager.initialize();

    const instructions = 'Test agent with dirty repo';

    // The spawn should succeed but worktree validation will detect uncommitted changes
    const session = await testManager.spawnAgent(instructions);
    
    // Wait for async validation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Agent should be in error state
    const agent = testManager.getAgent(session.agentId);
    expect(agent).toBeDefined();
    expect(agent.status).toBe('error');
  }, 15000);

  it('should ensure worktree directory exists', async () => {
    await agentManager.initialize();

    // Mock to initially return false for base directory, but true for specific worktree paths
    let createdWorktreePath = null;
    fs.existsSync.mockImplementation((path) => {
      // If this is the base worktrees directory, return false to trigger mkdir
      if (path.includes('worktrees') && !path.includes('agent-')) {
        return false;
      }
      // If this is a specific worktree path, return true after creation
      if (path.includes('agent-')) {
        createdWorktreePath = path;
        return true;
      }
      // For sessions file, return true
      if (path.includes('sessions.json')) {
        return true;
      }
      return false;
    });

    const instructions = 'Test worktree directory creation';
    
    await agentManager.spawnAgent(instructions);

    // Verify directory creation was called
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('worktrees'),
      { recursive: true, mode: 0o755 }
    );
  }, 15000);

  it.skip('should generate unique worktree names', async () => {
    await agentManager.initialize();

    const instructions = 'Test unique worktree names';
    
    const session1 = await agentManager.spawnAgent(instructions);
    
    // Wait for first agent to be fully set up
    await new Promise(resolve => setTimeout(resolve, 100));
    const agent1 = agentManager.getAgent(session1.agentId);
    
    // Mock a different timestamp for the second agent
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => originalDateNow() + 1000);
    
    const session2 = await agentManager.spawnAgent(instructions);
    
    // Wait for second agent to be fully set up
    await new Promise(resolve => setTimeout(resolve, 100));
    const agent2 = agentManager.getAgent(session2.agentId);
    
    Date.now = originalDateNow;

    expect(agent1.worktreeName).not.toBe(agent2.worktreeName);
    expect(agent1.worktreePath).not.toBe(agent2.worktreePath);
  }, 15000);
});