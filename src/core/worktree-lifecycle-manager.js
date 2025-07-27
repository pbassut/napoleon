const path = require('path');
const os = require('os');
const WorktreeDiscovery = require('./worktree-discovery');
const WorktreeCleanupQueue = require('./cleanup-queue');
const logger = require('../utils/logger');
const { loadConfig } = require('./config');

/**
 * Worktree Lifecycle Manager
 * Central coordinator for worktree discovery, recovery, and cleanup operations
 */
class WorktreeLifecycleManager {
  constructor(options = {}) {
    this.worktreesDir = options.worktreesDir || path.join(os.homedir(), '.napoleon', 'worktrees');
    this.discovery = new WorktreeDiscovery(this.worktreesDir);
    this.cleanupQueue = new WorktreeCleanupQueue({
      maxConcurrent: options.maxConcurrentCleanups || 2,
      retryAttempts: options.retryAttempts || 3,
    });

    this.activeAgents = new Map(); // Track active agent sessions
    this.recoveredWorktrees = new Map(); // Track recovered worktrees
    this.metrics = {
      startupTime: null,
      discoveredWorktrees: 0,
      recoveredWorktrees: 0,
      cleanedUpWorktrees: 0,
      validationErrors: 0,
    };

    // Bind cleanup queue progress monitoring
    this.cleanupQueue.onProgress(this.handleCleanupProgress.bind(this));
  }

  /**
   * Initialize worktree lifecycle management on startup
   */
  async initialize() {
    const startTime = Date.now();
    logger.info('Initializing worktree lifecycle management');

    try {
      // Step 1: Quick validation only (avoid heavy discovery)
      const validationResult = await this.discovery.validateWorktreeState();
      if (!validationResult.valid) {
        this.metrics.validationErrors++;
        logger.warn('Worktree state validation issues detected', validationResult);
      }

      // Fast initialization complete - do heavy work in background
      logger.info('Worktree lifecycle manager initialized (background discovery started)');

      // Start background discovery without blocking
      this.backgroundDiscovery().catch((error) => {
        logger.error('Background worktree discovery failed', { error: error.message });
      });

      this.metrics.startupTime = Date.now() - startTime;

      logger.info('Worktree lifecycle management initialized successfully', {
        startupTimeMs: this.metrics.startupTime,
        metrics: this.metrics,
      });

      return {
        success: true,
        metrics: this.metrics,
      };
    } catch (error) {
      logger.error('Failed to initialize worktree lifecycle management', {
        error: error.message,
        startupTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Perform heavy worktree discovery operations in background
   */
  async backgroundDiscovery() {
    try {
      logger.info('Starting background worktree discovery');

      // Step 2: Discover existing worktrees (heavy operation)
      const discoveryResult = await this.discovery.discoverWorktrees();
      this.metrics.discoveredWorktrees = discoveryResult.total;

      logger.info('Background worktree discovery completed', {
        total: discoveryResult.total,
        active: discoveryResult.active.length,
        orphaned: discoveryResult.orphaned.length,
      });

      // Step 3: Handle orphaned worktrees
      if (discoveryResult.orphaned.length > 0) {
        await this.handleOrphanedWorktrees(discoveryResult.orphaned);
      }

      // Step 4: Resume active worktrees (if any agents are supposed to be running)
      if (discoveryResult.active.length > 0) {
        await this.handleActiveWorktrees(discoveryResult.active);
      }

      logger.info('Background worktree discovery fully completed');
    } catch (error) {
      logger.error('Background worktree discovery failed', {
        error: error.message,
        stack: error.stack,
      });
      this.metrics.discoveryErrors++;
    }
  }

  /**
   * Handle orphaned worktrees discovered on startup
   */
  async handleOrphanedWorktrees(orphanedWorktrees) {
    // Check if autoCleanup is enabled before processing orphaned worktrees
    const config = loadConfig();
    if (!config.features.autoCleanup) {
      logger.debug('Orphaned worktree cleanup disabled by configuration', {
        count: orphanedWorktrees.length,
      });
      return;
    }

    logger.info('Processing orphaned worktrees', { count: orphanedWorktrees.length });

    // eslint-disable-next-line no-restricted-syntax
    for (const worktree of orphanedWorktrees) {
      try {
        // Calculate age and size for priority
        const age = Date.now() - new Date(worktree.createdAt).getTime();
        const cleanupOptions = {
          agentId: worktree.agentId,
          age,
          size: worktree.size,
          orphaned: true,
          priority: this.calculateOrphanedPriority(worktree),
        };

        // eslint-disable-next-line no-await-in-loop
        const cleanupId = await this.cleanupQueue.enqueue(worktree.path, cleanupOptions);

        logger.debug('Orphaned worktree enqueued for cleanup', {
          worktree: worktree.name,
          agentId: worktree.agentId,
          cleanupId,
          age: `${Math.round(age / (1000 * 60))} minutes`,
        });
      } catch (error) {
        logger.error('Failed to enqueue orphaned worktree for cleanup', {
          worktree: worktree.name,
          error: error.message,
        });
      }
    }
  }

  /**
   * Handle active worktrees that might need resumption
   */
  async handleActiveWorktrees(activeWorktrees) {
    logger.info('Processing potentially active worktrees', { count: activeWorktrees.length });

    activeWorktrees.forEach((worktree) => {
      try {
        // For now, we'll just track these as potentially recoverable
        // The actual agent resumption would be handled by AgentManager
        this.recoveredWorktrees.set(worktree.agentId, {
          worktree,
          recoveredAt: new Date().toISOString(),
          status: 'available-for-resume',
        });

        this.metrics.recoveredWorktrees++;

        logger.debug('Worktree marked as available for agent resume', {
          agentId: worktree.agentId,
          worktreePath: worktree.path,
        });
      } catch (error) {
        logger.error('Failed to process active worktree', {
          worktree: worktree.name,
          error: error.message,
        });
      }
    });
  }

  /**
   * Register an active agent session
   */
  registerActiveAgent(agentId, agentSession) {
    this.activeAgents.set(agentId, {
      session: agentSession,
      registeredAt: new Date().toISOString(),
    });

    // Remove from recovered worktrees if it was there
    if (this.recoveredWorktrees.has(agentId)) {
      logger.debug('Agent session resumed for recovered worktree', { agentId });
      this.recoveredWorktrees.delete(agentId);
    }

    logger.debug('Active agent registered', { agentId });
  }

  /**
   * Unregister an agent session and optionally cleanup its worktree
   */
  async unregisterAgent(agentId, options = {}) {
    const agentInfo = this.activeAgents.get(agentId);
    if (!agentInfo) {
      logger.warn('Attempted to unregister unknown agent', { agentId });
      return;
    }

    this.activeAgents.delete(agentId);

    const { session } = agentInfo;
    if (session && session.worktreePath) {
      logger.debug('CLEANUP_PATH: unregisterAgent called', {
        agentId,
        worktreePath: session.worktreePath,
        force: options.force,
      });

      // Check autoCleanup configuration before queuing cleanup
      const config = loadConfig();
      if (!config.features.autoCleanup && !options.force) {
        logger.debug('Agent worktree cleanup disabled by configuration', {
          agentId,
          worktreePath: session.worktreePath,
        });
        logger.debug('Agent unregistered', { agentId });
        return Promise.resolve();
      }

      // Queue worktree for cleanup
      const cleanupOptions = {
        agentId,
        explicit: true,
        force: options.force || false,
        preserveBranch: options.preserveBranch || false,
        priority: 50, // High priority for explicit cleanup
      };

      try {
        const cleanupId = await this.cleanupQueue.enqueue(session.worktreePath, cleanupOptions);

        logger.info('Agent worktree queued for cleanup', {
          agentId,
          worktreePath: session.worktreePath,
          cleanupId,
        });

        return Promise.resolve(cleanupId);
      } catch (error) {
        logger.error('Failed to queue agent worktree for cleanup', {
          agentId,
          worktreePath: session.worktreePath,
          error: error.message,
        });
        throw error;
      }
    }

    logger.debug('Agent unregistered', { agentId });
  }

  /**
   * Force cleanup of a specific worktree
   */
  async forceCleanupWorktree(worktreePath, options = {}) {
    logger.debug('CLEANUP_PATH: forceCleanupWorktree called', {
      worktreePath,
      options,
    });

    const config = loadConfig();
    if (!config.features.autoCleanup) {
      logger.debug('Worktree force cleanup disabled by configuration', { worktreePath });
      return Promise.resolve();
    }
    return this.cleanupQueue.forceCleanup(worktreePath, options);
  }

  /**
   * Get recovered worktree for agent ID (if available)
   */
  getRecoveredWorktree(agentId) {
    return this.recoveredWorktrees.get(agentId);
  }

  /**
   * Check if agent has a recovered worktree available
   */
  hasRecoveredWorktree(agentId) {
    return this.recoveredWorktrees.has(agentId);
  }

  /**
   * Scan for newly orphaned worktrees (for background monitoring)
   */
  async scanForOrphans() {
    try {
      logger.debug('Scanning for newly orphaned worktrees');

      const discoveryResult = await this.discovery.discoverWorktrees();
      const newOrphans = discoveryResult.orphaned.filter((worktree) => {
        // Only consider worktrees that aren't already in cleanup queue
        const queueStatus = this.cleanupQueue.getStatus();
        return !queueStatus.queue.some((item) => item.worktreePath === worktree.path);
      });

      if (newOrphans.length > 0) {
        logger.info('Found newly orphaned worktrees', { count: newOrphans.length });
        await this.handleOrphanedWorktrees(newOrphans);
      }

      return {
        scanned: discoveryResult.total,
        newOrphans: newOrphans.length,
      };
    } catch (error) {
      logger.error('Failed to scan for orphaned worktrees', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate priority for orphaned worktree cleanup
   */
  calculateOrphanedPriority(worktree) {
    let priority = 10; // Base priority for orphaned worktrees

    // Older worktrees get higher priority
    const ageHours = (Date.now() - new Date(worktree.createdAt).getTime()) / (1000 * 60 * 60);
    priority += Math.min(Math.floor(ageHours), 48); // Max 48 points for age

    // Larger worktrees get higher priority
    const sizeMB = (worktree.size || 0) / (1024 * 1024);
    priority += Math.min(Math.floor(sizeMB / 50), 20); // Max 20 points for size

    return priority;
  }

  /**
   * Handle cleanup queue progress updates
   */
  handleCleanupProgress(progress) {
    // Update metrics
    this.metrics.cleanedUpWorktrees = progress.metrics.totalSuccessful;

    // Log significant progress
    if (progress.queueLength === 0 && progress.metrics.totalProcessed > 0) {
      logger.info('Cleanup queue processing completed', {
        totalProcessed: progress.metrics.totalProcessed,
        successful: progress.metrics.totalSuccessful,
        failed: progress.metrics.totalFailed,
      });
    }
  }

  /**
   * Get current lifecycle status
   */
  getStatus() {
    return {
      metrics: this.metrics,
      activeAgents: this.activeAgents.size,
      recoveredWorktrees: this.recoveredWorktrees.size,
      cleanupQueue: this.cleanupQueue.getStatus(),
      worktreesDir: this.worktreesDir,
    };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cleanupMetrics: this.cleanupQueue.getStatus().metrics,
    };
  }

  /**
   * Shutdown lifecycle manager
   */
  async shutdown() {
    logger.info('Shutting down worktree lifecycle manager');

    try {
      // Shutdown cleanup queue
      await this.cleanupQueue.shutdown();

      // Clear caches
      this.discovery.clearCache();
      this.activeAgents.clear();
      this.recoveredWorktrees.clear();

      logger.info('Worktree lifecycle manager shutdown completed');
    } catch (error) {
      logger.error('Error during worktree lifecycle manager shutdown', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = WorktreeLifecycleManager;
