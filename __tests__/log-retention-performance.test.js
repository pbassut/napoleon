const fs = require('fs');
const path = require('path');
const os = require('os');
const LogRetentionManager = require('../src/core/logging/log-retention-manager');

// Mock logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('LogRetentionManager Performance Tests', () => {
  let manager;
  let testDir;
  let mockConfig;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `napoleon-retention-perf-test-${Date.now()}`);
    mockConfig = { 
      napoleonDir: testDir,
      logging: {
        retention: {
          enabled: true,
          maxAgeDays: 30,
          maxLogCount: 500, // Lower for faster cleanup testing
          maxDirectorySizeMB: 100,
          compressionAgeDays: 7,
          cleanupIntervalHours: 24,
          cleanupTime: "02:00"
        }
      }
    };
    manager = new LogRetentionManager(mockConfig);
    await manager.initialize();
  });

  afterAll(async () => {
    // Shutdown manager and clean up
    if (manager.scheduler) {
      await manager.shutdown();
    }
    try {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Large file set operations', () => {
    it('should handle scanning 1000+ log files efficiently', async () => {
      // Create 1000 test log files
      const fileCount = 1000;
      const startTime = Date.now();

      console.log(`Creating ${fileCount} test log files...`);
      
      // Create files in batches to avoid overwhelming the filesystem
      const batchSize = 100;
      for (let i = 0; i < fileCount; i += batchSize) {
        const promises = [];
        for (let j = i; j < Math.min(i + batchSize, fileCount); j++) {
          const fileName = `2024-01-${String(Math.floor(j / 31) + 1).padStart(2, '0')}_agent${j}_test-log-${j}.log`;
          const filePath = path.join(manager.logsDir, fileName);
          const content = `Log entry ${j}\nTimestamp: ${new Date().toISOString()}\nAgent: agent${j}\n`;
          promises.push(fs.promises.writeFile(filePath, content));
        }
        await Promise.all(promises);
      }

      const creationTime = Date.now() - startTime;
      console.log(`File creation took: ${creationTime}ms`);

      // Test scanning performance
      const scanStartTime = Date.now();
      const files = await manager.scanLogFiles();
      const scanTime = Date.now() - scanStartTime;

      expect(files).toHaveLength(fileCount);
      expect(scanTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      console.log(`Scanning ${fileCount} files took: ${scanTime}ms`);
      console.log(`Average time per file: ${(scanTime / fileCount).toFixed(2)}ms`);
    });

    it('should perform cleanup on large file sets within reasonable time', async () => {
      // The files should already exist from the previous test
      const cleanupStartTime = Date.now();
      
      console.log('Starting cleanup performance test...');
      const report = await manager.performCleanup(true); // Dry run for safety
      
      const cleanupTime = Date.now() - cleanupStartTime;
      
      expect(report.summary.filesScanned).toBeGreaterThan(900); // Should find most of our files
      expect(cleanupTime).toBeLessThan(10000); // Should complete in under 10 seconds
      
      console.log(`Cleanup of ${report.summary.filesScanned} files took: ${cleanupTime}ms`);
      console.log(`Actions evaluated: ${report.actions.length}`);
      
      // Verify performance metrics
      expect(report.duration).toBeLessThanOrEqual(cleanupTime + 10); // Report duration should be reasonable (allow small margin)
    });

    it('should generate retention statistics efficiently', async () => {
      const statsStartTime = Date.now();
      
      const stats = await manager.getRetentionStats();
      
      const statsTime = Date.now() - statsStartTime;
      
      expect(stats.totalFiles).toBeGreaterThan(900);
      expect(statsTime).toBeLessThan(3000); // Should complete in under 3 seconds
      expect(stats.totalSizeMB).toBeGreaterThan(0);
      
      console.log(`Statistics generation took: ${statsTime}ms`);
      console.log(`Total files: ${stats.totalFiles}`);
      console.log(`Total size: ${stats.totalSizeMB.toFixed(2)}MB`);
      console.log(`Average age: ${stats.averageAgeDays.toFixed(1)} days`);
    });

    it('should handle memory efficiently with large file sets', async () => {
      // Check memory usage before and after operations
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      await manager.scanLogFiles();
      await manager.getRetentionStats();
      await manager.performCleanup(true);
      
      const finalMemory = process.memoryUsage();
      
      // Memory increase should be reasonable (less than 50MB for 1000 files)
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      expect(memoryIncrease).toBeLessThan(50);
      
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}MB`);
      console.log(`Final heap usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle concurrent operations safely', async () => {
      // Test running multiple operations concurrently
      const concurrentStartTime = Date.now();
      
      const operations = [
        manager.scanLogFiles(),
        manager.getRetentionStats(),
        manager.performCleanup(true),
        manager.scanLogFiles() // Duplicate to test concurrent file access
      ];
      
      const results = await Promise.all(operations);
      const concurrentTime = Date.now() - concurrentStartTime;
      
      // All operations should complete successfully
      expect(results).toHaveLength(4);
      expect(results[0]).toBeInstanceOf(Array); // scanLogFiles
      expect(results[1].totalFiles).toBeGreaterThan(0); // getRetentionStats
      expect(results[2].summary).toBeDefined(); // performCleanup
      expect(results[3]).toBeInstanceOf(Array); // scanLogFiles again
      
      console.log(`Concurrent operations took: ${concurrentTime}ms`);
    });
  });
}, 60000); // 60 second timeout for performance tests