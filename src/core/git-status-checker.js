const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

/**
 * Git Status Checker
 * Validates git working tree status and provides detailed status information
 */
class GitStatusChecker {
  constructor() {
    this.statusCache = null;
    this.cacheTimeout = 5000; // 5 seconds
    this.lastCacheTime = 0;
  }

  /**
   * Check working tree status with caching
   * @returns {Promise<Object>} Status object with git state information
   */
  async checkWorkingTreeStatus() {
    try {
      // Check if in git repository
      const gitDir = await GitStatusChecker.findGitDirectory();
      if (!gitDir) {
        throw new Error('Not in a git repository');
      }

      // Return cached result if still valid
      if (this.isStatusCacheValid()) {
        return this.statusCache;
      }

      // Get fresh git status
      const status = await this.getGitStatus();

      const result = {
        isClean: status.isClean,
        hasUncommittedChanges: status.modified.length > 0,
        hasUntrackedFiles: status.untracked.length > 0,
        hasStagedChanges: status.staged.length > 0,
        details: status,
        gitDir,
      };

      // Cache the result
      this.statusCache = result;
      this.lastCacheTime = Date.now();

      return result;
    } catch (error) {
      throw new Error(`Git status check failed: ${error.message}`);
    }
  }

  /**
   * Find git directory from current working directory (async)
   * @returns {Promise<string|null>} Path to .git directory or null if not found
   */
  static async findGitDirectory() {
    try {
      const { stdout } = await execAsync('git rev-parse --git-dir', {
        encoding: 'utf8',
        timeout: 2000, // 2 second timeout
      });

      // Convert to absolute path
      return path.resolve(stdout.trim());
    } catch (error) {
      return null;
    }
  }

  /**
   * Get detailed git status using porcelain format (async)
   * @returns {Promise<Object>} Parsed git status object
   */
  static async getGitStatus() {
    try {
      // Get porcelain status for reliable parsing
      const { stdout } = await execAsync('git status --porcelain', {
        encoding: 'utf8',
        timeout: 3000, // 3 second timeout
      });

      const modified = [];
      const untracked = [];
      const staged = [];

      stdout.split('\n').forEach((line) => {
        if (line.trim()) {
          const status = line.substring(0, 2);
          const file = line.substring(3);

          // Parse git status codes
          // First character is staged, second is working tree
          const stagedChar = status[0];
          const workingChar = status[1];

          if (stagedChar !== ' ' && stagedChar !== '?') {
            // File is staged
            staged.push({
              file,
              status: stagedChar,
              type: GitStatusChecker.getStatusType(stagedChar),
            });
          }

          if (workingChar !== ' ' && workingChar !== '?') {
            // File has working tree changes
            modified.push({
              file,
              status: workingChar,
              type: GitStatusChecker.getStatusType(workingChar),
            });
          }

          if (status === '??') {
            // Untracked file
            untracked.push({
              file,
              status: '??',
              type: 'untracked',
            });
          }
        }
      });

      return {
        isClean: modified.length === 0 && untracked.length === 0 && staged.length === 0,
        modified,
        untracked,
        staged,
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  /**
   * Get human-readable status type from git status code
   * @param {string} statusCode - Git status code character
   * @returns {string} Human-readable status type
   */
  static getStatusType(statusCode) {
    const statusTypes = {
      M: 'modified',
      A: 'added',
      D: 'deleted',
      R: 'renamed',
      C: 'copied',
      U: 'unmerged',
      '??': 'untracked',
    };

    return statusTypes[statusCode] || 'unknown';
  }

  /**
   * Generate warning message for git status issues
   * @param {Object} status - Status result from checkWorkingTreeStatus
   * @returns {string} Formatted warning message
   */
  static generateWarningMessage(status) {
    const warnings = [];

    if (status.hasUncommittedChanges) {
      warnings.push(`• ${status.details.modified.length} file(s) have uncommitted changes`);
    }

    if (status.hasUntrackedFiles) {
      warnings.push(`• ${status.details.untracked.length} untracked file(s) present`);
    }

    if (status.hasStagedChanges) {
      warnings.push(`• ${status.details.staged.length} file(s) staged for commit`);
    }

    return warnings.join('\n');
  }

  /**
   * Get detailed file list for warning display
   * @param {Object} status - Status result from checkWorkingTreeStatus
   * @returns {Object} Detailed file information
   */
  static getDetailedFileInfo(status) {
    return {
      modified: status.details.modified.map((item) => `  ${item.file} (${item.type})`).join('\n'),
      untracked: status.details.untracked.map((item) => `  ${item.file}`).join('\n'),
      staged: status.details.staged.map((item) => `  ${item.file} (${item.type})`).join('\n'),
    };
  }

  /**
   * Check if status cache is still valid
   * @returns {boolean} True if cache is valid
   */
  isStatusCacheValid() {
    return this.statusCache
           && (Date.now() - this.lastCacheTime) < this.cacheTimeout;
  }

  /**
   * Clear status cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.statusCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Validate git repository and working tree state (async with parallel checks)
   * @returns {Promise<Object>} Validation result
   */
  static async validateGitRepository() {
    try {
      // Run git version and directory checks in parallel
      const [gitVersionResult, gitDir] = await Promise.allSettled([
        execAsync('git --version', { timeout: 1000 }),
        GitStatusChecker.findGitDirectory(),
      ]);

      // Check git availability
      if (gitVersionResult.status === 'rejected') {
        return {
          isValid: false,
          error: 'GIT_NOT_AVAILABLE',
          message: 'Git is not available in system PATH',
        };
      }

      // Check if in git repository
      if (gitDir.status === 'rejected' || !gitDir.value) {
        return {
          isValid: false,
          error: 'NOT_IN_GIT_REPO',
          message: 'Current directory is not in a git repository',
        };
      }

      // Check if git directory is accessible (async check)
      const directoryExists = await new Promise((resolve) => {
        fs.access(gitDir.value, fs.constants.F_OK, (err) => {
          resolve(!err);
        });
      });

      if (!directoryExists) {
        return {
          isValid: false,
          error: 'GIT_DIR_NOT_ACCESSIBLE',
          message: 'Git directory is not accessible',
        };
      }

      return {
        isValid: true,
        gitDir: gitDir.value,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'GIT_VALIDATION_FAILED',
        message: `Git validation failed: ${error.message}`,
      };
    }
  }
}

module.exports = GitStatusChecker;
