const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const WorktreeDiscovery = require('../src/core/worktree-discovery');

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  }
}));

jest.mock('child_process');

const execAsync = promisify(exec);

describe('WorktreeDiscovery', () => {
  let discovery;
  let mockWorktreesDir;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWorktreesDir = '/test/project/.napoleon-worktrees';
    discovery = new WorktreeDiscovery(mockWorktreesDir);
  });

  describe('constructor', () => {
    it('should initialize with default worktrees directory', () => {
      const defaultDiscovery = new WorktreeDiscovery();
      expect(defaultDiscovery.worktreesDir).toBe(path.join(process.cwd(), '.napoleon-worktrees'));
    });

    it('should use provided worktrees directory', () => {
      expect(discovery.worktreesDir).toBe(mockWorktreesDir);
    });
  });

  describe('scanFilesystemWorktrees', () => {
    it('should return empty array when worktrees directory does not exist', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await discovery.scanFilesystemWorktrees();

      expect(result).toEqual([]);
      expect(fs.access).toHaveBeenCalledWith(mockWorktreesDir);
    });

    it('should scan and parse valid worktree directories', async () => {
      const mockEntries = [
        { name: 'agent-test123-1234567890', isDirectory: () => true },
        { name: 'agent-test456-1234567891', isDirectory: () => true },
        { name: 'not-agent-dir', isDirectory: () => true },
        { name: 'some-file.txt', isDirectory: () => false }
      ];

      const mockStats = {
        birthtime: new Date('2025-01-01T10:00:00Z'),
        mtime: new Date('2025-01-01T11:00:00Z')
      };

      fs.access.mockResolvedValue();
      fs.readdir.mockResolvedValue(mockEntries);
      fs.stat.mockResolvedValue(mockStats);

      // Mock directory size calculation
      discovery.getDirectorySize = jest.fn().mockResolvedValue(1024 * 1024); // 1MB

      const result = await discovery.scanFilesystemWorktrees();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'agent-test123-1234567890',
        path: path.join(mockWorktreesDir, 'agent-test123-1234567890'),
        agentId: 'agent-test123',
        timestamp: 1234567890,
        spawnTime: new Date(1234567890).toISOString(),
        createdAt: mockStats.birthtime,
        lastModified: mockStats.mtime,
        size: 1024 * 1024
      });
    });

    it('should handle filesystem errors gracefully', async () => {
      fs.access.mockResolvedValue();
      fs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await discovery.scanFilesystemWorktrees();

      expect(result).toEqual([]);
    });
  });

  describe('parseWorktreeInfo', () => {
    it('should parse valid worktree directory names', () => {
      const result = discovery.parseWorktreeInfo(
        'agent-test123-1234567890',
        '/path/to/agent-test123-1234567890'
      );

      expect(result).toEqual({
        name: 'agent-test123-1234567890',
        path: '/path/to/agent-test123-1234567890',
        agentId: 'agent-test123',
        timestamp: 1234567890,
        spawnTime: new Date(1234567890).toISOString()
      });
    });

    it('should return null for invalid directory names', () => {
      const result = discovery.parseWorktreeInfo('invalid-name', '/path/to/invalid-name');
      expect(result).toBeNull();
    });

    it('should handle complex agent IDs', () => {
      const result = discovery.parseWorktreeInfo(
        'agent-complex-agent-id-with-dashes-1234567890',
        '/path/to/worktree'
      );

      expect(result).toEqual({
        name: 'agent-complex-agent-id-with-dashes-1234567890',
        path: '/path/to/worktree',
        agentId: 'agent-complex-agent-id-with-dashes',
        timestamp: 1234567890,
        spawnTime: new Date(1234567890).toISOString()
      });
    });
  });

  describe('getGitWorktreeList', () => {
    it('should parse git worktree list output correctly', async () => {
      const mockGitOutput = `worktree /main/repo
HEAD abcd1234
branch refs/heads/main

worktree /path/to/.napoleon-worktrees/agent-test123-1234567890
HEAD efgh5678
branch refs/heads/agent-test123-branch

worktree /path/to/.napoleon-worktrees/agent-test456-1234567891
HEAD ijkl9012
detached`;

      exec.mockImplementation((cmd, options, callback) => {
        callback(null, { stdout: mockGitOutput, stderr: '' });
      });

      const result = await discovery.getGitWorktreeList();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        path: '/main/repo',
        head: 'abcd1234',
        branch: 'refs/heads/main'
      });
      expect(result[1]).toEqual({
        path: '/path/to/.napoleon-worktrees/agent-test123-1234567890',
        head: 'efgh5678',
        branch: 'refs/heads/agent-test123-branch'
      });
      expect(result[2]).toEqual({
        path: '/path/to/.napoleon-worktrees/agent-test456-1234567891',
        head: 'ijkl9012',
        detached: true
      });
    });

    it('should handle git command failures gracefully', async () => {
      exec.mockImplementation((cmd, options, callback) => {
        callback(new Error('Git command failed'), null, 'fatal: not a git repository');
      });

      const result = await discovery.getGitWorktreeList();

      expect(result).toEqual([]);
    });

    it('should use cached results when cache is valid', async () => {
      const mockGitOutput = 'worktree /test\nHEAD abc123';
      
      exec.mockImplementation((cmd, options, callback) => {
        callback(null, { stdout: mockGitOutput, stderr: '' });
      });

      // First call
      const result1 = await discovery.getGitWorktreeList();
      
      // Second call should use cache
      const result2 = await discovery.getGitWorktreeList();

      expect(exec).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });
  });

  describe('getRunningProcesses', () => {
    it('should parse ps command output correctly', async () => {
      const mockPsOutput = `  PID COMMAND
12345 /usr/bin/node /path/to/napoleon
23456 claude --version
34567 git worktree add /path/to/worktree
45678 /bin/bash`;

      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('ps -eo pid,command')) {
          callback(null, { stdout: mockPsOutput, stderr: '' });
        }
      });

      const result = await discovery.getRunningProcesses();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        pid: 12345,
        command: '/usr/bin/node /path/to/napoleon'
      });
      expect(result[1]).toEqual({
        pid: 23456,
        command: 'claude --version'
      });
    });

    it('should handle ps command failures gracefully', async () => {
      exec.mockImplementation((cmd, options, callback) => {
        callback(new Error('ps command failed'));
      });

      const result = await discovery.getRunningProcesses();

      expect(result).toEqual([]);
    });
  });

  describe('isWorktreeProcessActive', () => {
    const mockWorktree = {
      name: 'agent-test123-1234567890',
      path: '/path/to/.napoleon-worktrees/agent-test123-1234567890',
      agentId: 'agent-test123'
    };

    it('should identify active process by agent ID', () => {
      const processes = [
        { pid: 123, command: 'claude --agent agent-test123' },
        { pid: 456, command: 'other-process' }
      ];

      const result = discovery.isWorktreeProcessActive(mockWorktree, processes);

      expect(result).toBe(true);
    });

    it('should identify active process by worktree path', () => {
      const processes = [
        { pid: 123, command: 'git -C /path/to/.napoleon-worktrees/agent-test123-1234567890 status' },
        { pid: 456, command: 'other-process' }
      ];

      const result = discovery.isWorktreeProcessActive(mockWorktree, processes);

      expect(result).toBe(true);
    });

    it('should identify active process by napoleon/claude keywords', () => {
      const processes = [
        { pid: 123, command: 'napoleon --agent-id test123' },
        { pid: 456, command: 'other-process' }
      ];

      const result = discovery.isWorktreeProcessActive(mockWorktree, processes);

      expect(result).toBe(true);
    });

    it('should return false when no matching processes found', () => {
      const processes = [
        { pid: 123, command: 'unrelated-process' },
        { pid: 456, command: 'another-process' }
      ];

      const result = discovery.isWorktreeProcessActive(mockWorktree, processes);

      expect(result).toBe(false);
    });
  });

  describe('validateWorktreeState', () => {
    it('should validate consistent worktree state', async () => {
      const mockGitWorktrees = [
        { path: '/path/to/.napoleon-worktrees/agent-test123-1234567890' }
      ];
      const mockFilesystemWorktrees = [
        { path: '/path/to/.napoleon-worktrees/agent-test123-1234567890' }
      ];

      discovery.getGitWorktreeList = jest.fn().mockResolvedValue(mockGitWorktrees);
      discovery.scanFilesystemWorktrees = jest.fn().mockResolvedValue(mockFilesystemWorktrees);
      discovery.pruneInvalidWorktrees = jest.fn().mockResolvedValue();

      const result = await discovery.validateWorktreeState();

      expect(result).toEqual({
        valid: true,
        inconsistencies: 0,
        repaired: false
      });
      expect(discovery.pruneInvalidWorktrees).not.toHaveBeenCalled();
    });

    it('should detect and repair inconsistencies', async () => {
      const mockGitWorktrees = [
        { path: '/path/to/.napoleon-worktrees/agent-missing-1234567890' }
      ];
      const mockFilesystemWorktrees = [
        { path: '/path/to/.napoleon-worktrees/agent-orphan-1234567891' }
      ];

      discovery.getGitWorktreeList = jest.fn().mockResolvedValue(mockGitWorktrees);
      discovery.scanFilesystemWorktrees = jest.fn().mockResolvedValue(mockFilesystemWorktrees);
      discovery.pruneInvalidWorktrees = jest.fn().mockResolvedValue();

      const result = await discovery.validateWorktreeState();

      expect(result).toEqual({
        valid: false,
        inconsistencies: 2,
        repaired: true
      });
      expect(discovery.pruneInvalidWorktrees).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      discovery.getGitWorktreeList = jest.fn().mockRejectedValue(new Error('Git error'));

      const result = await discovery.validateWorktreeState();

      expect(result).toEqual({
        valid: false,
        error: 'Git error'
      });
    });
  });

  describe('discoverWorktrees', () => {
    it('should categorize worktrees correctly', async () => {
      const mockFilesystemWorktrees = [
        { path: '/worktrees/agent-active-123', agentId: 'agent-active' },
        { path: '/worktrees/agent-orphan-456', agentId: 'agent-orphan' }
      ];
      const mockGitWorktrees = [
        { path: '/worktrees/agent-active-123' },
        { path: '/worktrees/agent-orphan-456' }
      ];
      const mockProcesses = [
        { pid: 123, command: 'claude agent-active' }
      ];

      discovery.scanFilesystemWorktrees = jest.fn().mockResolvedValue(mockFilesystemWorktrees);
      discovery.getGitWorktreeList = jest.fn().mockResolvedValue(mockGitWorktrees);
      discovery.getRunningProcesses = jest.fn().mockResolvedValue(mockProcesses);

      // Mock the process matching logic to return false for orphan
      const originalIsWorktreeProcessActive = discovery.isWorktreeProcessActive;
      discovery.isWorktreeProcessActive = jest.fn().mockImplementation((worktree, processes) => {
        return worktree.agentId === 'agent-active';
      });

      const result = await discovery.discoverWorktrees();

      expect(result.total).toBe(2);
      expect(result.active).toHaveLength(1);
      expect(result.orphaned).toHaveLength(1);
      expect(result.active[0].agentId).toBe('agent-active');
      expect(result.orphaned[0].agentId).toBe('agent-orphan');
    });
  });

  describe('clearCache', () => {
    it('should clear git worktree cache', () => {
      discovery.gitWorktreeCache = ['cached data'];
      discovery.cacheTimestamp = Date.now();

      discovery.clearCache();

      expect(discovery.gitWorktreeCache).toBeNull();
      expect(discovery.cacheTimestamp).toBeNull();
    });
  });
});