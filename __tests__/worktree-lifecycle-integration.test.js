const WorktreeLifecycleManager = require('../src/core/worktree-lifecycle-manager');
const WorktreeDiscovery = require('../src/core/worktree-discovery');
const WorktreeCleanupQueue = require('../src/core/cleanup-queue');

jest.mock('../src/core/worktree-discovery');
jest.mock('../src/core/cleanup-queue');

describe('WorktreeLifecycleManager Integration', () => {
  let lifecycleManager;
  let mockDiscovery;
  let mockCleanupQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock WorktreeDiscovery
    mockDiscovery = {
      validateWorktreeState: jest.fn(),
      discoverWorktrees: jest.fn(),
      scanForOrphans: jest.fn(),
      clearCache: jest.fn()
    };
    WorktreeDiscovery.mockImplementation(() => mockDiscovery);

    // Mock WorktreeCleanupQueue
    mockCleanupQueue = {
      enqueue: jest.fn(),
      forceCleanup: jest.fn(),
      onProgress: jest.fn(),
      getStatus: jest.fn(),
      shutdown: jest.fn()
    };
    WorktreeCleanupQueue.mockImplementation(() => mockCleanupQueue);

    lifecycleManager = new WorktreeLifecycleManager({
      worktreesDir: '/test/.napoleon-worktrees',
      maxConcurrentCleanups: 2
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with valid worktree state', async () => {
      mockDiscovery.validateWorktreeState.mockResolvedValue({
        valid: true,
        inconsistencies: 0
      });
      
      mockDiscovery.discoverWorktrees.mockResolvedValue({
        total: 3,
        active: [
          { agentId: 'agent-active-1', path: '/worktrees/agent-active-1' }
        ],
        orphaned: [
          { agentId: 'agent-orphan-1', path: '/worktrees/agent-orphan-1' },
          { agentId: 'agent-orphan-2', path: '/worktrees/agent-orphan-2' }
        ]
      });

      mockCleanupQueue.enqueue.mockResolvedValue('cleanup-id-1');

      const result = await lifecycleManager.initialize();

      expect(result.success).toBe(true);
      expect(result.metrics.discoveredWorktrees).toBe(3);
      expect(result.metrics.recoveredWorktrees).toBe(1);
      
      expect(mockDiscovery.validateWorktreeState).toHaveBeenCalled();
      expect(mockDiscovery.discoverWorktrees).toHaveBeenCalled();
      expect(mockCleanupQueue.enqueue).toHaveBeenCalledTimes(2); // 2 orphaned worktrees
    });

    it('should handle worktree state validation issues', async () => {
      mockDiscovery.validateWorktreeState.mockResolvedValue({
        valid: false,
        inconsistencies: 2,
        repaired: true
      });
      
      mockDiscovery.discoverWorktrees.mockResolvedValue({
        total: 0,
        active: [],
        orphaned: []
      });

      const result = await lifecycleManager.initialize();

      expect(result.success).toBe(true);
      expect(result.metrics.validationErrors).toBe(1);
    });

    it('should handle initialization failures gracefully', async () => {
      mockDiscovery.validateWorktreeState.mockRejectedValue(
        new Error('Git repository validation failed')
      );

      await expect(lifecycleManager.initialize()).rejects.toThrow(
        'Git repository validation failed'
      );
    });
  });

  describe('orphaned worktree handling', () => {
    it('should enqueue orphaned worktrees with correct priority', async () => {
      const orphanedWorktrees = [
        {
          agentId: 'agent-old',
          path: '/worktrees/agent-old',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days old
          size: 100 * 1024 * 1024 // 100MB
        },
        {
          agentId: 'agent-recent',
          path: '/worktrees/agent-recent',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour old
          size: 50 * 1024 * 1024 // 50MB
        }
      ];

      mockCleanupQueue.enqueue.mockResolvedValue('cleanup-id');

      await lifecycleManager.handleOrphanedWorktrees(orphanedWorktrees);

      expect(mockCleanupQueue.enqueue).toHaveBeenCalledTimes(2);
      
      // Verify old worktree gets higher priority
      const firstCall = mockCleanupQueue.enqueue.mock.calls[0];
      const secondCall = mockCleanupQueue.enqueue.mock.calls[1];
      
      expect(firstCall[0]).toBe('/worktrees/agent-old');
      expect(firstCall[1].orphaned).toBe(true);
      expect(firstCall[1].priority).toBeGreaterThan(secondCall[1].priority);
    });

    it('should handle enqueue failures gracefully', async () => {
      const orphanedWorktrees = [
        { agentId: 'agent-1', path: '/worktrees/agent-1', createdAt: new Date(), size: 0 }
      ];

      mockCleanupQueue.enqueue.mockRejectedValue(new Error('Queue full'));

      // Should not throw
      await expect(lifecycleManager.handleOrphanedWorktrees(orphanedWorktrees))
        .resolves.not.toThrow();
    });
  });

  describe('active agent management', () => {
    it('should register and unregister agents correctly', async () => {
      const agentSession = {
        id: 'agent-123',
        worktreePath: '/worktrees/agent-123'
      };

      // Register agent
      lifecycleManager.registerActiveAgent('agent-123', agentSession);

      expect(lifecycleManager.activeAgents.size).toBe(1);
      expect(lifecycleManager.recoveredWorktrees.has('agent-123')).toBe(false);

      // Unregister agent
      mockCleanupQueue.enqueue.mockResolvedValue('cleanup-id-123');
      
      const cleanupId = await lifecycleManager.unregisterAgent('agent-123', {
        force: true,
        preserveBranch: false
      });

      expect(cleanupId).toBe('cleanup-id-123');
      expect(lifecycleManager.activeAgents.size).toBe(0);
      expect(mockCleanupQueue.enqueue).toHaveBeenCalledWith(
        '/worktrees/agent-123',
        expect.objectContaining({
          agentId: 'agent-123',
          explicit: true,
          force: true,
          preserveBranch: false,
          priority: 50
        })
      );
    });

    it('should handle unregistering unknown agent gracefully', async () => {
      const result = await lifecycleManager.unregisterAgent('unknown-agent');
      expect(result).toBeUndefined();
    });

    it('should handle agent with no worktree path', async () => {
      const agentSession = { id: 'agent-no-worktree' };
      
      lifecycleManager.registerActiveAgent('agent-no-worktree', agentSession);
      const result = await lifecycleManager.unregisterAgent('agent-no-worktree');

      expect(result).toBeUndefined();
      expect(mockCleanupQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('recovered worktree management', () => {
    it('should handle active worktrees for recovery', async () => {
      const activeWorktrees = [
        { agentId: 'agent-recoverable-1', path: '/worktrees/agent-recoverable-1' },
        { agentId: 'agent-recoverable-2', path: '/worktrees/agent-recoverable-2' }
      ];

      await lifecycleManager.handleActiveWorktrees(activeWorktrees);

      expect(lifecycleManager.recoveredWorktrees.size).toBe(2);
      expect(lifecycleManager.metrics.recoveredWorktrees).toBe(2);
      
      expect(lifecycleManager.hasRecoveredWorktree('agent-recoverable-1')).toBe(true);
      expect(lifecycleManager.getRecoveredWorktree('agent-recoverable-1')).toBeDefined();
    });

    it('should remove recovered worktree when agent is registered', () => {
      // Setup recovered worktree
      lifecycleManager.recoveredWorktrees.set('agent-123', {
        worktree: { path: '/worktrees/agent-123' },
        status: 'available-for-resume'
      });

      // Register agent (should remove from recovered)
      lifecycleManager.registerActiveAgent('agent-123', { id: 'agent-123' });

      expect(lifecycleManager.recoveredWorktrees.has('agent-123')).toBe(false);
    });
  });

  describe('background orphan scanning', () => {
    it('should scan for new orphans successfully', async () => {
      mockDiscovery.discoverWorktrees.mockResolvedValue({
        total: 2,
        active: [],
        orphaned: [
          { agentId: 'agent-new-orphan', path: '/worktrees/agent-new-orphan' }
        ]
      });

      mockCleanupQueue.getStatus.mockReturnValue({
        queue: [] // No items in cleanup queue
      });

      mockCleanupQueue.enqueue.mockResolvedValue('cleanup-id');

      const result = await lifecycleManager.scanForOrphans();

      expect(result.scanned).toBe(2);
      expect(result.newOrphans).toBe(1);
      expect(mockCleanupQueue.enqueue).toHaveBeenCalledWith(
        '/worktrees/agent-new-orphan',
        expect.objectContaining({ orphaned: true })
      );
    });

    it('should skip orphans already in cleanup queue', async () => {
      mockDiscovery.discoverWorktrees.mockResolvedValue({
        total: 1,
        active: [],
        orphaned: [
          { agentId: 'agent-already-queued', path: '/worktrees/agent-already-queued' }
        ]
      });

      mockCleanupQueue.getStatus.mockReturnValue({
        queue: [
          { worktreePath: '/worktrees/agent-already-queued' }
        ]
      });

      const result = await lifecycleManager.scanForOrphans();

      expect(result.newOrphans).toBe(0);
      expect(mockCleanupQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('cleanup progress handling', () => {
    it('should update metrics on cleanup progress', () => {
      const progressData = {
        queueLength: 2,
        metrics: {
          totalProcessed: 5,
          totalSuccessful: 4,
          totalFailed: 1
        }
      };

      lifecycleManager.handleCleanupProgress(progressData);

      expect(lifecycleManager.metrics.cleanedUpWorktrees).toBe(4);
    });
  });

  describe('status and metrics', () => {
    it('should return comprehensive status', () => {
      lifecycleManager.activeAgents.set('agent-1', { session: {} });
      lifecycleManager.recoveredWorktrees.set('agent-2', { worktree: {} });
      
      mockCleanupQueue.getStatus.mockReturnValue({
        queueLength: 3,
        processing: true
      });

      const status = lifecycleManager.getStatus();

      expect(status).toMatchObject({
        activeAgents: 1,
        recoveredWorktrees: 1,
        worktreesDir: '/test/.napoleon-worktrees',
        cleanupQueue: {
          queueLength: 3,
          processing: true
        }
      });
    });

    it('should return performance metrics', () => {
      lifecycleManager.metrics.startupTime = 1500;
      
      mockCleanupQueue.getStatus.mockReturnValue({
        metrics: { totalSuccessful: 10 }
      });

      const metrics = lifecycleManager.getMetrics();

      expect(metrics.startupTime).toBe(1500);
      expect(metrics.cleanupMetrics.totalSuccessful).toBe(10);
    });
  });

  describe('force cleanup', () => {
    it('should delegate force cleanup to cleanup queue', async () => {
      mockCleanupQueue.forceCleanup.mockResolvedValue('force-cleanup-id');

      const result = await lifecycleManager.forceCleanupWorktree('/test/worktree', {
        preserveBranch: true
      });

      expect(result).toBe('force-cleanup-id');
      expect(mockCleanupQueue.forceCleanup).toHaveBeenCalledWith('/test/worktree', {
        preserveBranch: true
      });
    });
  });

  describe('shutdown', () => {
    it('should shutdown all components gracefully', async () => {
      lifecycleManager.activeAgents.set('agent-1', {});
      lifecycleManager.recoveredWorktrees.set('agent-2', {});

      await lifecycleManager.shutdown();

      expect(mockCleanupQueue.shutdown).toHaveBeenCalled();
      expect(mockDiscovery.clearCache).toHaveBeenCalled();
      expect(lifecycleManager.activeAgents.size).toBe(0);
      expect(lifecycleManager.recoveredWorktrees.size).toBe(0);
    });

    it('should handle shutdown errors gracefully', async () => {
      mockCleanupQueue.shutdown.mockRejectedValue(new Error('Shutdown failed'));

      await expect(lifecycleManager.shutdown()).rejects.toThrow('Shutdown failed');
    });
  });

  describe('priority calculation', () => {
    it('should calculate priority correctly for different worktree characteristics', () => {
      const oldLargeWorktree = {
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day old
        size: 200 * 1024 * 1024 // 200MB
      };

      const recentSmallWorktree = {
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour old
        size: 10 * 1024 * 1024 // 10MB
      };

      const oldPriority = lifecycleManager.calculateOrphanedPriority(oldLargeWorktree);
      const recentPriority = lifecycleManager.calculateOrphanedPriority(recentSmallWorktree);

      expect(oldPriority).toBeGreaterThan(recentPriority);
      expect(oldPriority).toBeGreaterThan(10); // Base priority + age + size
      expect(recentPriority).toBeGreaterThanOrEqual(10); // At least base priority
    });
  });
});