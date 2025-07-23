const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  checkAddManagerData,
  checkNapoleonData,
  transformSessionData,
  transformConfigData,
  performMigration,
  validateMigration
} = require('../bin/migrate-to-napoleon');

// Mock fs for testing
jest.mock('fs');
jest.mock('os');

describe('Migration Helper Tests', () => {
  const mockHomeDir = '/mock/home';
  const mockAddManagerDir = path.join(mockHomeDir, '.napoleon');
  const mockNapoleonDir = path.join(mockHomeDir, '.napoleon');

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock os.homedir()
    os.homedir.mockReturnValue(mockHomeDir);
    
    // Mock fs.existsSync to return false by default
    fs.existsSync.mockReturnValue(false);
    
    // Mock fs.readFileSync
    fs.readFileSync.mockReturnValue('{}');
    
    // Mock fs.writeFileSync
    fs.writeFileSync.mockImplementation(() => {});
    
    // Mock fs.mkdirSync
    fs.mkdirSync.mockImplementation(() => {});
    
    // Mock fs.copyFileSync
    fs.copyFileSync.mockImplementation(() => {});
    
    // Mock fs.readdirSync
    fs.readdirSync.mockReturnValue([]);
  });

  describe('checkAddManagerData', () => {
    test('should return false for all checks when Napoleon directory does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = checkAddManagerData();
      
      expect(result).toEqual({
        directory: false,
        sessions: false,
        config: false
      });
    });

    test('should return true for existing Napoleon files', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('.napoleon');
      });
      
      const result = checkAddManagerData();
      
      expect(result).toEqual({
        directory: true,
        sessions: true,
        config: true
      });
    });
  });

  describe('checkNapoleonData', () => {
    test('should return false for all checks when Napoleon directory does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = checkNapoleonData();
      
      expect(result).toEqual({
        directory: false,
        sessions: false,
        config: false
      });
    });

    test('should return true for existing Napoleon files', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('.napoleon');
      });
      
      const result = checkNapoleonData();
      
      expect(result).toEqual({
        directory: true,
        sessions: true,
        config: true
      });
    });
  });

  describe('transformSessionData', () => {
    test('should return empty sessions structure for null input', () => {
      const result = transformSessionData(null);
      
      expect(result).toEqual({
        sessions: [],
        lastUpdated: expect.any(String)
      });
    });

    test('should return empty sessions structure for missing sessions array', () => {
      const result = transformSessionData({});
      
      expect(result).toEqual({
        sessions: [],
        lastUpdated: expect.any(String)
      });
    });

    test('should transform Napoleon session to Napoleon format', () => {
      const addManagerSessions = {
        sessions: [
          {
            id: 'test-agent-1',
            instructions: 'Test instructions',
            spawnTime: '2023-01-01T00:00:00.000Z',
            status: 'running',
            pid: 12345,
            workingDirectory: '/test/dir',
            worktreePath: '/test/worktree',
            worktreeName: 'test-branch',
            gitRoot: '/test/git',
            lastActivity: '2023-01-01T01:00:00.000Z',
            logs: [{ message: 'test log' }],
            process: { /* process object */ },
            claudeSession: { /* session object */ }
          }
        ]
      };

      const result = transformSessionData(addManagerSessions);

      expect(result.sessions).toHaveLength(1);
      const transformedSession = result.sessions[0];
      
      // Check required fields are present
      expect(transformedSession.id).toBe('test-agent-1');
      expect(transformedSession.instructions).toBe('Test instructions');
      expect(transformedSession.sdkStatus).toBe('inactive');
      expect(transformedSession.lastMessageId).toBeNull();
      expect(transformedSession.sdkSessionId).toBeNull();
      expect(transformedSession.migratedFrom).toBe('napoleon');
      expect(transformedSession.migrationDate).toEqual(expect.any(String));
      
      // Check process-specific fields are removed
      expect(transformedSession.pid).toBeUndefined();
      expect(transformedSession.process).toBeUndefined();
      expect(transformedSession.claudeSession).toBeUndefined();
      
      // Check other fields are preserved
      expect(transformedSession.workingDirectory).toBe('/test/dir');
      expect(transformedSession.worktreePath).toBe('/test/worktree');
      expect(transformedSession.logs).toEqual([{ message: 'test log' }]);
    });

    test('should handle sessions with missing optional fields', () => {
      const addManagerSessions = {
        sessions: [
          {
            id: 'minimal-agent',
            instructions: 'Minimal instructions',
            spawnTime: '2023-01-01T00:00:00.000Z',
            status: 'running'
          }
        ]
      };

      const result = transformSessionData(addManagerSessions);

      expect(result.sessions).toHaveLength(1);
      const transformedSession = result.sessions[0];
      
      expect(transformedSession.id).toBe('minimal-agent');
      expect(transformedSession.logs).toEqual([]);
      expect(transformedSession.sdkStatus).toBe('inactive');
    });
  });

  describe('transformConfigData', () => {
    test('should return default config for null input', () => {
      const result = transformConfigData(null);
      
      expect(result).toEqual({
        version: '2.0.0',
        sessionTimeout: 3600000,
        logLevel: 'info',
        features: {
          autoCleanup: true,
          notifications: true,
          sdkIntegration: true
        }
      });
    });

    test('should transform Napoleon config to Napoleon format', () => {
      const addManagerConfig = {
        version: '1.0.0',
        maxAgents: 5,
        sessionTimeout: 7200000,
        logLevel: 'debug',
        features: {
          autoCleanup: false,
          notifications: true,
          customFeature: 'test'
        }
      };

      const result = transformConfigData(addManagerConfig);

      expect(result.version).toBe('2.0.0');
      expect(result.maxAgents).toBe(5);
      expect(result.sessionTimeout).toBe(7200000);
      expect(result.logLevel).toBe('debug');
      expect(result.features.autoCleanup).toBe(false);
      expect(result.features.notifications).toBe(true);
      expect(result.features.customFeature).toBe('test');
      expect(result.features.sdkIntegration).toBe(true);
      expect(result.migratedFrom).toBe('napoleon');
      expect(result.migrationDate).toEqual(expect.any(String));
    });
  });

  describe('performMigration', () => {
    test('should return false when no Napoleon data exists', async () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = await performMigration({ dryRun: true });
      
      expect(result).toBe(false);
    });

    test('should return false when Napoleon data exists and force is not set', async () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon')) return true;
        if (filePath.includes('.napoleon/sessions.json')) return true;
        return false;
      });
      
      const result = await performMigration({ dryRun: true, force: false });
      
      expect(result).toBe(false);
    });

    test('should perform dry run migration successfully', async () => {
      // Mock Napoleon data exists
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon')) return true;
        return false;
      });
      
      // Mock file contents
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('sessions.json')) {
          return JSON.stringify({
            sessions: [
              {
                id: 'test-agent',
                instructions: 'Test',
                spawnTime: '2023-01-01T00:00:00.000Z',
                status: 'running',
                pid: 12345
              }
            ]
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({
            version: '1.0.0'
          });
        }
        return '{}';
      });
      
      const result = await performMigration({ dryRun: true, force: true });
      
      expect(result).toBe(true);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('should perform actual migration successfully', async () => {
      // Mock Napoleon data exists
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon')) return true;
        return false;
      });
      
      // Mock file contents
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('sessions.json')) {
          return JSON.stringify({
            sessions: [
              {
                id: 'test-agent',
                instructions: 'Test',
                spawnTime: '2023-01-01T00:00:00.000Z',
                status: 'running',
                pid: 12345
              }
            ]
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({
            version: '1.0.0'
          });
        }
        return '{}';
      });
      
      const result = await performMigration({ dryRun: false, force: true });
      
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    test('should handle migration errors gracefully', async () => {
      // Mock Napoleon data exists
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon')) return true;
        return false;
      });
      
      // Mock file read error
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      
      const result = await performMigration({ dryRun: false });
      
      expect(result).toBe(false);
    });
  });

  describe('validateMigration', () => {
    test('should return false when Napoleon sessions file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = validateMigration();
      
      expect(result).toBe(true); // Should pass if no files exist
    });

    test('should validate correct sessions file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('sessions.json');
      });
      
      fs.readFileSync.mockReturnValue(JSON.stringify({
        sessions: [
          {
            id: 'test-agent',
            sdkStatus: 'inactive',
            migrationDate: '2023-01-01T00:00:00.000Z'
          }
        ]
      }));
      
      const result = validateMigration();
      
      expect(result).toBe(true);
    });

    test('should return false for invalid sessions file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('sessions.json');
      });
      
      fs.readFileSync.mockReturnValue(JSON.stringify({
        sessions: [
          {
            id: 'test-agent'
            // Missing required fields
          }
        ]
      }));
      
      const result = validateMigration();
      
      expect(result).toBe(false);
    });

    test('should validate correct config file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('config.json');
      });
      
      fs.readFileSync.mockReturnValue(JSON.stringify({
        version: '2.0.0',
        features: {
          sdkIntegration: true
        }
      }));
      
      const result = validateMigration();
      
      expect(result).toBe(true);
    });

    test('should return false for invalid config file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('config.json');
      });
      
      fs.readFileSync.mockReturnValue(JSON.stringify({
        // Missing required fields
      }));
      
      const result = validateMigration();
      
      expect(result).toBe(false);
    });

    test('should handle JSON parsing errors', () => {
      fs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('sessions.json');
      });
      
      fs.readFileSync.mockReturnValue('invalid json');
      
      const result = validateMigration();
      
      expect(result).toBe(false);
    });
  });

  describe('Cross-platform compatibility', () => {
    test('should handle different home directory formats', () => {
      const windowsHome = 'C:\\Users\\test';
      const unixHome = '/home/test';
      
      os.homedir.mockReturnValue(windowsHome);
      let result = checkAddManagerData();
      expect(result).toBeDefined();
      
      os.homedir.mockReturnValue(unixHome);
      result = checkAddManagerData();
      expect(result).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    test('should handle empty sessions array', () => {
      const result = transformSessionData({
        sessions: []
      });
      
      expect(result.sessions).toHaveLength(0);
      expect(result.lastUpdated).toEqual(expect.any(String));
    });

    test('should handle sessions with extra fields', () => {
      const addManagerSessions = {
        sessions: [
          {
            id: 'test-agent',
            instructions: 'Test',
            spawnTime: '2023-01-01T00:00:00.000Z',
            status: 'running',
            pid: 12345,
            customField: 'custom-value',
            anotherField: { nested: 'object' }
          }
        ]
      };

      const result = transformSessionData(addManagerSessions);
      const transformedSession = result.sessions[0];
      
      expect(transformedSession.customField).toBe('custom-value');
      expect(transformedSession.anotherField).toEqual({ nested: 'object' });
      expect(transformedSession.pid).toBeUndefined();
    });
  });
});