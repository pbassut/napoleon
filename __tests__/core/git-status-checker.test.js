const GitStatusChecker = require('../../src/core/git-status-checker');
const { execSync } = require('child_process');
const fs = require('fs');

// Mock child_process and fs
jest.mock('child_process');
jest.mock('fs');
jest.mock('../../src/utils/logger');

describe('GitStatusChecker', () => {
  let checker;

  beforeEach(() => {
    jest.clearAllMocks();
    checker = new GitStatusChecker();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(checker.statusCache).toBeNull();
      expect(checker.cacheTimeout).toBe(5000);
      expect(checker.lastCacheTime).toBe(0);
    });
  });

  describe('findGitDirectory', () => {
    it('should return git directory path when in git repo', async () => {
      execSync.mockReturnValue('/project/.git\n');

      const result = await checker.findGitDirectory();

      expect(result).toContain('.git');
      expect(execSync).toHaveBeenCalledWith('git rev-parse --git-dir', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    });

    it('should return null when not in git repo', async () => {
      execSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = await checker.findGitDirectory();

      expect(result).toBeNull();
    });
  });

  describe('getGitStatus', () => {
    it('should parse empty git status (clean repo)', async () => {
      execSync.mockReturnValue('');

      const result = await checker.getGitStatus();

      expect(result).toEqual({
        isClean: true,
        modified: [],
        untracked: [],
        staged: []
      });
    });

    it('should parse modified files correctly', async () => {
      const gitOutput = ' M file1.js\n M file2.js\n';
      execSync.mockReturnValue(gitOutput);

      const result = await checker.getGitStatus();

      expect(result.isClean).toBe(false);
      expect(result.modified).toHaveLength(2);
      expect(result.modified[0]).toEqual({
        file: 'file1.js',
        status: 'M',
        type: 'modified'
      });
    });

    it('should parse untracked files correctly', async () => {
      const gitOutput = '?? untracked1.js\n?? untracked2.js\n';
      execSync.mockReturnValue(gitOutput);

      const result = await checker.getGitStatus();

      expect(result.isClean).toBe(false);
      expect(result.untracked).toHaveLength(2);
      expect(result.untracked[0]).toEqual({
        file: 'untracked1.js',
        status: '??',
        type: 'untracked'
      });
    });

    it('should parse staged files correctly', async () => {
      const gitOutput = 'A  staged1.js\nM  staged2.js\n';
      execSync.mockReturnValue(gitOutput);

      const result = await checker.getGitStatus();

      expect(result.isClean).toBe(false);
      expect(result.staged).toHaveLength(2);
      expect(result.staged[0]).toEqual({
        file: 'staged1.js',
        status: 'A',
        type: 'added'
      });
      expect(result.staged[1]).toEqual({
        file: 'staged2.js',
        status: 'M',
        type: 'modified'
      });
    });

    it('should parse mixed git status correctly', async () => {
      const gitOutput = 'M  staged.js\n M modified.js\n?? untracked.js\n';
      execSync.mockReturnValue(gitOutput);

      const result = await checker.getGitStatus();

      expect(result.isClean).toBe(false);
      expect(result.staged).toHaveLength(1);
      expect(result.modified).toHaveLength(1);
      expect(result.untracked).toHaveLength(1);
    });

    it('should handle git command errors', async () => {
      execSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      await expect(checker.getGitStatus()).rejects.toThrow('Failed to get git status');
    });
  });

  describe('getStatusType', () => {
    it('should return correct status types', () => {
      expect(checker.getStatusType('M')).toBe('modified');
      expect(checker.getStatusType('A')).toBe('added');
      expect(checker.getStatusType('D')).toBe('deleted');
      expect(checker.getStatusType('R')).toBe('renamed');
      expect(checker.getStatusType('C')).toBe('copied');
      expect(checker.getStatusType('U')).toBe('unmerged');
      expect(checker.getStatusType('??')).toBe('untracked');
      expect(checker.getStatusType('X')).toBe('unknown');
    });
  });

  describe('generateWarningMessage', () => {
    it('should generate message for uncommitted changes', () => {
      const status = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file1.js', 'file2.js'] }
      };

      const message = checker.generateWarningMessage(status);

      expect(message).toBe('• 2 file(s) have uncommitted changes');
    });

    it('should generate message for untracked files', () => {
      const status = {
        hasUncommittedChanges: false,
        hasUntrackedFiles: true,
        hasStagedChanges: false,
        details: { untracked: ['new.js'] }
      };

      const message = checker.generateWarningMessage(status);

      expect(message).toBe('• 1 untracked file(s) present');
    });

    it('should generate message for staged changes', () => {
      const status = {
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: true,
        details: { staged: ['ready.js'] }
      };

      const message = checker.generateWarningMessage(status);

      expect(message).toBe('• 1 file(s) staged for commit');
    });

    it('should generate combined message for multiple issues', () => {
      const status = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: true,
        hasStagedChanges: true,
        details: {
          modified: ['modified.js'],
          untracked: ['new.js'],
          staged: ['staged.js']
        }
      };

      const message = checker.generateWarningMessage(status);

      expect(message).toContain('• 1 file(s) have uncommitted changes');
      expect(message).toContain('• 1 untracked file(s) present');
      expect(message).toContain('• 1 file(s) staged for commit');
    });
  });

  describe('getDetailedFileInfo', () => {
    it('should format detailed file information', () => {
      const status = {
        details: {
          modified: [{ file: 'mod.js', type: 'modified' }],
          untracked: [{ file: 'new.js' }],
          staged: [{ file: 'staged.js', type: 'added' }]
        }
      };

      const info = checker.getDetailedFileInfo(status);

      expect(info.modified).toBe('  mod.js (modified)');
      expect(info.untracked).toBe('  new.js');
      expect(info.staged).toBe('  staged.js (added)');
    });
  });

  describe('checkWorkingTreeStatus', () => {
    it('should return clean status for clean repo', async () => {
      execSync
        .mockReturnValueOnce('/project/.git')  // git rev-parse
        .mockReturnValueOnce('');              // git status

      const result = await checker.checkWorkingTreeStatus();

      expect(result.isClean).toBe(true);
      expect(result.hasUncommittedChanges).toBe(false);
      expect(result.hasUntrackedFiles).toBe(false);
      expect(result.hasStagedChanges).toBe(false);
    });

    it('should return dirty status for repo with changes', async () => {
      execSync
        .mockReturnValueOnce('/project/.git')     // git rev-parse
        .mockReturnValueOnce(' M file.js\n');    // git status

      const result = await checker.checkWorkingTreeStatus();

      expect(result.isClean).toBe(false);
      expect(result.hasUncommittedChanges).toBe(true);
      expect(result.hasUntrackedFiles).toBe(false);
      expect(result.hasStagedChanges).toBe(false);
    });

    it('should throw error when not in git repo', async () => {
      execSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      await expect(checker.checkWorkingTreeStatus()).rejects.toThrow('Not in a git repository');
    });

    it('should use cache for repeated calls', async () => {
      execSync
        .mockReturnValueOnce('/project/.git')  // git rev-parse for first call
        .mockReturnValueOnce('')               // git status for first call
        .mockReturnValueOnce('/project/.git'); // git rev-parse for second call (cache check)

      // First call
      const result1 = await checker.checkWorkingTreeStatus();
      
      // Second call should use cache
      const result2 = await checker.checkWorkingTreeStatus();

      expect(result1).toEqual(result2);
      expect(execSync).toHaveBeenCalledTimes(3); // git rev-parse (twice) + git status (once)
    });
  });

  describe('validateGitRepository', () => {
    it('should validate successful git repository', async () => {
      execSync.mockReturnValueOnce('git version 2.30.0');  // git --version
      execSync.mockReturnValueOnce('/project/.git');       // git rev-parse
      fs.existsSync.mockReturnValue(true);

      const result = await checker.validateGitRepository();

      expect(result.isValid).toBe(true);
      expect(result.gitDir).toContain('.git');
    });

    it('should detect when git is not available', async () => {
      execSync.mockImplementation(() => {
        throw new Error('command not found');
      });

      const result = await checker.validateGitRepository();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('GIT_NOT_AVAILABLE');
    });

    it('should detect when not in git repository', async () => {
      execSync
        .mockReturnValueOnce('git version 2.30.0')  // git --version
        .mockImplementationOnce(() => {              // git rev-parse
          throw new Error('not a git repository');
        });

      const result = await checker.validateGitRepository();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('NOT_IN_GIT_REPO');
    });

    it('should detect when git directory is not accessible', async () => {
      execSync
        .mockReturnValueOnce('git version 2.30.0')  // git --version
        .mockReturnValueOnce('/project/.git');      // git rev-parse
      fs.existsSync.mockReturnValue(false);

      const result = await checker.validateGitRepository();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('GIT_DIR_NOT_ACCESSIBLE');
    });
  });

  describe('cache management', () => {
    it('should clear cache correctly', () => {
      checker.statusCache = { test: 'data' };
      checker.lastCacheTime = Date.now();

      checker.clearCache();

      expect(checker.statusCache).toBeNull();
      expect(checker.lastCacheTime).toBe(0);
    });

    it('should detect expired cache', () => {
      checker.statusCache = { test: 'data' };
      checker.lastCacheTime = Date.now() - 10000; // 10 seconds ago

      expect(checker.isStatusCacheValid()).toBe(false);
    });

    it('should detect valid cache', () => {
      checker.statusCache = { test: 'data' };
      checker.lastCacheTime = Date.now(); // Just now

      expect(checker.isStatusCacheValid()).toBe(true);
    });
  });
});