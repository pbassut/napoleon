/**
 * Tests for WorktreeLifecycleManager
 * Comprehensive coverage for the worktree lifecycle management functionality
 */

// Mock all external dependencies
jest.mock('../../src/core/worktree-discovery');
jest.mock('../../src/core/cleanup-queue');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../src/core/config', () => ({
  loadConfig: jest.fn(() => ({
    features: {
      autoCleanup: true,
    },
  })),
}));

const WorktreeLifecycleManager = require('../../src/core/worktree-lifecycle-manager');
const WorktreeDiscovery = require('../../src/core/worktree-discovery');
const WorktreeCleanupQueue = require('../../src/core/cleanup-queue');
const logger = require('../../src/utils/logger');
const { loadConfig } = require('../../src/core/config');

describe('WorktreeLifecycleManager', () => {
  let manager;
  let mockDiscovery;
  let mockCleanupQueue;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock discovery
    mockDiscovery = {
      validateWorktreeState: jest.fn().mockResolvedValue({ valid: true }),
      discoverWorktrees: jest.fn().mockResolvedValue({
        total: 5,
        active: [],
        orphaned: [],
      }),
      clearCache: jest.fn(),
    };
    WorktreeDiscovery.mockImplementation(() => mockDiscovery);

    // Setup mock cleanup queue
    mockCleanupQueue = {
      enqueue: jest.fn().mockResolvedValue('cleanup-123'),
      forceCleanup: jest.fn().mockResolvedValue('cleanup-456'),
      getStatus: jest.fn().mockReturnValue({
        queue: [],
        metrics: {
          totalProcessed: 0,
          totalSuccessful: 0,
          totalFailed: 0,
        },
      }),
      onProgress: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(),
    };
    WorktreeCleanupQueue.mockImplementation(() => mockCleanupQueue);

    // Create manager instance
    manager = new WorktreeLifecycleManager();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(manager.worktreesDir).toContain('.napoleon/worktrees');
      expect(manager.activeAgents).toBeInstanceOf(Map);
      expect(manager.recoveredWorktrees).toBeInstanceOf(Map);
      expect(manager.metrics).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customManager = new WorktreeLifecycleManager({
        worktreesDir: '/custom/path',
        maxConcurrentCleanups: 5,
        retryAttempts: 2,
      });

      expect(customManager.worktreesDir).toBe('/custom/path');
    });

    it('should setup cleanup queue progress monitoring', () => {
      expect(mockCleanupQueue.onProgress).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid worktree state', async () => {
      const result = await manager.initialize();

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(mockDiscovery.validateWorktreeState).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Initializing worktree lifecycle management');
      expect(manager.metrics.startupTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle validation warnings', async () => {
      mockDiscovery.validateWorktreeState.mockResolvedValue({
        valid: false,
        issues: ['test issue'],
      });

      const result = await manager.initialize();

      expect(result.success).toBe(true);
      expect(manager.metrics.validationErrors).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        'Worktree state validation issues detected',
        expect.any(Object)
      );
    });

    it('should handle initialization errors', async () => {
      const testError = new Error('Initialization failed');
      mockDiscovery.validateWorktreeState.mockRejectedValue(testError);

      await expect(manager.initialize()).rejects.toThrow('Initialization failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize worktree lifecycle management',
        expect.objectContaining({
          error: 'Initialization failed',
        })
      );
    });
  });

  describe('backgroundDiscovery', () => {
    it('should complete background discovery successfully', async () => {
      mockDiscovery.discoverWorktrees.mockResolvedValue({
        total: 3,
        active: [{ agentId: 'agent1', path: '/path1' }],
        orphaned: [{ agentId: 'agent2', path: '/path2' }],
      });

      await manager.backgroundDiscovery();

      expect(mockDiscovery.discoverWorktrees).toHaveBeenCalled();
      expect(manager.metrics.discoveredWorktrees).toBe(3);
      expect(logger.info).toHaveBeenCalledWith('Background worktree discovery completed', {
        total: 3,
        active: 1,
        orphaned: 1,
      });
    });

    it('should handle discovery errors gracefully', async () => {
      const testError = new Error('Discovery failed');
      mockDiscovery.discoverWorktrees.mockRejectedValue(testError);

      await manager.backgroundDiscovery();

      expect(logger.error).toHaveBeenCalledWith(
        'Background worktree discovery failed',
        expect.objectContaining({
          error: 'Discovery failed',
        })
      );
    });
  });

  describe('handleOrphanedWorktrees', () => {
    const mockOrphanedWorktrees = [
      {
        name: 'orphan1',
        agentId: 'agent1',
        path: '/path1',
        createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        size: 1024 * 1024, // 1MB
      },
      {
        name: 'orphan2',
        agentId: 'agent2',
        path: '/path2',
        createdAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        size: 2 * 1024 * 1024, // 2MB
      },
    ];

    it('should process orphaned worktrees when autoCleanup is enabled', async () => {
      await manager.handleOrphanedWorktrees(mockOrphanedWorktrees);

      expect(mockCleanupQueue.enqueue).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('Processing orphaned worktrees', {
        count: 2,
      });
    });

    it('should skip orphaned worktrees when autoCleanup is disabled', async () => {
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: false,
        },
      });

      await manager.handleOrphanedWorktrees(mockOrphanedWorktrees);

      expect(mockCleanupQueue.enqueue).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Orphaned worktree cleanup disabled by configuration',
        { count: 2 }
      );
    });

    it('should calculate priority for orphaned worktrees when autoCleanup enabled', async () => {
      // Ensure autoCleanup is enabled so priority calculation happens
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: true,
        },
      });

      const spy = jest.spyOn(manager, 'calculateOrphanedPriority');

      await manager.handleOrphanedWorktrees([mockOrphanedWorktrees[0]]);

      expect(spy).toHaveBeenCalledWith(mockOrphanedWorktrees[0]);
      expect(spy).toHaveReturnedWith(expect.any(Number));
    });
  });

  describe('handleActiveWorktrees', () => {
    const mockActiveWorktrees = [
      {
        name: 'active1',
        agentId: 'agent1',
        path: '/path1',
      },
      {
        name: 'active2',
        agentId: 'agent2',
        path: '/path2',
      },
    ];

    it('should process active worktrees successfully', async () => {
      await manager.handleActiveWorktrees(mockActiveWorktrees);

      expect(manager.recoveredWorktrees.size).toBe(2);
      expect(manager.metrics.recoveredWorktrees).toBe(2);
      expect(logger.info).toHaveBeenCalledWith('Processing potentially active worktrees', {
        count: 2,
      });
    });

    it('should handle worktrees without agentId gracefully', async () => {
      const worktreeWithoutAgentId = {
        name: 'no-agent',
        path: '/path',
        // Missing agentId - should still not crash
      };

      // This should not throw an error
      await expect(
        manager.handleActiveWorktrees([worktreeWithoutAgentId])
      ).resolves.not.toThrow();
    });
  });

  describe('registerActiveAgent', () => {
    it('should register new active agent', () => {
      const mockSession = { worktreePath: '/path1' };

      manager.registerActiveAgent('agent1', mockSession);

      expect(manager.activeAgents.has('agent1')).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith('Active agent registered', {
        agentId: 'agent1',
      });
    });

    it('should handle agent resumption from recovered worktree', () => {
      // Setup recovered worktree
      manager.recoveredWorktrees.set('agent1', { test: 'data' });

      const mockSession = { worktreePath: '/path1' };
      manager.registerActiveAgent('agent1', mockSession);

      expect(manager.recoveredWorktrees.has('agent1')).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith(
        'Agent session resumed for recovered worktree',
        { agentId: 'agent1' }
      );
    });
  });

  describe('unregisterAgent', () => {
    beforeEach(() => {
      // Setup active agent
      manager.activeAgents.set('agent1', {
        session: { worktreePath: '/path1' },
        registeredAt: new Date().toISOString(),
      });
    });

    it('should unregister agent and queue cleanup when autoCleanup enabled', async () => {
      // Ensure autoCleanup is enabled
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: true,
        },
      });

      const result = await manager.unregisterAgent('agent1');

      expect(manager.activeAgents.has('agent1')).toBe(false);
      expect(mockCleanupQueue.enqueue).toHaveBeenCalledWith('/path1', {
        agentId: 'agent1',
        explicit: true,
        force: false,
        preserveBranch: false,
        priority: 50,
      });
      expect(result).toBe('cleanup-123');
    });

    it('should skip cleanup when autoCleanup disabled', async () => {
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: false,
        },
      });

      await manager.unregisterAgent('agent1');

      expect(manager.activeAgents.has('agent1')).toBe(false);
      expect(mockCleanupQueue.enqueue).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Agent worktree cleanup disabled by configuration',
        expect.any(Object)
      );
    });

    it('should force cleanup when force option is true', async () => {
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: false,
        },
      });

      await manager.unregisterAgent('agent1', { force: true });

      expect(mockCleanupQueue.enqueue).toHaveBeenCalled();
    });

    it('should handle unknown agent gracefully', async () => {
      await manager.unregisterAgent('unknown-agent');

      expect(logger.warn).toHaveBeenCalledWith('Attempted to unregister unknown agent', {
        agentId: 'unknown-agent',
      });
    });

    it('should handle cleanup errors', async () => {
      // Ensure autoCleanup is enabled so cleanup is attempted
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: true,
        },
      });
      
      mockCleanupQueue.enqueue.mockRejectedValue(new Error('Cleanup failed'));

      await expect(manager.unregisterAgent('agent1')).rejects.toThrow('Cleanup failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to queue agent worktree for cleanup',
        expect.any(Object)
      );
    });
  });

  describe('forceCleanupWorktree', () => {
    it('should force cleanup when autoCleanup enabled', async () => {
      // Ensure autoCleanup is enabled
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: true,
        },
      });

      const result = await manager.forceCleanupWorktree('/path1');

      expect(mockCleanupQueue.forceCleanup).toHaveBeenCalledWith('/path1', {});
      expect(result).toBe('cleanup-456');
    });

    it('should skip cleanup when autoCleanup disabled', async () => {
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: false,
        },
      });

      await manager.forceCleanupWorktree('/path1');

      expect(mockCleanupQueue.forceCleanup).not.toHaveBeenCalled();
    });

    it('should bypass autoCleanup check when requested', async () => {
      loadConfig.mockReturnValue({
        features: {
          autoCleanup: false,
        },
      });

      await manager.forceCleanupWorktree('/path1', { bypassAutoCleanupCheck: true });

      expect(mockCleanupQueue.forceCleanup).toHaveBeenCalledWith('/path1', {
        bypassAutoCleanupCheck: true,
      });
    });
  });

  describe('recovery methods', () => {
    beforeEach(() => {
      manager.recoveredWorktrees.set('agent1', { test: 'data' });
    });

    it('should get recovered worktree', () => {
      const result = manager.getRecoveredWorktree('agent1');

      expect(result).toEqual({ test: 'data' });
    });

    it('should check if agent has recovered worktree', () => {
      expect(manager.hasRecoveredWorktree('agent1')).toBe(true);
      expect(manager.hasRecoveredWorktree('unknown')).toBe(false);
    });
  });

  describe('scanForOrphans', () => {
    it('should scan and detect orphans correctly', async () => {
      // Setup mock discovery to return orphans
      mockDiscovery.discoverWorktrees.mockResolvedValue({
        total: 3,
        orphaned: [
          {
            name: 'new-orphan',
            agentId: 'agent1',
            path: '/new-path',
            createdAt: new Date().toISOString(),
            size: 1024,
          },
        ],
      });

      // Make sure the cleanup queue doesn't report this orphan as already queued
      mockCleanupQueue.getStatus.mockReturnValue({
        queue: [], // Empty queue so orphan is considered "new"
        metrics: {
          totalProcessed: 0,
          totalSuccessful: 0,
          totalFailed: 0,
        },
      });

      const result = await manager.scanForOrphans();

      expect(result.scanned).toBe(3);
      expect(result.newOrphans).toBe(1);
      expect(mockDiscovery.discoverWorktrees).toHaveBeenCalled();
    });

    it('should handle scan errors', async () => {
      mockDiscovery.discoverWorktrees.mockRejectedValue(new Error('Scan failed'));

      await expect(manager.scanForOrphans()).rejects.toThrow('Scan failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to scan for orphaned worktrees',
        { error: 'Scan failed' }
      );
    });
  });

  describe('calculateOrphanedPriority', () => {
    it('should calculate priority based on age and size', () => {
      const worktree = {
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        size: 100 * 1024 * 1024, // 100MB
      };

      const priority = manager.calculateOrphanedPriority(worktree);

      expect(priority).toBeGreaterThan(10); // Base priority + age + size
      expect(typeof priority).toBe('number');
    });

    it('should handle missing size gracefully', () => {
      const worktree = {
        createdAt: new Date().toISOString(),
        // No size property
      };

      const priority = manager.calculateOrphanedPriority(worktree);

      expect(typeof priority).toBe('number');
      expect(priority).toBeGreaterThanOrEqual(10);
    });
  });

  describe('handleCleanupProgress', () => {
    it('should update metrics on progress', () => {
      const progress = {
        queueLength: 2,
        metrics: {
          totalSuccessful: 5,
          totalProcessed: 7,
          totalFailed: 2,
        },
      };

      manager.handleCleanupProgress(progress);

      expect(manager.metrics.cleanedUpWorktrees).toBe(5);
    });

    it('should log completion when queue is empty', () => {
      const progress = {
        queueLength: 0,
        metrics: {
          totalSuccessful: 5,
          totalProcessed: 7,
          totalFailed: 2,
        },
      };

      manager.handleCleanupProgress(progress);

      expect(logger.info).toHaveBeenCalledWith('Cleanup queue processing completed', {
        totalProcessed: 7,
        successful: 5,
        failed: 2,
      });
    });
  });

  describe('status and metrics', () => {
    it('should return current status', () => {
      manager.activeAgents.set('agent1', {});
      manager.recoveredWorktrees.set('agent2', {});

      const status = manager.getStatus();

      expect(status.activeAgents).toBe(1);
      expect(status.recoveredWorktrees).toBe(1);
      expect(status.metrics).toBeDefined();
      expect(status.cleanupQueue).toBeDefined();
      expect(status.worktreesDir).toBeDefined();
    });

    it('should return performance metrics', () => {
      const metrics = manager.getMetrics();

      expect(metrics).toHaveProperty('startupTime');
      expect(metrics).toHaveProperty('discoveredWorktrees');
      expect(metrics).toHaveProperty('cleanupMetrics');
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      manager.activeAgents.set('agent1', {});
      manager.recoveredWorktrees.set('agent2', {});

      await manager.shutdown();

      expect(mockCleanupQueue.shutdown).toHaveBeenCalled();
      expect(mockDiscovery.clearCache).toHaveBeenCalled();
      expect(manager.activeAgents.size).toBe(0);
      expect(manager.recoveredWorktrees.size).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('Shutting down worktree lifecycle manager');
    });

    it('should handle shutdown errors', async () => {
      mockCleanupQueue.shutdown.mockRejectedValue(new Error('Shutdown failed'));

      await expect(manager.shutdown()).rejects.toThrow('Shutdown failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error during worktree lifecycle manager shutdown',
        { error: 'Shutdown failed' }
      );
    });
  });
});