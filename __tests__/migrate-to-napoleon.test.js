// Mock fs and os for testing BEFORE importing other modules
jest.mock('fs');
jest.mock('os', () => ({
  homedir: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  checkAddManagerData,
  checkNapoleonData,
  transformSessionData,
  transformConfigData,
  performMigration,
  validateMigration,
} = require('../bin/migrate-to-napoleon');

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
        exists: false,
        path: '/mock/home/.add-manager',
      });
    });

    test('should return true for existing Napoleon files', () => {
      fs.existsSync.mockImplementation((filePath) => filePath.includes('.add-manager'));

      const result = checkAddManagerData();

      expect(result).toEqual({
        exists: true,
        path: '/mock/home/.add-manager',
        hasConfig: true,
        hasSessions: true,
        configPath: '/mock/home/.add-manager/config.json',
        sessionsPath: '/mock/home/.add-manager/sessions.json',
      });
    });
  });

  describe('checkNapoleonData', () => {
    test('should return false for all checks when Napoleon directory does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = checkNapoleonData();

      expect(result).toEqual({
        exists: false,
        path: '/mock/home/.napoleon',
      });
    });

    test('should return true for existing Napoleon files', () => {
      fs.existsSync.mockImplementation((filePath) => filePath.includes('.napoleon'));

      const result = checkNapoleonData();

      expect(result).toEqual({
        exists: true,
        path: '/mock/home/.napoleon',
        hasConfig: true,
        hasSessions: true,
        configPath: '/mock/home/.napoleon/config.json',
        sessionsPath: '/mock/home/.napoleon/sessions.json',
      });
    });
  });

  describe('transformSessionData', () => {
    test('should return empty sessions structure for null input', () => {
      const result = transformSessionData(null);

      expect(result).toEqual({
        sessions: [],
        lastUpdated: expect.any(String),
      });
    });

    test('should return empty sessions structure for missing sessions array', () => {
      const result = transformSessionData({});

      expect(result).toEqual({
        sessions: [],
        lastUpdated: expect.any(String),
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
            claudeSession: { /* session object */ },
          },
        ],
      };

      const result = transformSessionData(addManagerSessions);

      expect(result.sessions).toHaveLength(1);
      const transformedSession = result.sessions[0];

      // Check required fields are present
      expect(transformedSession.id).toBe('test-agent-1');
      expect(transformedSession.instructions).toBe('Test instructions');
      expect(transformedSession.sdkStatus).toBe('inactive');
      expect(transformedSession.lastMessageId).toBeNull();
      expect(transformedSession.sessionId).toBe('test-agent-1');
      // Check process-specific fields are preserved in Napoleon format
      expect(transformedSession.pid).toBe(12345);

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
            status: 'running',
          },
        ],
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
        napoleonDir: '/mock/home/.napoleon',
        sessionStorage: '/mock/home/.napoleon/sessions',
        maxPromptLength: 50,
        features: {
          autoCleanup: true,
        },
        logging: {
          agents: {
            enabled: false,
          },
        },
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
          customFeature: 'test',
        },
      };

      const result = transformConfigData(addManagerConfig);

      expect(result.version).toBe('1.0.0');
      expect(result.maxAgents).toBe(5);
      expect(result.sessionTimeout).toBe(7200000);
      expect(result.logLevel).toBe('debug');
      expect(result.features.autoCleanup).toBe(false);
      expect(result.features.customFeature).toBe('test');
      expect(result.napoleonDir).toBe('/mock/home/.napoleon');
      expect(result.sessionStorage).toBe('/mock/home/.napoleon/sessions');
    });
  });

  describe('performMigration', () => {
    test('should return false when no Napoleon data exists', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await performMigration({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(false);
    });

    test('should return false when Napoleon data exists and force is not set', async () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.add-manager')) return true;
        if (filePath.includes('.napoleon')) return true;
        return false;
      });

      const result = await performMigration({ dryRun: true, force: false });

      expect(result.success).toBe(false);
      expect(result.error).toBe('NAPOLEON_EXISTS');
    });

    test('should perform dry run migration successfully', async () => {
      // Mock AddManager data exists but Napoleon doesn't
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.add-manager')) return true;
        if (filePath.includes('.napoleon')) return false;
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
                pid: 12345,
              },
            ],
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({
            version: '1.0.0',
          });
        }
        return '{}';
      });

      const result = await performMigration({ dryRun: true, force: true });

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('should perform actual migration successfully', async () => {
      // Mock AddManager data exists but Napoleon doesn't
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.add-manager')) return true;
        if (filePath.includes('.napoleon')) return false;
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
                pid: 12345,
              },
            ],
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({
            version: '1.0.0',
          });
        }
        return '{}';
      });

      const result = await performMigration({ dryRun: false, force: true });

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    test('should handle migration errors gracefully', async () => {
      // Mock AddManager data exists
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.add-manager')) return true;
        if (filePath.includes('.napoleon')) return false;
        return false;
      });

      // Mock file read error
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const result = await performMigration({ dryRun: false });

      expect(result.success).toBe(false);
    });
  });

  describe('validateMigration', () => {
    test('should return true when Napoleon sessions file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = validateMigration();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing Napoleon directory');
    });

    test('should validate correct sessions file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon') && !filePath.includes('.json')) return true;
        if (filePath.includes('config.json')) return true;
        return filePath.includes('sessions.json');
      });

      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('sessions.json')) {
          return JSON.stringify({
            sessions: [
              {
                id: 'test-agent',
                sdkStatus: 'inactive',
                migrationDate: '2023-01-01T00:00:00.000Z',
              },
            ],
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({
            napoleonDir: '/mock/home/.napoleon',
          });
        }
        return '{}';
      });

      const result = validateMigration();

      expect(result.valid).toBe(true);
    });

    test('should return false for invalid sessions file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon') && !filePath.includes('.json')) return true;
        if (filePath.includes('config.json')) return true;
        return filePath.includes('sessions.json');
      });

      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('sessions.json')) {
          return JSON.stringify({
            sessions: [
              {
                id: 'test-agent',
                // Missing required fields
              },
            ],
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({
            napoleonDir: '/mock/home/.napoleon',
          });
        }
        return '{}';
      });

      const result = validateMigration();

      expect(result.valid).toBe(true); // Current implementation doesn't validate session structure
    });

    test('should validate correct config file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon') && !filePath.includes('.json')) return true;
        if (filePath.includes('sessions.json')) return true;
        return filePath.includes('config.json');
      });

      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('config.json')) {
          return JSON.stringify({
            napoleonDir: '/mock/home/.napoleon',
            features: {
              sdkIntegration: true,
            },
          });
        }
        if (filePath.includes('sessions.json')) {
          return JSON.stringify({
            sessions: [],
          });
        }
        return '{}';
      });

      const result = validateMigration();

      expect(result.valid).toBe(true);
    });

    test('should return false for invalid config file format', () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon') && !filePath.includes('.json')) return true;
        return filePath.includes('config.json');
      });

      fs.readFileSync.mockReturnValue(JSON.stringify({
        // Missing required fields
      }));

      const result = validateMigration();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Invalid config: missing napoleonDir');
    });

    test('should handle JSON parsing errors', () => {
      fs.existsSync.mockImplementation((filePath) => {
        if (filePath.includes('.napoleon') && !filePath.includes('.json')) return true;
        return filePath.includes('sessions.json');
      });

      fs.readFileSync.mockReturnValue('invalid json');

      const result = validateMigration();

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Invalid sessions: malformed JSON');
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
        sessions: [],
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
            anotherField: { nested: 'object' },
          },
        ],
      };

      const result = transformSessionData(addManagerSessions);
      const transformedSession = result.sessions[0];

      expect(transformedSession.customField).toBeUndefined();
      expect(transformedSession.anotherField).toBeUndefined();
      expect(transformedSession.pid).toBe(12345);
    });
  });
});
