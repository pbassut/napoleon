const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const LogRetentionManager = require('../src/core/logging/log-retention-manager');

// Mock logger to prevent console output during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('LogRetentionManager', () => {
  let manager;
  let testDir;
  let mockConfig;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `napoleon-retention-test-${Date.now()}`);
    mockConfig = { 
      napoleonDir: testDir,
      logging: {
        retention: {
          enabled: true,
          maxAgeDays: 30,
          maxLogCount: 10,
          maxDirectorySizeMB: 1,
          compressionAgeDays: 7,
          cleanupIntervalHours: 24,
          cleanupTime: "02:00"
        }
      }
    };
    manager = new LogRetentionManager(mockConfig);
  });

  afterEach(async () => {
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

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const defaultManager = new LogRetentionManager();
      expect(defaultManager.napoleonDir).toBe(path.join(os.homedir(), '.napoleon'));
      expect(defaultManager.logsDir).toBe(path.join(os.homedir(), '.napoleon', 'logs', 'agents'));
      expect(defaultManager.retentionConfig.maxAgeDays).toBe(30);
      expect(defaultManager.retentionConfig.maxLogCount).toBe(1000);
      expect(defaultManager.initialized).toBe(false);
    });

    it('should create instance with custom config', () => {
      expect(manager.napoleonDir).toBe(testDir);
      expect(manager.logsDir).toBe(path.join(testDir, 'logs', 'agents'));
      expect(manager.retentionConfig.maxAgeDays).toBe(30);
      expect(manager.retentionConfig.maxLogCount).toBe(10);
      expect(manager.initialized).toBe(false);
    });

    it('should apply default retention config when not provided', () => {
      const noConfigManager = new LogRetentionManager({ napoleonDir: testDir });
      expect(noConfigManager.retentionConfig.enabled).toBe(true);
      expect(noConfigManager.retentionConfig.maxAgeDays).toBe(30);
      expect(noConfigManager.retentionConfig.maxLogCount).toBe(1000);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return valid default configuration', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toMatchObject({
        enabled: true,
        maxAgeDays: 30,
        maxLogCount: 1000,
        maxDirectorySizeMB: 1000,
        compressionAgeDays: 7,
        cleanupIntervalHours: 24,
        cleanupTime: "02:00"
      });
      expect(defaultConfig.policies).toBeDefined();
      expect(defaultConfig.policies.errorLogs).toBeDefined();
      expect(defaultConfig.policies.infoLogs).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await manager.initialize();
      expect(manager.initialized).toBe(true);
      expect(fs.existsSync(manager.logsDir)).toBe(true);
    });

    it('should create logs directory if it does not exist', async () => {
      expect(fs.existsSync(manager.logsDir)).toBe(false);
      await manager.initialize();
      expect(fs.existsSync(manager.logsDir)).toBe(true);
    });

    it('should start scheduler when retention is enabled', async () => {
      await manager.initialize();
      expect(manager.scheduler).toBeDefined();
    });

    it('should not start scheduler when retention is disabled', async () => {
      manager.retentionConfig.enabled = false;
      await manager.initialize();
      expect(manager.scheduler).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      expect(() => manager.validateConfig()).not.toThrow();
    });

    it('should throw error for invalid maxAgeDays', () => {
      manager.retentionConfig.maxAgeDays = -1;
      expect(() => manager.validateConfig()).toThrow('maxAgeDays must be a positive number');
    });

    it('should throw error for invalid maxLogCount', () => {
      manager.retentionConfig.maxLogCount = 0;
      expect(() => manager.validateConfig()).toThrow('maxLogCount must be a positive number');
    });

    it('should throw error for invalid maxDirectorySizeMB', () => {
      manager.retentionConfig.maxDirectorySizeMB = -5;
      expect(() => manager.validateConfig()).toThrow('maxDirectorySizeMB must be a positive number');
    });

    it('should throw error for invalid compressionAgeDays', () => {
      manager.retentionConfig.compressionAgeDays = -1;
      expect(() => manager.validateConfig()).toThrow('compressionAgeDays must be a non-negative number');
    });
  });

  describe('scanLogFiles', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should scan empty directory', async () => {
      const files = await manager.scanLogFiles();
      expect(files).toEqual([]);
    });

    it('should scan directory with log files', async () => {
      // Create test log files
      const logFile1 = path.join(manager.logsDir, '2024-01-01_agent1_test.log');
      const logFile2 = path.join(manager.logsDir, '2024-01-02_agent2_test.log.gz');
      const nonLogFile = path.join(manager.logsDir, 'not-a-log.txt');

      await fs.promises.writeFile(logFile1, 'test log content');
      await fs.promises.writeFile(logFile2, 'compressed content');
      await fs.promises.writeFile(nonLogFile, 'other file');

      // Set different modification times to ensure consistent ordering
      const time1 = new Date(Date.now() - 2000);
      const time2 = new Date(Date.now() - 1000);
      await fs.promises.utimes(logFile1, time1, time1);
      await fs.promises.utimes(logFile2, time2, time2);

      const files = await manager.scanLogFiles();
      expect(files).toHaveLength(2);
      
      // Find files by name rather than assuming order
      const compressedFile = files.find(f => f.name.endsWith('.gz'));
      const regularFile = files.find(f => f.name.endsWith('.log') && !f.name.endsWith('.gz'));
      
      expect(compressedFile).toBeDefined();
      expect(compressedFile.isCompressed).toBe(true);
      expect(regularFile).toBeDefined();
      expect(regularFile.isCompressed).toBe(false);
    });

    it('should calculate file metadata correctly', async () => {
      const logFile = path.join(manager.logsDir, '2024-01-01_agent1_test.log');
      const testContent = 'test log content';
      await fs.promises.writeFile(logFile, testContent);

      const files = await manager.scanLogFiles();
      expect(files).toHaveLength(1);
      expect(files[0].size).toBe(testContent.length);
      expect(files[0].agentId).toBe('agent1');
      expect(typeof files[0].ageDays).toBe('number');
    });
  });

  describe('extractAgentId', () => {
    it('should extract agent ID from valid filename', () => {
      const agentId = manager.extractAgentId('2024-01-01_agent123_test-prompt.log');
      expect(agentId).toBe('agent123');
    });

    it('should extract agent ID from compressed filename', () => {
      const agentId = manager.extractAgentId('2024-01-01_my-agent_long-prompt.log.gz');
      expect(agentId).toBe('my-agent');
    });

    it('should return null for invalid filename', () => {
      const agentId = manager.extractAgentId('invalid-filename.log');
      expect(agentId).toBeNull();
    });
  });

  describe('isAgentActive', () => {
    it('should return false for inactive agent', () => {
      expect(manager.isAgentActive('agent1')).toBe(false);
    });

    it('should return true for active agent', () => {
      manager.activeAgents.add('agent1');
      expect(manager.isAgentActive('agent1')).toBe(true);
    });
  });

  describe('compressFile', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should compress file successfully', async () => {
      const testFile = path.join(manager.logsDir, 'test.log');
      const testContent = 'This is a test log file with some content that should compress well when using gzip compression algorithm';
      await fs.promises.writeFile(testFile, testContent);

      await manager.compressFile(testFile);

      expect(fs.existsSync(testFile)).toBe(false);
      expect(fs.existsSync(testFile + '.gz')).toBe(true);

      // Verify compressed content can be decompressed
      const compressedData = await fs.promises.readFile(testFile + '.gz');
      const decompressed = zlib.gunzipSync(compressedData).toString();
      expect(decompressed).toBe(testContent);
    });

    // Note: Error handling for non-existent files is tested indirectly through integration tests
  });

  describe('verifyCompressedFile', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should verify valid compressed file', async () => {
      const testFile = path.join(manager.logsDir, 'test.log.gz');
      const testContent = 'test content';
      const compressed = zlib.gzipSync(testContent);
      await fs.promises.writeFile(testFile, compressed);

      await expect(manager.verifyCompressedFile(testFile)).resolves.not.toThrow();
    });

    it('should reject invalid compressed file', async () => {
      const testFile = path.join(manager.logsDir, 'invalid.log.gz');
      await fs.promises.writeFile(testFile, 'invalid gzip data');

      await expect(manager.verifyCompressedFile(testFile)).rejects.toThrow();
    });
  });

  describe('compressOldLogs', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should compress old logs in dry run mode', async () => {
      // Create old log file (simulate 10 days old)
      const oldLogFile = path.join(manager.logsDir, '2024-01-01_agent1_test.log');
      await fs.promises.writeFile(oldLogFile, 'old log content');
      
      // Manually adjust the file modification time to simulate age
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await fs.promises.utimes(oldLogFile, tenDaysAgo, tenDaysAgo);

      const results = await manager.compressOldLogs(7, true);

      expect(results.filesCompressed).toBe(1);
      expect(results.actions).toHaveLength(1);
      expect(results.actions[0].type).toBe('compress');
      expect(fs.existsSync(oldLogFile)).toBe(true); // Should not be compressed in dry run
    });

    it('should compress old logs in actual mode', async () => {
      // Create old log file
      const oldLogFile = path.join(manager.logsDir, '2024-01-01_agent1_test.log');
      await fs.promises.writeFile(oldLogFile, 'old log content for compression test');
      
      // Manually adjust the file modification time
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await fs.promises.utimes(oldLogFile, tenDaysAgo, tenDaysAgo);

      const results = await manager.compressOldLogs(7, false);

      expect(results.filesCompressed).toBe(1);
      expect(fs.existsSync(oldLogFile)).toBe(false);
      expect(fs.existsSync(oldLogFile + '.gz')).toBe(true);
    });

    it('should not compress recent logs', async () => {
      // Create recent log file
      const recentLogFile = path.join(manager.logsDir, '2024-01-01_agent1_test.log');
      await fs.promises.writeFile(recentLogFile, 'recent log content');

      const results = await manager.compressOldLogs(7, false);

      expect(results.filesCompressed).toBe(0);
      expect(fs.existsSync(recentLogFile)).toBe(true);
    });
  });

  describe('applyAgeRetention', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should delete files older than retention period', async () => {
      const files = [
        {
          name: 'old.log',
          path: path.join(manager.logsDir, 'old.log'),
          ageDays: 45,
          size: 1024,
          agentId: 'agent1'
        },
        {
          name: 'recent.log', 
          path: path.join(manager.logsDir, 'recent.log'),
          ageDays: 15,
          size: 512,
          agentId: 'agent2'
        }
      ];

      // Create actual files
      await fs.promises.writeFile(files[0].path, 'old content');
      await fs.promises.writeFile(files[1].path, 'recent content');

      const results = await manager.applyAgeRetention(files, false);

      expect(results.filesDeleted).toBe(1);
      expect(results.actions[0].file).toBe('old.log');
      expect(fs.existsSync(files[0].path)).toBe(false);
      expect(fs.existsSync(files[1].path)).toBe(true);
    });

    it('should not delete files for active agents', async () => {
      manager.activeAgents.add('agent1');
      
      const files = [{
        name: 'active-agent.log',
        path: path.join(manager.logsDir, 'active-agent.log'),
        ageDays: 45,
        size: 1024,
        agentId: 'agent1'
      }];

      await fs.promises.writeFile(files[0].path, 'active agent content');

      const results = await manager.applyAgeRetention(files, false);

      expect(results.filesDeleted).toBe(0);
      expect(fs.existsSync(files[0].path)).toBe(true);
    });
  });

  describe('applyCountRetention', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should delete oldest files when count exceeds limit', async () => {
      const files = [];
      // Create 12 files when limit is 10
      for (let i = 0; i < 12; i++) {
        const fileName = `file${i}.log`;
        const filePath = path.join(manager.logsDir, fileName);
        files.push({
          name: fileName,
          path: filePath,
          modified: new Date(Date.now() - i * 60000), // Different timestamps
          size: 100,
          agentId: `agent${i}`
        });
        await fs.promises.writeFile(filePath, `content ${i}`);
      }

      const results = await manager.applyCountRetention(files, false);

      expect(results.filesDeleted).toBe(2); // Delete 2 oldest files
      expect(fs.existsSync(files[10].path)).toBe(false); // Oldest files deleted
      expect(fs.existsSync(files[11].path)).toBe(false);
      expect(fs.existsSync(files[0].path)).toBe(true); // Newest files kept
    });

    it('should not delete files when count is within limit', async () => {
      const files = [{
        name: 'only-file.log',
        path: path.join(manager.logsDir, 'only-file.log'),
        size: 100,
        agentId: 'agent1'
      }];

      await fs.promises.writeFile(files[0].path, 'content');

      const results = await manager.applyCountRetention(files, false);

      expect(results.filesDeleted).toBe(0);
      expect(fs.existsSync(files[0].path)).toBe(true);
    });
  });

  describe('applySizeRetention', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should delete files when directory size exceeds limit', async () => {
      // Set very small limit for testing (1MB = 1024*1024 bytes)
      const files = [
        {
          name: 'file1.log',
          path: path.join(manager.logsDir, 'file1.log'),
          size: 700000, // 700KB
          modified: new Date(Date.now() - 60000),
          agentId: 'agent1'
        },
        {
          name: 'file2.log',
          path: path.join(manager.logsDir, 'file2.log'),
          size: 500000, // 500KB
          modified: new Date(Date.now() - 120000),
          agentId: 'agent2'
        }
      ];

      // Create files
      await fs.promises.writeFile(files[0].path, 'x'.repeat(files[0].size));
      await fs.promises.writeFile(files[1].path, 'x'.repeat(files[1].size));

      const results = await manager.applySizeRetention(files, false);

      expect(results.filesDeleted).toBeGreaterThan(0);
      expect(results.spaceSavedMB).toBeGreaterThan(0);
    });

    it('should not delete files when directory size is within limit', async () => {
      const files = [{
        name: 'small-file.log',
        path: path.join(manager.logsDir, 'small-file.log'),
        size: 100,
        agentId: 'agent1'
      }];

      await fs.promises.writeFile(files[0].path, 'small content');

      const results = await manager.applySizeRetention(files, false);

      expect(results.filesDeleted).toBe(0);
      expect(fs.existsSync(files[0].path)).toBe(true);
    });
  });

  describe('performCleanup', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should perform complete cleanup in dry run mode', async () => {
      // Create test files
      const oldFile = path.join(manager.logsDir, '2024-01-01_agent1_old.log');
      await fs.promises.writeFile(oldFile, 'old content');
      
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await fs.promises.utimes(oldFile, tenDaysAgo, tenDaysAgo);

      const report = await manager.performCleanup(true);

      expect(report.dryRun).toBe(true);
      expect(report.summary.filesScanned).toBeGreaterThan(0);
      expect(report.startTime).toBeDefined();
      expect(report.endTime).toBeDefined();
      expect(typeof report.duration).toBe('number');
      expect(report.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Create a scenario that might cause errors
      manager.logsDir = '/nonexistent/path';
      
      await expect(manager.performCleanup()).rejects.toThrow();
    });

    it('should require initialization before cleanup', async () => {
      const uninitializedManager = new LogRetentionManager(mockConfig);
      await expect(uninitializedManager.performCleanup()).rejects.toThrow('not initialized');
    });
  });

  describe('getRetentionStats', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should return stats for empty directory', async () => {
      const stats = await manager.getRetentionStats();
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSizeMB).toBe(0);
      expect(stats.compressedFiles).toBe(0);
      expect(stats.config).toBeDefined();
    });

    it('should calculate stats correctly with files', async () => {
      // Create test files
      await fs.promises.writeFile(path.join(manager.logsDir, 'file1.log'), 'content1');
      await fs.promises.writeFile(path.join(manager.logsDir, 'file2.log.gz'), 'compressed');

      const stats = await manager.getRetentionStats();
      expect(stats.totalFiles).toBe(2);
      expect(stats.compressedFiles).toBe(1);
      expect(stats.uncompressedFiles).toBe(1);
      expect(stats.totalSizeMB).toBeGreaterThan(0);
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('scheduleCleanup', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should schedule cleanup with default interval', () => {
      manager.scheduleCleanup();
      expect(manager.scheduler).toBeDefined();
    });

    it('should schedule cleanup with custom interval', () => {
      manager.scheduleCleanup(12);
      expect(manager.scheduler).toBeDefined();
    });

    it('should replace existing scheduler', () => {
      manager.scheduleCleanup(24);
      const firstScheduler = manager.scheduler;
      
      manager.scheduleCleanup(12);
      expect(manager.scheduler).not.toBe(firstScheduler);
    });
  });

  describe('generateCleanupReport', () => {
    it('should generate report from actions', () => {
      const actions = [
        { type: 'compress', size: 1000 },
        { type: 'delete_age', size: 500 },
        { type: 'compress_error', error: 'test error' }
      ];

      const report = manager.generateCleanupReport(actions);

      expect(report.totalActions).toBe(3);
      expect(report.actionsByType.compress).toBe(1);
      expect(report.actionsByType.delete_age).toBe(1);
      expect(report.actionsByType.compress_error).toBe(1);
      expect(report.summary.filesProcessed).toBe(3);
      expect(report.summary.errors).toBe(1);
      expect(report.summary.totalSpaceSavedMB).toBeGreaterThan(0);
    });

    it('should handle empty actions', () => {
      const report = manager.generateCleanupReport([]);
      expect(report.totalActions).toBe(0);
      expect(report.summary.filesProcessed).toBe(0);
      expect(report.summary.errors).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      await manager.initialize();
      manager.scheduleCleanup();
      
      await manager.shutdown();
      expect(manager.scheduler).toBeNull();
    });

    it('should handle shutdown when not initialized', async () => {
      await expect(manager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should handle complete retention workflow', async () => {
      // Create various test files
      const files = [
        { name: '2024-01-01_agent1_old.log', content: 'old content', ageDays: 40 },
        { name: '2024-01-15_agent2_medium.log', content: 'medium content', ageDays: 10 },
        { name: '2024-01-20_agent3_recent.log', content: 'recent content', ageDays: 2 }
      ];

      for (const file of files) {
        const filePath = path.join(manager.logsDir, file.name);
        await fs.promises.writeFile(filePath, file.content);
        
        if (file.ageDays > 7) {
          const pastDate = new Date(Date.now() - file.ageDays * 24 * 60 * 60 * 1000);
          await fs.promises.utimes(filePath, pastDate, pastDate);
        }
      }

      // Run complete cleanup
      const report = await manager.performCleanup(false);

      expect(report.summary.filesScanned).toBe(3);
      expect(report.actions.length).toBeGreaterThan(0);
      
      // Get final stats
      const stats = await manager.getRetentionStats();
      expect(stats.totalFiles).toBeLessThanOrEqual(3);
    });

    it('should preserve active agent logs during cleanup', async () => {
      // Override updateActiveAgents to preserve our test active agents
      const originalUpdateActiveAgents = manager.updateActiveAgents;
      manager.updateActiveAgents = async () => {
        // Don't clear active agents in this test - keep existing ones
      };

      // Mark agent as active
      manager.activeAgents.add('active-agent');

      // Create log for active agent
      const activeLogFile = path.join(manager.logsDir, '2024-01-01_active-agent_old.log');
      await fs.promises.writeFile(activeLogFile, 'active agent old content');
      
      // Make it appear very old
      const longAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      await fs.promises.utimes(activeLogFile, longAgo, longAgo);

      // Run cleanup in dry run mode to verify behavior
      const report = await manager.performCleanup(true);

      // Restore original method
      manager.updateActiveAgents = originalUpdateActiveAgents;

      // File should still exist after dry run
      expect(fs.existsSync(activeLogFile)).toBe(true);
      
      // Check that no delete actions were planned for this file
      const deleteActions = report.actions.filter(action => 
        action.type.includes('delete') && action.file === '2024-01-01_active-agent_old.log'
      );
      expect(deleteActions).toHaveLength(0);
    });
  });
});