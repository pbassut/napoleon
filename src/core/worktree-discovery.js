const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Worktree Discovery System
 * Handles discovery, validation, and state management of git worktrees
 */
class WorktreeDiscovery {
  constructor(worktreesDir) {
    this.worktreesDir = worktreesDir || path.join(os.homedir(), '.napoleon', 'worktrees');
    this.gitWorktreeCache = null;
    this.cacheTimestamp = null;
    this.cacheValidityMs = 30000; // 30 seconds cache
  }

  /**
   * Discover all worktrees and categorize them as active or orphaned
   */
  async discoverWorktrees() {
    try {
      logger.debug('Starting worktree discovery', { worktreesDir: this.worktreesDir });

      const [filesystemWorktrees, gitWorktrees, runningProcesses] = await Promise.all([
        this.scanFilesystemWorktrees(),
        this.getGitWorktreeList(),
        this.getRunningProcesses(),
      ]);

      // Match filesystem worktrees with git metadata and running processes
      const activeWorktrees = [];
      const orphanedWorktrees = [];

      filesystemWorktrees.forEach((fsWorktree) => {
        const gitWorktree = gitWorktrees.find((gw) => gw.path === fsWorktree.path);
        const isActiveProcess = this.isWorktreeProcessActive(fsWorktree, runningProcesses);

        const worktreeInfo = {
          ...fsWorktree,
          gitMetadata: gitWorktree,
          isGitValid: !!gitWorktree,
          isProcessActive: isActiveProcess,
          lastValidation: new Date().toISOString(),
        };

        if (isActiveProcess && gitWorktree) {
          activeWorktrees.push(worktreeInfo);
        } else {
          orphanedWorktrees.push(worktreeInfo);
        }
      });

      logger.info('Worktree discovery completed', {
        total: filesystemWorktrees.length,
        active: activeWorktrees.length,
        orphaned: orphanedWorktrees.length,
      });

      return {
        active: activeWorktrees,
        orphaned: orphanedWorktrees,
        total: filesystemWorktrees.length,
      };
    } catch (error) {
      logger.error('Failed to discover worktrees', {
        error: error.message,
        worktreesDir: this.worktreesDir,
      });
      throw error;
    }
  }

  /**
   * Scan filesystem for worktree directories
   */
  async scanFilesystemWorktrees() {
    try {
      // Check if worktrees directory exists
      const dirExists = await fs.access(this.worktreesDir).then(() => true).catch(() => false);
      if (!dirExists) {
        logger.debug('Worktrees directory does not exist', { worktreesDir: this.worktreesDir });
        return [];
      }

      const entries = await fs.readdir(this.worktreesDir, { withFileTypes: true });
      const worktrees = [];

      const worktreePromises = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('agent-'))
        .map(async (entry) => {
          const worktreePath = path.join(this.worktreesDir, entry.name);
          const worktreeInfo = this.parseWorktreeInfo(entry.name, worktreePath);

          if (worktreeInfo) {
            // Get additional filesystem info
            const stats = await fs.stat(worktreePath);
            worktreeInfo.createdAt = stats.birthtime;
            worktreeInfo.lastModified = stats.mtime;
            worktreeInfo.size = await this.getDirectorySize(worktreePath);

            return worktreeInfo;
          }
          return null;
        });

      const worktreeResults = await Promise.all(worktreePromises);
      worktrees.push(...worktreeResults.filter(Boolean));

      return worktrees.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } catch (error) {
      logger.error('Failed to scan filesystem worktrees', {
        error: error.message,
        worktreesDir: this.worktreesDir,
      });
      return [];
    }
  }

  /**
   * Parse worktree information from directory name
   * Expected format: agent-{agentId}-{timestamp}
   */
  parseWorktreeInfo(dirName, fullPath) {
    const match = dirName.match(/^agent-(.+)-(\d+)$/);
    if (!match) {
      logger.warn('Invalid worktree directory name format', { dirName });
      return null;
    }

    const [, agentId, timestamp] = match;
    return {
      name: dirName,
      path: fullPath,
      agentId: `agent-${agentId}`,
      timestamp: parseInt(timestamp, 10),
      spawnTime: new Date(parseInt(timestamp, 10)).toISOString(),
    };
  }

  /**
   * Get git worktree list with caching
   */
  async getGitWorktreeList() {
    const now = Date.now();

    // Return cached result if still valid
    if (this.gitWorktreeCache && this.cacheTimestamp
        && (now - this.cacheTimestamp) < this.cacheValidityMs) {
      return this.gitWorktreeCache;
    }

    try {
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: process.cwd(),
        timeout: 10000,
      });

      const worktrees = this.parseGitWorktreeList(stdout);

      // Update cache
      this.gitWorktreeCache = worktrees;
      this.cacheTimestamp = now;

      logger.debug('Git worktree list retrieved', { count: worktrees.length });
      return worktrees;
    } catch (error) {
      logger.warn('Failed to get git worktree list', { error: error.message });
      // Return empty array if git command fails
      return [];
    }
  }

  /**
   * Parse git worktree list --porcelain output
   */
  parseGitWorktreeList(stdout) {
    const worktrees = [];
    const lines = stdout.split('\n').filter((line) => line.trim());

    let currentWorktree = {};
    lines.forEach((line) => {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree);
        }
        currentWorktree = { path: line.substring(9) };
      } else if (line.startsWith('HEAD ')) {
        currentWorktree.head = line.substring(5);
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7);
      } else if (line === 'bare') {
        currentWorktree.bare = true;
      } else if (line === 'detached') {
        currentWorktree.detached = true;
      } else if (line === 'locked') {
        currentWorktree.locked = true;
      } else if (line.startsWith('locked ')) {
        currentWorktree.locked = true;
        currentWorktree.lockReason = line.substring(7);
      }
    });

    // Add the last worktree
    if (currentWorktree.path) {
      worktrees.push(currentWorktree);
    }

    return worktrees;
  }

  /**
   * Get running processes (simplified version for process matching)
   */
  async getRunningProcesses() {
    try {
      // SDK-based approach: Get active sessions from agent manager
      const activeSessions = [];

      // This would be injected by agent manager if needed for worktree discovery
      if (this.agentManager && this.agentManager.sdkManager) {
        const sdkSessions = this.agentManager.sdkManager.getActiveSessions();

        sdkSessions.forEach((session) => {
          activeSessions.push({
            sessionId: session.agentId,
            workingDirectory: session.workingDirectory,
            isActive: session.isActive,
            lastActivity: session.lastActivity,
          });
        });
      }

      logger.debug('Retrieved active SDK sessions', { count: activeSessions.length });
      return activeSessions;
    } catch (error) {
      logger.warn('Failed to get active SDK sessions', { error: error.message });
      return [];
    }
  }

  /**
   * Check if a worktree has an active associated SDK session
   */
  isWorktreeProcessActive(worktree, activeSessions) {
    // Look for SDK sessions that might be associated with this agent/worktree
    const agentIdPattern = worktree.agentId;
    const worktreePathPattern = worktree.path;

    return activeSessions.some((session) => {
      // Check for SDK session matches
      const isSessionMatch = (
        // Exact agent ID match
        session.sessionId === agentIdPattern

        // Working directory matches worktree path
        || session.workingDirectory === worktreePathPattern

        // Session is active and related to this worktree
        || (session.isActive && session.workingDirectory
         && session.workingDirectory.includes(worktreePathPattern))
      );

      if (isSessionMatch) {
        logger.debug('Found active SDK session for worktree', {
          worktree: worktree.name,
          agentId: worktree.agentId,
          sessionId: session.sessionId,
          workingDirectory: session.workingDirectory,
        });
        return true;
      }
      return false;
    });
  }

  /**
   * Validate and repair git worktree state
   */
  async validateWorktreeState() {
    try {
      logger.debug('Validating git worktree state');

      // Get both git worktrees and filesystem worktrees
      const [gitWorktrees, filesystemWorktrees] = await Promise.all([
        this.getGitWorktreeList(),
        this.scanFilesystemWorktrees(),
      ]);

      const inconsistencies = this.findWorktreeInconsistencies(gitWorktrees, filesystemWorktrees);

      if (inconsistencies.length > 0) {
        logger.warn('Found worktree inconsistencies', {
          count: inconsistencies.length,
          inconsistencies: inconsistencies.map((i) => i.type),
        });

        // Prune invalid git worktree entries
        await this.pruneInvalidWorktrees();

        // Clear cache after pruning
        this.gitWorktreeCache = null;
        this.cacheTimestamp = null;
      }

      return {
        valid: inconsistencies.length === 0,
        inconsistencies: inconsistencies.length,
        repaired: inconsistencies.length > 0,
      };
    } catch (error) {
      logger.error('Failed to validate worktree state', { error: error.message });
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Find inconsistencies between git metadata and filesystem
   */
  findWorktreeInconsistencies(gitWorktrees, filesystemWorktrees) {
    const inconsistencies = [];

    // Check for git worktrees without filesystem directories
    gitWorktrees.forEach((gitWorktree) => {
      if (gitWorktree.path.includes('.napoleon') && gitWorktree.path.includes('worktrees')) {
        const hasFilesystem = filesystemWorktrees.some(
          (fsWorktree) => fsWorktree.path === gitWorktree.path,
        );
        if (!hasFilesystem) {
          inconsistencies.push({
            type: 'git-without-filesystem',
            gitWorktree,
            description: 'Git metadata exists but filesystem directory is missing',
          });
        }
      }
    });

    // Check for filesystem worktrees without git metadata
    filesystemWorktrees.forEach((fsWorktree) => {
      const hasGitMetadata = gitWorktrees.some((git) => git.path === fsWorktree.path);
      if (!hasGitMetadata) {
        inconsistencies.push({
          type: 'filesystem-without-git',
          fsWorktree,
          description: 'Filesystem directory exists but git metadata is missing',
        });
      }
    });

    return inconsistencies;
  }

  /**
   * Prune invalid git worktree entries
   */
  async pruneInvalidWorktrees() {
    try {
      const { stdout, stderr } = await execAsync('git worktree prune', {
        cwd: process.cwd(),
        timeout: 10000,
      });

      if (stdout || stderr) {
        logger.info('Pruned invalid git worktree entries', {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      }
    } catch (error) {
      logger.warn('Failed to prune invalid worktrees', { error: error.message });
    }
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    try {
      let totalSize = 0;
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      const sizePromises = items.map(async (item) => {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          return this.getDirectorySize(itemPath);
        }
        const stats = await fs.stat(itemPath);
        return stats.size;
      });

      const sizes = await Promise.all(sizePromises);
      totalSize = sizes.reduce((sum, size) => sum + size, 0);

      return totalSize;
    } catch (error) {
      logger.debug('Failed to get directory size', {
        dirPath,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Clear worktree cache
   */
  clearCache() {
    this.gitWorktreeCache = null;
    this.cacheTimestamp = null;
    logger.debug('Worktree cache cleared');
  }
}

module.exports = WorktreeDiscovery;
