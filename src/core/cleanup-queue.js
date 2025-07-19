const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Worktree Cleanup Queue System
 * Handles background cleanup of orphaned worktrees with prioritization and retry logic
 */
class WorktreeCleanupQueue {
  constructor(options = {}) {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = options.maxConcurrent || 2;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.maxRetryDelayMs = options.maxRetryDelayMs || 30000;
    this.progressCallbacks = new Set();
    this.metrics = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      currentlyProcessing: 0
    };
  }

  /**
   * Enqueue worktree for cleanup with priority
   */
  async enqueue(worktreePath, options = {}) {
    const queueItem = {
      id: this.generateCleanupId(),
      worktreePath,
      agentId: options.agentId,
      priority: options.priority || this.calculatePriority(options),
      force: options.force || false,
      preserveBranch: options.preserveBranch || false,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: options.maxAttempts || this.retryAttempts,
      lastError: null,
      status: 'queued'
    };

    // Insert based on priority (higher numbers = higher priority)
    const insertIndex = this.queue.findIndex(item => item.priority < queueItem.priority);
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    this.metrics.totalEnqueued++;
    
    logger.info('Worktree enqueued for cleanup', {
      id: queueItem.id,
      worktreePath: queueItem.worktreePath,
      priority: queueItem.priority,
      queueLength: this.queue.length
    });

    this.notifyProgress();

    // Start processing if not already running
    if (!this.processing) {
      setImmediate(() => this.processQueue());
    }

    return queueItem.id;
  }

  /**
   * Process cleanup queue with concurrent limiting
   */
  async processQueue() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    logger.debug('Starting cleanup queue processing');

    try {
      while (this.queue.length > 0 && this.metrics.currentlyProcessing < this.maxConcurrent) {
        const batch = this.queue.splice(0, this.maxConcurrent - this.metrics.currentlyProcessing);
        
        if (batch.length > 0) {
          // Process batch concurrently
          const promises = batch.map(item => this.processCleanupItem(item));
          await Promise.allSettled(promises);
        }
      }
    } catch (error) {
      logger.error('Error in cleanup queue processing', { error: error.message });
    } finally {
      this.processing = false;
      
      // Continue processing if there are more items
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      } else {
        logger.debug('Cleanup queue processing completed');
        this.notifyProgress();
      }
    }
  }

  /**
   * Process individual cleanup item with retry logic
   */
  async processCleanupItem(item) {
    this.metrics.currentlyProcessing++;
    item.status = 'processing';
    item.attempts++;

    logger.debug('Processing cleanup item', {
      id: item.id,
      worktreePath: item.worktreePath,
      attempt: item.attempts,
      maxAttempts: item.maxAttempts
    });

    try {
      await this.cleanupWorktree(item);
      
      item.status = 'completed';
      this.metrics.totalSuccessful++;
      this.metrics.totalProcessed++;
      
      logger.info('Worktree cleanup successful', {
        id: item.id,
        worktreePath: item.worktreePath,
        attempts: item.attempts
      });

    } catch (error) {
      item.lastError = error.message;
      item.status = 'failed';
      
      logger.warn('Worktree cleanup failed', {
        id: item.id,
        worktreePath: item.worktreePath,
        attempt: item.attempts,
        maxAttempts: item.maxAttempts,
        error: error.message
      });

      // Retry logic with exponential backoff
      if (item.attempts < item.maxAttempts) {
        const delay = Math.min(
          this.retryDelayMs * Math.pow(2, item.attempts - 1),
          this.maxRetryDelayMs
        );
        
        item.status = 'retry-scheduled';
        
        logger.debug('Scheduling cleanup retry', {
          id: item.id,
          delay,
          nextAttempt: item.attempts + 1
        });

        setTimeout(() => {
          // Re-enqueue with higher priority
          item.priority += 10;
          item.status = 'queued';
          this.queue.unshift(item);
          
          if (!this.processing) {
            setImmediate(() => this.processQueue());
          }
        }, delay);
      } else {
        this.metrics.totalFailed++;
        this.metrics.totalProcessed++;
        
        logger.error('Worktree cleanup failed permanently', {
          id: item.id,
          worktreePath: item.worktreePath,
          totalAttempts: item.attempts,
          lastError: item.lastError
        });
      }
    } finally {
      this.metrics.currentlyProcessing--;
      this.notifyProgress();
    }
  }

  /**
   * Perform actual worktree cleanup
   */
  async cleanupWorktree(item) {
    const { worktreePath, force, preserveBranch } = item;

    // Validate worktree exists
    const exists = await fs.access(worktreePath).then(() => true).catch(() => false);
    if (!exists) {
      logger.debug('Worktree already removed', { worktreePath });
      return;
    }

    // Check for uncommitted changes if not forcing
    if (!force) {
      const hasUncommittedChanges = await this.checkUncommittedChanges(worktreePath);
      if (hasUncommittedChanges) {
        throw new Error(`Worktree has uncommitted changes: ${worktreePath}`);
      }
    }

    // Preserve branch if requested
    if (preserveBranch) {
      await this.preserveBranchChanges(worktreePath);
    }

    // Remove git worktree
    try {
      const command = force 
        ? `git worktree remove "${worktreePath}" --force`
        : `git worktree remove "${worktreePath}"`;
        
      await execAsync(command, {
        cwd: process.cwd(),
        timeout: 30000
      });
      
      logger.debug('Git worktree removed successfully', { worktreePath });
    } catch (gitError) {
      logger.warn('Git worktree removal failed, attempting manual cleanup', {
        worktreePath,
        error: gitError.message
      });

      // Manual filesystem cleanup as fallback
      await fs.rm(worktreePath, { recursive: true, force: true });
      logger.debug('Manual worktree cleanup completed', { worktreePath });
    }

    // Verify cleanup was successful
    const stillExists = await fs.access(worktreePath).then(() => true).catch(() => false);
    if (stillExists) {
      throw new Error(`Worktree cleanup verification failed: ${worktreePath}`);
    }
  }

  /**
   * Check for uncommitted changes in worktree
   */
  async checkUncommittedChanges(worktreePath) {
    try {
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: worktreePath,
        timeout: 5000
      });
      
      return stdout.trim().length > 0;
    } catch (error) {
      logger.debug('Failed to check git status', { 
        worktreePath, 
        error: error.message 
      });
      // Assume no changes if we can't check
      return false;
    }
  }

  /**
   * Preserve branch changes before cleanup
   */
  async preserveBranchChanges(worktreePath) {
    try {
      // Create a commit with any uncommitted changes
      await execAsync('git add .', { cwd: worktreePath, timeout: 10000 });
      
      const { stdout: statusOutput } = await execAsync('git status --porcelain', {
        cwd: worktreePath,
        timeout: 5000
      });
      
      if (statusOutput.trim()) {
        const timestamp = new Date().toISOString();
        await execAsync(`git commit -m "Auto-save before worktree cleanup - ${timestamp}"`, {
          cwd: worktreePath,
          timeout: 10000
        });
        
        logger.info('Branch changes preserved before cleanup', { worktreePath });
      }
    } catch (error) {
      logger.warn('Failed to preserve branch changes', {
        worktreePath,
        error: error.message
      });
      // Don't fail cleanup if preservation fails
    }
  }

  /**
   * Calculate cleanup priority based on options
   */
  calculatePriority(options) {
    let priority = 0;
    
    // Higher priority for older worktrees
    if (options.age) {
      priority += Math.min(Math.floor(options.age / (24 * 60 * 60 * 1000)), 10);
    }
    
    // Higher priority for larger worktrees
    if (options.size) {
      priority += Math.min(Math.floor(options.size / (100 * 1024 * 1024)), 5);
    }
    
    // Higher priority for force cleanup
    if (options.force) {
      priority += 20;
    }
    
    // Higher priority for orphaned worktrees
    if (options.orphaned) {
      priority += 15;
    }
    
    // Higher priority for explicit cleanup requests
    if (options.explicit) {
      priority += 50;
    }
    
    return priority;
  }

  /**
   * Generate unique cleanup ID
   */
  generateCleanupId() {
    return `cleanup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add progress callback
   */
  onProgress(callback) {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Notify progress callbacks
   */
  notifyProgress() {
    const progress = {
      queueLength: this.queue.length,
      processing: this.processing,
      currentlyProcessing: this.metrics.currentlyProcessing,
      metrics: { ...this.metrics }
    };

    for (const callback of this.progressCallbacks) {
      try {
        callback(progress);
      } catch (error) {
        logger.warn('Progress callback error', { error: error.message });
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentlyProcessing: this.metrics.currentlyProcessing,
      metrics: { ...this.metrics },
      queue: this.queue.map(item => ({
        id: item.id,
        worktreePath: item.worktreePath,
        status: item.status,
        priority: item.priority,
        attempts: item.attempts,
        timestamp: item.timestamp
      }))
    };
  }

  /**
   * Clear all queued items
   */
  clear() {
    const clearedCount = this.queue.length;
    this.queue = [];
    
    logger.info('Cleanup queue cleared', { clearedCount });
    this.notifyProgress();
    
    return clearedCount;
  }

  /**
   * Force cleanup of specific worktree (high priority)
   */
  async forceCleanup(worktreePath, options = {}) {
    return this.enqueue(worktreePath, {
      ...options,
      force: true,
      priority: 100,
      explicit: true
    });
  }

  /**
   * Shutdown cleanup queue gracefully
   */
  async shutdown() {
    logger.info('Shutting down cleanup queue', {
      queueLength: this.queue.length,
      processing: this.processing
    });

    // Wait for current processing to complete
    const maxWaitMs = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.processing && (Date.now() - startTime) < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear remaining queue
    this.clear();
    this.progressCallbacks.clear();
    
    logger.info('Cleanup queue shutdown completed');
  }
}

module.exports = WorktreeCleanupQueue;