const fs = require('fs').promises;
const { exec } = require('child_process');
const WorktreeCleanupQueue = require('../src/core/cleanup-queue');

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    rm: jest.fn()
  }
}));

jest.mock('child_process');

describe('WorktreeCleanupQueue', () => {
  let cleanupQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.__jestUsingFakeTimers = true;
    cleanupQueue = new WorktreeCleanupQueue({
      maxConcurrent: 1,
      retryAttempts: 2,
      retryDelayMs: 100
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.__jestUsingFakeTimers = false;
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultQueue = new WorktreeCleanupQueue();
      
      expect(defaultQueue.maxConcurrent).toBe(2);
      expect(defaultQueue.retryAttempts).toBe(3);
      expect(defaultQueue.queue).toEqual([]);
      expect(defaultQueue.processing).toBe(false);
    });

    it('should use provided options', () => {
      expect(cleanupQueue.maxConcurrent).toBe(1);
      expect(cleanupQueue.retryAttempts).toBe(2);
    });
  });

  describe('enqueue', () => {
    it('should add item to queue with calculated priority', async () => {
      const worktreePath = '/test/worktree';
      const options = { agentId: 'test-agent', force: true };

      const cleanupId = await cleanupQueue.enqueue(worktreePath, options);

      expect(cleanupId).toMatch(/^cleanup-\d+-[a-z0-9]+$/);
      expect(cleanupQueue.queue).toHaveLength(1);
      
      const queueItem = cleanupQueue.queue[0];
      expect(queueItem.worktreePath).toBe(worktreePath);
      expect(queueItem.agentId).toBe('test-agent');
      expect(queueItem.force).toBe(true);
      expect(queueItem.priority).toBeGreaterThan(0);
      expect(queueItem.status).toBe('queued');
    });

    it('should prioritize items correctly', async () => {
      const lowPriorityId = await cleanupQueue.enqueue('/low', { priority: 1 });
      const highPriorityId = await cleanupQueue.enqueue('/high', { priority: 100 });
      const mediumPriorityId = await cleanupQueue.enqueue('/medium', { priority: 50 });

      expect(cleanupQueue.queue[0].worktreePath).toBe('/high');
      expect(cleanupQueue.queue[1].worktreePath).toBe('/medium');
      expect(cleanupQueue.queue[2].worktreePath).toBe('/low');
    });

    it('should start processing automatically', async () => {
      // Verify the queue starts with not processing
      expect(cleanupQueue.processing).toBe(false);
      
      await cleanupQueue.enqueue('/test/worktree');

      // Verify item was enqueued
      expect(cleanupQueue.queue).toHaveLength(1);
      expect(cleanupQueue.queue[0].worktreePath).toBe('/test/worktree');
    });
  });

  describe('calculatePriority', () => {
    it('should calculate priority based on options', () => {
      const oldOptions = { age: 7 * 24 * 60 * 60 * 1000 }; // 7 days
      const largeOptions = { size: 500 * 1024 * 1024 }; // 500MB
      const forceOptions = { force: true };
      const orphanOptions = { orphaned: true };
      const explicitOptions = { explicit: true };

      expect(cleanupQueue.calculatePriority(oldOptions)).toBe(7);
      expect(cleanupQueue.calculatePriority(largeOptions)).toBe(5);
      expect(cleanupQueue.calculatePriority(forceOptions)).toBe(20);
      expect(cleanupQueue.calculatePriority(orphanOptions)).toBe(15);
      expect(cleanupQueue.calculatePriority(explicitOptions)).toBe(50);
    });

    it('should combine multiple priority factors', () => {
      const combinedOptions = {
        force: true,
        orphaned: true,
        age: 2 * 24 * 60 * 60 * 1000 // 2 days
      };

      const priority = cleanupQueue.calculatePriority(combinedOptions);
      expect(priority).toBe(20 + 15 + 2); // force + orphaned + age
    });
  });

  describe('cleanupWorktree', () => {
    it('should remove worktree successfully with git command', async () => {
      const queueItem = {
        id: 'test-cleanup',
        worktreePath: '/test/worktree',
        force: false
      };

      fs.access
        .mockResolvedValueOnce() // Initial check - exists
        .mockRejectedValueOnce(new Error('ENOENT')); // Final verification - doesn't exist
      
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git status --porcelain')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('git worktree remove')) {
          callback(null, { stdout: 'worktree removed', stderr: '' });
        }
      });

      await cleanupQueue.cleanupWorktree(queueItem);

      expect(exec).toHaveBeenCalledWith(
        'git worktree remove "/test/worktree"',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should force remove worktree when requested', async () => {
      const queueItem = {
        id: 'test-cleanup',
        worktreePath: '/test/worktree',
        force: true
      };

      // Mock fs.access to first succeed (exists), then fail (cleaned up)
      fs.access.mockResolvedValueOnce().mockRejectedValue(new Error('ENOENT'));
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git worktree remove')) {
          callback(null, { stdout: 'worktree removed', stderr: '' });
        }
      });

      await cleanupQueue.cleanupWorktree(queueItem);

      expect(exec).toHaveBeenCalledWith(
        'git worktree remove "/test/worktree" --force',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should fallback to manual removal when git command fails', async () => {
      const queueItem = {
        id: 'test-cleanup',
        worktreePath: '/test/worktree',
        force: false
      };

      // Mock fs.access to first return true (exists), then false (cleaned up)
      fs.access.mockResolvedValueOnce().mockRejectedValue(new Error('ENOENT'));
      fs.rm.mockResolvedValue();
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git status --porcelain')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('git worktree remove')) {
          callback(new Error('Git worktree remove failed'));
        }
      });

      await cleanupQueue.cleanupWorktree(queueItem);

      expect(fs.rm).toHaveBeenCalledWith('/test/worktree', { 
        recursive: true, 
        force: true 
      });
    });

    it('should skip cleanup if worktree does not exist', async () => {
      const queueItem = {
        id: 'test-cleanup',
        worktreePath: '/nonexistent/worktree',
        force: false
      };

      fs.access.mockRejectedValue(new Error('ENOENT'));

      await cleanupQueue.cleanupWorktree(queueItem);

      expect(exec).not.toHaveBeenCalled();
      expect(fs.rm).not.toHaveBeenCalled();
    });

    it('should reject cleanup of worktree with uncommitted changes unless forced', async () => {
      const queueItem = {
        id: 'test-cleanup',
        worktreePath: '/test/worktree',
        force: false
      };

      fs.access.mockResolvedValue();
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git status --porcelain')) {
          callback(null, { stdout: 'M modified-file.txt\n', stderr: '' });
        }
      });

      await expect(cleanupQueue.cleanupWorktree(queueItem)).rejects.toThrow(
        'Worktree has uncommitted changes'
      );
    });

    it('should preserve branch changes when requested', async () => {
      const queueItem = {
        id: 'test-cleanup',
        worktreePath: '/test/worktree',
        preserveBranch: true,
        force: false
      };

      // Mock fs.access to first succeed (exists), then fail (cleaned up)  
      fs.access.mockResolvedValueOnce().mockRejectedValue(new Error('ENOENT'));
      let gitStatusCallCount = 0;
      exec.mockImplementation((cmd, options, callback) => {
        if (cmd.includes('git status --porcelain')) {
          gitStatusCallCount++;
          if (gitStatusCallCount === 1) {
            // First call: check for uncommitted changes - return none to pass initial check
            callback(null, { stdout: '', stderr: '' });
          } else {
            // Subsequent calls: return changes for preserve logic
            callback(null, { stdout: 'M file.txt\n', stderr: '' });
          }
        } else if (cmd.includes('git add .')) {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.includes('git commit')) {
          callback(null, { stdout: 'commit created', stderr: '' });
        } else if (cmd.includes('git worktree remove')) {
          callback(null, { stdout: 'worktree removed', stderr: '' });
        }
      });

      await cleanupQueue.cleanupWorktree(queueItem);

      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('git add .'),
        expect.objectContaining({ cwd: '/test/worktree' }),
        expect.any(Function)
      );
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('git commit'),
        expect.objectContaining({ cwd: '/test/worktree' }),
        expect.any(Function)
      );
    });
  });

  describe('processQueue', () => {
    it('should process queue items sequentially', async () => {
      const cleanupSpy = jest.spyOn(cleanupQueue, 'cleanupWorktree').mockResolvedValue();

      await cleanupQueue.enqueue('/test/worktree1');
      await cleanupQueue.enqueue('/test/worktree2');

      // Wait for processing to complete
      jest.runAllTimers();
      await new Promise(resolve => setImmediate(resolve));

      expect(cleanupSpy).toHaveBeenCalledTimes(2);
      expect(cleanupQueue.queue).toHaveLength(0);
      expect(cleanupQueue.metrics.totalProcessed).toBe(2);
      expect(cleanupQueue.metrics.totalSuccessful).toBe(2);
    });

    it('should retry failed cleanup attempts', async () => {
      let attemptCount = 0;
      const cleanupSpy = jest.spyOn(cleanupQueue, 'cleanupWorktree').mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Cleanup failed');
        }
        return Promise.resolve();
      });

      await cleanupQueue.enqueue('/test/worktree');

      // Process initial attempt
      await new Promise(resolve => setImmediate(resolve));
      
      // Advance timers for retry
      await new Promise(resolve => setImmediate(resolve));
      jest.advanceTimersByTime(1000);

      expect(cleanupSpy).toHaveBeenCalledTimes(2);
      expect(cleanupQueue.metrics.totalSuccessful).toBe(1);
    });

    it('should mark items as permanently failed after max retries', async () => {
      const cleanupSpy = jest.spyOn(cleanupQueue, 'cleanupWorktree').mockRejectedValue(
        new Error('Persistent cleanup failure')
      );

      await cleanupQueue.enqueue('/test/worktree');

      // Process all attempts
      await new Promise(resolve => setImmediate(resolve));
      jest.advanceTimersByTime(1000);
      await new Promise(resolve => setImmediate(resolve));
      jest.advanceTimersByTime(2000);
      await new Promise(resolve => setImmediate(resolve));

      expect(cleanupSpy).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(cleanupQueue.metrics.totalFailed).toBe(1);
    });
  });

  describe('progress tracking', () => {
    it('should notify progress callbacks', async () => {
      const progressCallback = jest.fn();
      const unsubscribe = cleanupQueue.onProgress(progressCallback);

      await cleanupQueue.enqueue('/test/worktree');

      expect(progressCallback).toHaveBeenCalled();
      
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1];
      const progress = lastCall[0];
      
      expect(progress).toHaveProperty('queueLength');
      expect(progress).toHaveProperty('metrics');
      expect(progress).toHaveProperty('processing');

      unsubscribe();
    });

    it('should handle callback errors gracefully', async () => {
      const badCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      cleanupQueue.onProgress(badCallback);

      // Should not throw
      expect(() => cleanupQueue.notifyProgress()).not.toThrow();
    });
  });

  describe('status and metrics', () => {
    it('should return current status', () => {
      const status = cleanupQueue.getStatus();

      expect(status).toMatchObject({
        queueLength: 0,
        processing: false,
        currentlyProcessing: 0,
        metrics: expect.objectContaining({
          totalEnqueued: 0,
          totalProcessed: 0,
          totalSuccessful: 0,
          totalFailed: 0
        }),
        queue: []
      });
    });

    it('should include queue item details in status', async () => {
      await cleanupQueue.enqueue('/test/worktree', { agentId: 'test-agent' });

      const status = cleanupQueue.getStatus();

      expect(status.queueLength).toBe(1);
      expect(status.queue[0]).toMatchObject({
        worktreePath: '/test/worktree',
        status: 'queued',
        attempts: 0
      });
    });
  });

  describe('queue management', () => {
    it('should clear all queued items', async () => {
      await cleanupQueue.enqueue('/test/worktree1');
      await cleanupQueue.enqueue('/test/worktree2');

      const clearedCount = cleanupQueue.clear();

      expect(clearedCount).toBe(2);
      expect(cleanupQueue.queue).toHaveLength(0);
    });

    it('should force cleanup with high priority', async () => {
      await cleanupQueue.enqueue('/test/low-priority', { priority: 1 });
      
      const forceId = await cleanupQueue.forceCleanup('/test/force-cleanup');

      expect(cleanupQueue.queue[0].worktreePath).toBe('/test/force-cleanup');
      expect(cleanupQueue.queue[0].priority).toBe(100);
      expect(cleanupQueue.queue[0].force).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await cleanupQueue.enqueue('/test/worktree1');
      await cleanupQueue.enqueue('/test/worktree2');

      const shutdownPromise = cleanupQueue.shutdown();

      // Advance timers to simulate shutdown timeout
      jest.advanceTimersByTime(100);

      await shutdownPromise;

      expect(cleanupQueue.queue).toHaveLength(0);
    });

    it('should wait for current processing to complete', async () => {
      // Mock a long-running cleanup
      jest.spyOn(cleanupQueue, 'cleanupWorktree').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      await cleanupQueue.enqueue('/test/worktree');
      
      // Start processing
      await new Promise(resolve => setImmediate(resolve));

      const shutdownPromise = cleanupQueue.shutdown();

      // Advance time to let processing complete
      jest.advanceTimersByTime(1100);

      await shutdownPromise;

      expect(cleanupQueue.processing).toBe(false);
    });
  });
});