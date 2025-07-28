const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const logger = require('../../utils/logger');

/**
 * Log Retention Manager - Automated log cleanup and retention management
 *
 * Implements configurable retention policies for automatic cleanup, compression,
 * and archival of agent logs to prevent unlimited disk space usage.
 */
class LogRetentionManager {
  constructor(config = {}) {
    this.config = config;
    this.napoleonDir = config.napoleonDir || path.join(os.homedir(), '.napoleon');
    this.logsDir = path.join(this.napoleonDir, 'logs', 'agents');
    this.retentionConfig = config.logging?.retention || LogRetentionManager.getDefaultConfig();
    this.scheduler = null;
    this.compressionQueue = [];
    this.initialized = false;
    this.activeAgents = new Set(); // Track active agents to prevent deletion
  }

  /**
   * Get default retention configuration
   * @returns {Object} Default retention config
   */
  static getDefaultConfig() {
    return {
      enabled: true,
      maxAgeDays: 30,
      maxLogCount: 1000,
      maxDirectorySizeMB: 1000,
      compressionAgeDays: 7,
      cleanupIntervalHours: 24,
      cleanupTime: '02:00',
      policies: {
        errorLogs: {
          maxAgeDays: 60,
          priority: 'high',
        },
        infoLogs: {
          maxAgeDays: 30,
          priority: 'normal',
        },
      },
    };
  }

  /**
   * Initialize the log retention manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Ensure logs directory exists
      await fs.promises.mkdir(this.logsDir, { recursive: true });

      // Validate configuration
      this.validateConfig();

      // Start scheduler if enabled
      if (this.retentionConfig.enabled) {
        this.scheduleCleanup(this.retentionConfig.cleanupIntervalHours);
      }

      this.initialized = true;
      logger.info('LogRetentionManager initialized successfully', {
        logsDir: this.logsDir,
        config: this.retentionConfig,
      });
    } catch (error) {
      logger.error('Failed to initialize LogRetentionManager', {
        error: error.message,
        logsDir: this.logsDir,
      });
      throw new Error(`LogRetentionManager initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate retention configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    const config = this.retentionConfig;

    if (typeof config.maxAgeDays !== 'number' || config.maxAgeDays < 1) {
      throw new Error('maxAgeDays must be a positive number');
    }

    if (typeof config.maxLogCount !== 'number' || config.maxLogCount < 1) {
      throw new Error('maxLogCount must be a positive number');
    }

    if (typeof config.maxDirectorySizeMB !== 'number' || config.maxDirectorySizeMB < 1) {
      throw new Error('maxDirectorySizeMB must be a positive number');
    }

    if (typeof config.compressionAgeDays !== 'number' || config.compressionAgeDays < 0) {
      throw new Error('compressionAgeDays must be a non-negative number');
    }
  }

  /**
   * Perform retention cleanup with optional dry run
   * @param {boolean} dryRun - If true, preview actions without execution
   * @returns {Promise<Object>} Cleanup report
   */
  async performCleanup(dryRun = false) {
    if (!this.initialized) {
      throw new Error('LogRetentionManager not initialized. Call initialize() first.');
    }

    logger.info('Starting log retention cleanup', { dryRun });

    const cleanupReport = {
      startTime: new Date().toISOString(),
      dryRun,
      actions: [],
      summary: {
        filesScanned: 0,
        filesCompressed: 0,
        filesDeleted: 0,
        spaceSavedMB: 0,
        errors: [],
      },
    };

    try {
      // Scan phase: Get all log files with metadata
      const logFiles = await this.scanLogFiles();
      cleanupReport.summary.filesScanned = logFiles.length;

      // Update active agents to prevent deletion
      await this.updateActiveAgents();

      // Compression phase: Compress old logs
      const compressionResults = await this.compressOldLogs(
        this.retentionConfig.compressionAgeDays,
        dryRun,
      );
      cleanupReport.actions.push(...compressionResults.actions);
      cleanupReport.summary.filesCompressed = compressionResults.filesCompressed;

      // Cleanup phase: Apply retention policies
      const cleanupResults = await this.applyRetentionPolicies(logFiles, dryRun);
      cleanupReport.actions.push(...cleanupResults.actions);
      cleanupReport.summary.filesDeleted = cleanupResults.filesDeleted;
      cleanupReport.summary.spaceSavedMB = cleanupResults.spaceSavedMB;

      cleanupReport.endTime = new Date().toISOString();
      cleanupReport.duration = new Date(cleanupReport.endTime) - new Date(cleanupReport.startTime);

      logger.info('Log retention cleanup completed', {
        summary: cleanupReport.summary,
        duration: cleanupReport.duration,
      });

      return cleanupReport;
    } catch (error) {
      cleanupReport.summary.errors.push(error.message);
      logger.error('Log retention cleanup failed', {
        error: error.message,
        cleanupReport,
      });
      throw error;
    }
  }

  /**
   * Scan log directory and collect file metadata
   * @returns {Promise<Array>} Array of file metadata objects
   */
  async scanLogFiles() {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      const logFiles = [];

      const logFilePromises = files
        .filter((file) => file.endsWith('.log') || file.endsWith('.log.gz'))
        .map(async (file) => {
          const filePath = path.join(this.logsDir, file);
          const stats = await fs.promises.stat(filePath);

          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            age: Date.now() - stats.mtime.getTime(),
            ageDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
            isCompressed: file.endsWith('.gz'),
            agentId: LogRetentionManager.extractAgentId(file),
          };
        });

      logFiles.push(...(await Promise.all(logFilePromises)));

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => b.modified - a.modified);

      return logFiles;
    } catch (error) {
      logger.error('Failed to scan log files', {
        error: error.message,
        logsDir: this.logsDir,
      });
      throw error;
    }
  }

  /**
   * Extract agent ID from log filename
   * @param {string} filename - Log filename
   * @returns {string|null} Agent ID or null if not found
   */
  static extractAgentId(filename) {
    // Format: YYYY-MM-DD_agent-id_sanitized-prompt.log(.gz)
    const match = filename.match(/^\d{4}-\d{2}-\d{2}_([^_]+)_/);
    return match ? match[1] : null;
  }

  /**
   * Update list of active agents to prevent deletion
   * @returns {Promise<void>}
   */
  async updateActiveAgents() {
    // This would integrate with AgentManager to get active agent IDs
    // For now, we'll implement a basic check
    this.activeAgents.clear();

    // TODO: Integrate with AgentManager to get actual active agents
    // For now, assume no agents are active during cleanup
    logger.debug('Updated active agents list', {
      activeCount: this.activeAgents.size,
    });
  }

  /**
   * Check if an agent is currently active
   * @param {string} agentId - Agent ID to check
   * @returns {boolean} True if agent is active
   */
  isAgentActive(agentId) {
    return this.activeAgents.has(agentId);
  }

  /**
   * Compress logs older than specified days
   * @param {number} ageDays - Age threshold in days
   * @param {boolean} dryRun - If true, don't actually compress
   * @returns {Promise<Object>} Compression results
   */
  async compressOldLogs(ageDays = 7, dryRun = false) {
    const results = {
      filesCompressed: 0,
      actions: [],
    };

    try {
      const logFiles = await this.scanLogFiles();
      const filesToCompress = logFiles.filter((file) => !file.isCompressed
        && file.ageDays >= ageDays
        && !this.isAgentActive(file.agentId));

      const compressionPromises = filesToCompress.map(async (file) => {
        try {
          const action = {
            type: 'compress',
            file: file.name,
            originalSize: file.size,
            timestamp: new Date().toISOString(),
          };

          if (!dryRun) {
            await LogRetentionManager.compressFile(file.path);
            const compressedStats = await fs.promises.stat(`${file.path}.gz`);
            action.compressedSize = compressedStats.size;
            action.compressionRatio = (1 - compressedStats.size / file.size) * 100;
          } else {
            action.compressedSize = Math.floor(file.size * 0.3); // Estimate 70% compression
            action.compressionRatio = 70;
          }

          results.actions.push(action);
          results.filesCompressed += 1;
          return action;
        } catch (error) {
          logger.error('Failed to compress file', {
            file: file.name,
            error: error.message,
          });
          const errorAction = {
            type: 'compress_error',
            file: file.name,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
          results.actions.push(errorAction);
          return errorAction;
        }
      });

      await Promise.all(compressionPromises);

      return results;
    } catch (error) {
      logger.error('Failed to compress old logs', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compress a single file using gzip
   * @param {string} filePath - Path to file to compress
   * @returns {Promise<void>}
   */
  static async compressFile(filePath) {
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(filePath);
    const destination = fs.createWriteStream(`${filePath}.gz`);

    return new Promise((resolve, reject) => {
      source
        .pipe(gzip)
        .pipe(destination)
        .on('finish', async () => {
          try {
            // Verify compressed file integrity
            await LogRetentionManager.verifyCompressedFile(`${filePath}.gz`);

            // Delete original file after successful compression
            await fs.promises.unlink(filePath);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Verify compressed file integrity
   * @param {string} compressedPath - Path to compressed file
   * @returns {Promise<void>}
   */
  static async verifyCompressedFile(compressedPath) {
    return new Promise((resolve, reject) => {
      const gunzip = zlib.createGunzip();
      const source = fs.createReadStream(compressedPath);
      let hasData = false;

      source
        .pipe(gunzip)
        .on('data', () => {
          hasData = true;
        })
        .on('end', () => {
          if (hasData) {
            resolve();
          } else {
            reject(new Error('Compressed file appears to be empty'));
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Apply retention policies to delete old logs
   * @param {Array} logFiles - Array of log file metadata
   * @param {boolean} dryRun - If true, don't actually delete
   * @returns {Promise<Object>} Cleanup results
   */
  async applyRetentionPolicies(logFiles, dryRun = false) {
    const results = {
      filesDeleted: 0,
      spaceSavedMB: 0,
      actions: [],
    };

    // Apply age-based retention
    const ageResults = await this.applyAgeRetention(logFiles, dryRun);
    results.filesDeleted += ageResults.filesDeleted;
    results.spaceSavedMB += ageResults.spaceSavedMB;
    results.actions.push(...ageResults.actions);

    // Apply count-based retention
    const countResults = await this.applyCountRetention(logFiles, dryRun);
    results.filesDeleted += countResults.filesDeleted;
    results.spaceSavedMB += countResults.spaceSavedMB;
    results.actions.push(...countResults.actions);

    // Apply size-based retention
    const sizeResults = await this.applySizeRetention(logFiles, dryRun);
    results.filesDeleted += sizeResults.filesDeleted;
    results.spaceSavedMB += sizeResults.spaceSavedMB;
    results.actions.push(...sizeResults.actions);

    return results;
  }

  /**
   * Apply age-based retention policy
   * @param {Array} logFiles - Log files metadata
   * @param {boolean} dryRun - Preview mode
   * @returns {Promise<Object>} Deletion results
   */
  async applyAgeRetention(logFiles, dryRun = false) {
    const results = {
      filesDeleted: 0,
      spaceSavedMB: 0,
      actions: [],
    };

    const maxAge = this.retentionConfig.maxAgeDays;
    const filesToDelete = logFiles.filter((file) => file.ageDays > maxAge
      && !this.isAgentActive(file.agentId));

    const deletePromises = filesToDelete.map(async (file) => {
      try {
        const action = {
          type: 'delete_age',
          file: file.name,
          ageDays: file.ageDays,
          maxAge,
          size: file.size,
          timestamp: new Date().toISOString(),
        };

        if (!dryRun) {
          await fs.promises.unlink(file.path);
        }

        results.filesDeleted += 1;
        results.spaceSavedMB += file.size / (1024 * 1024);
        results.actions.push(action);
        return action;
      } catch (error) {
        logger.error('Failed to delete file by age', {
          file: file.name,
          error: error.message,
        });
        const errorAction = {
          type: 'delete_error',
          file: file.name,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        results.actions.push(errorAction);
        return errorAction;
      }
    });

    await Promise.all(deletePromises);

    return results;
  }

  /**
   * Apply count-based retention policy
   * @param {Array} logFiles - Log files metadata
   * @param {boolean} dryRun - Preview mode
   * @returns {Promise<Object>} Deletion results
   */
  async applyCountRetention(logFiles, dryRun = false) {
    const results = {
      filesDeleted: 0,
      spaceSavedMB: 0,
      actions: [],
    };

    const maxCount = this.retentionConfig.maxLogCount;
    if (logFiles.length <= maxCount) {
      return results; // No files to delete
    }

    // Keep newest files, delete oldest
    const filesToDelete = logFiles
      .slice(maxCount)
      .filter((file) => !this.isAgentActive(file.agentId));

    const deletePromises = filesToDelete.map(async (file) => {
      try {
        const action = {
          type: 'delete_count',
          file: file.name,
          totalFiles: logFiles.length,
          maxCount,
          size: file.size,
          timestamp: new Date().toISOString(),
        };

        if (!dryRun) {
          await fs.promises.unlink(file.path);
        }

        results.filesDeleted += 1;
        results.spaceSavedMB += file.size / (1024 * 1024);
        results.actions.push(action);
        return action;
      } catch (error) {
        logger.error('Failed to delete file by count', {
          file: file.name,
          error: error.message,
        });
        const errorAction = {
          type: 'delete_error',
          file: file.name,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        results.actions.push(errorAction);
        return errorAction;
      }
    });

    await Promise.all(deletePromises);

    return results;
  }

  /**
   * Apply size-based retention policy
   * @param {Array} logFiles - Log files metadata
   * @param {boolean} dryRun - Preview mode
   * @returns {Promise<Object>} Deletion results
   */
  async applySizeRetention(logFiles, dryRun = false) {
    const results = {
      filesDeleted: 0,
      spaceSavedMB: 0,
      actions: [],
    };

    const maxSizeBytes = this.retentionConfig.maxDirectorySizeMB * 1024 * 1024;
    const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalSize <= maxSizeBytes) {
      return results; // Directory size is within limits
    }

    const excessSize = totalSize - maxSizeBytes;
    let deletedSize = 0;

    // Delete oldest files first until we're under the size limit
    const sortedFiles = [...logFiles].sort((a, b) => a.modified - b.modified);

    // Process files sequentially until size limit is reached
    for (let i = 0; i < sortedFiles.length && deletedSize < excessSize; i += 1) {
      const file = sortedFiles[i];

      if (this.isAgentActive(file.agentId)) {
        // eslint-disable-next-line no-continue
        continue; // Skip active agent logs
      }

      try {
        const action = {
          type: 'delete_size',
          file: file.name,
          fileSize: file.size,
          totalSize,
          maxSizeMB: this.retentionConfig.maxDirectorySizeMB,
          timestamp: new Date().toISOString(),
        };

        if (!dryRun) {
          // eslint-disable-next-line no-await-in-loop
          await fs.promises.unlink(file.path);
        }

        deletedSize += file.size;
        results.filesDeleted += 1;
        results.spaceSavedMB += file.size / (1024 * 1024);
        results.actions.push(action);
      } catch (error) {
        logger.error('Failed to delete file by size', {
          file: file.name,
          error: error.message,
        });
        results.actions.push({
          type: 'delete_error',
          file: file.name,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Get retention statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getRetentionStats() {
    try {
      const logFiles = await this.scanLogFiles();
      const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
      const compressedFiles = logFiles.filter((file) => file.isCompressed);
      const uncompressedFiles = logFiles.filter((file) => !file.isCompressed);

      const stats = {
        timestamp: new Date().toISOString(),
        totalFiles: logFiles.length,
        totalSizeMB: totalSize / (1024 * 1024),
        compressedFiles: compressedFiles.length,
        uncompressedFiles: uncompressedFiles.length,
        averageAgeDays: logFiles.length > 0
          ? logFiles.reduce((sum, file) => sum + file.ageDays, 0) / logFiles.length
          : 0,
        oldestLogDays: logFiles.length > 0
          ? Math.max(...logFiles.map((file) => file.ageDays))
          : 0,
        newestLogDays: logFiles.length > 0
          ? Math.min(...logFiles.map((file) => file.ageDays))
          : 0,
        compressionRatio: compressedFiles.length > 0
          ? (compressedFiles.reduce((sum, file) => sum + file.size, 0)
             / (compressedFiles.length * 1024)) // Estimated original size
          : 0,
        config: this.retentionConfig,
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get retention stats', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Schedule automatic cleanup
   * @param {number} intervalHours - Cleanup interval in hours
   */
  scheduleCleanup(intervalHours = 24) {
    if (this.scheduler) {
      clearInterval(this.scheduler);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    this.scheduler = setInterval(async () => {
      try {
        logger.info('Running scheduled log retention cleanup');
        const report = await this.performCleanup();
        logger.info('Scheduled cleanup completed', {
          summary: report.summary,
        });
      } catch (error) {
        logger.error('Scheduled cleanup failed', {
          error: error.message,
        });
      }
    }, intervalMs);

    logger.info('Log retention cleanup scheduled', {
      intervalHours,
      nextRun: new Date(Date.now() + intervalMs).toISOString(),
    });
  }

  /**
   * Generate detailed cleanup report
   * @param {Array} actions - Array of cleanup actions
   * @returns {Object} Formatted report
   */
  static generateCleanupReport(actions) {
    const report = {
      timestamp: new Date().toISOString(),
      totalActions: actions.length,
      actionsByType: {},
      summary: {
        filesProcessed: 0,
        totalSpaceSaved: 0,
        errors: 0,
      },
    };

    actions.forEach((action) => {
      // Count actions by type
      if (!report.actionsByType[action.type]) {
        report.actionsByType[action.type] = 0;
      }
      report.actionsByType[action.type] += 1;

      // Update summary
      report.summary.filesProcessed += 1;
      if (action.size) {
        report.summary.totalSpaceSaved += action.size;
      }
      if (action.error) {
        report.summary.errors += 1;
      }
    });

    report.summary.totalSpaceSavedMB = report.summary.totalSpaceSaved / (1024 * 1024);

    return report;
  }

  /**
   * Shutdown the retention manager
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }

    logger.info('LogRetentionManager shutdown completed');
  }

  // Instance method wrappers for static methods (needed for tests)
  getDefaultConfig() {
    return LogRetentionManager.getDefaultConfig();
  }

  extractAgentId(filename) {
    return LogRetentionManager.extractAgentId(filename);
  }

  async compressFile(filePath) {
    return LogRetentionManager.compressFile(filePath);
  }

  async verifyCompressedFile(compressedPath) {
    return LogRetentionManager.verifyCompressedFile(compressedPath);
  }

  generateCleanupReport(actions) {
    return LogRetentionManager.generateCleanupReport(actions);
  }
}

module.exports = LogRetentionManager;
