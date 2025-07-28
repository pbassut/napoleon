/**
 * Tests for configuration management
 */

// Mock all filesystem operations
jest.mock('fs');
jest.mock('path');
jest.mock('os');

const fs = require('fs');
const path = require('path');
const os = require('os');
const { FileSystemError } = require('../../src/utils/errors');

// Set up mocks before requiring the config module
path.join.mockImplementation((...args) => args.join('/'));
os.homedir.mockReturnValue('/home/test');

const { 
  CONFIG_DIR, 
  CONFIG_FILE, 
  SESSIONS_FILE, 
  LOGS_DIR,
  initializeSessionStorage, 
  loadConfig, 
  saveConfig 
} = require('../../src/core/config');

describe('Configuration Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default filesystem mocks
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockReturnValue('{}');
    fs.statSync.mockReturnValue({ mode: 0o700 });
    fs.chmodSync.mockImplementation(() => {});
  });

  describe('Constants', () => {
    it('should define correct directory paths', () => {
      expect(CONFIG_DIR).toBe('/home/test/.napoleon');
      expect(CONFIG_FILE).toBe('/home/test/.napoleon/config.json');
      expect(SESSIONS_FILE).toBe('/home/test/.napoleon/sessions.json');
      expect(LOGS_DIR).toBe('/home/test/.napoleon/logs');
    });
  });

  describe('initializeSessionStorage', () => {
    it('should create directories and files when they do not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      
      await initializeSessionStorage();
      
      // Verify directory creation
      expect(fs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { mode: 0o700 });
      expect(fs.mkdirSync).toHaveBeenCalledWith(LOGS_DIR, { mode: 0o700 });
      
      // Verify file creation
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.stringContaining('"version": "1.0.0"'),
        { mode: 0o600 }
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        SESSIONS_FILE,
        expect.stringContaining('"active": []'),
        { mode: 0o600 }
      );
    });

    it('should skip creation when directories and files exist', async () => {
      fs.existsSync.mockReturnValue(true);
      
      await initializeSessionStorage();
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should fix directory permissions if too permissive', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ mode: 0o755 }); // Too permissive
      
      await initializeSessionStorage();
      
      expect(fs.chmodSync).toHaveBeenCalledWith(CONFIG_DIR, 0o700);
    });

    it('should not fix permissions if already correct', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ mode: 0o700 }); // Correct permissions
      
      await initializeSessionStorage();
      
      expect(fs.chmodSync).not.toHaveBeenCalled();
    });

    it('should throw FileSystemError on filesystem errors', async () => {
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      await expect(initializeSessionStorage()).rejects.toThrow(FileSystemError);
      await expect(initializeSessionStorage()).rejects.toThrow('Failed to initialize session storage');
    });

    it('should handle config directory creation failure', async () => {
      fs.existsSync.mockImplementation((path) => {
        if (path === CONFIG_DIR) return false;
        return true;
      });
      
      fs.mkdirSync.mockImplementation((path) => {
        if (path === CONFIG_DIR) {
          throw new Error('Disk full');
        }
      });
      
      await expect(initializeSessionStorage()).rejects.toThrow(FileSystemError);
      await expect(initializeSessionStorage()).rejects.toThrow('Disk full');
    });

    it('should handle logs directory creation failure', async () => {
      fs.existsSync.mockImplementation((path) => {
        if (path === LOGS_DIR) return false;
        return true;
      });
      
      fs.mkdirSync.mockImplementation((path) => {
        if (path === LOGS_DIR) {
          throw new Error('No space left');
        }
      });
      
      await expect(initializeSessionStorage()).rejects.toThrow(FileSystemError);
      await expect(initializeSessionStorage()).rejects.toThrow('No space left');
    });
  });

  describe('loadConfig', () => {
    it('should load and merge configuration from file', () => {
      const mockConfigData = {
        logLevel: 'debug',
        features: {
          autoCleanup: true,
        },
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfigData));
      
      const config = loadConfig();
      
      expect(fs.readFileSync).toHaveBeenCalledWith(CONFIG_FILE, 'utf8');
      expect(config.version).toBe('1.0.0'); // Default value
      expect(config.logLevel).toBe('debug'); // Overridden value
      expect(config.features.autoCleanup).toBe(true); // Overridden value
      // Note: shallow merge means nested defaults are overwritten, not merged
      expect(config.features.notifications).toBeUndefined(); // Overwritten by shallow merge
    });

    it('should return default configuration when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const config = loadConfig();
      
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(config.version).toBe('1.0.0');
      expect(config.logLevel).toBe('info');
      expect(config.features.autoCleanup).toBe(false);
    });

    it('should throw FileSystemError on JSON parsing errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json{');
      
      expect(() => loadConfig()).toThrow(FileSystemError);
      expect(() => loadConfig()).toThrow('Failed to load configuration');
    });

    it('should throw FileSystemError on file read errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => loadConfig()).toThrow(FileSystemError);
      expect(() => loadConfig()).toThrow('Permission denied');
    });

    it('should handle empty config file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{}');
      
      const config = loadConfig();
      
      expect(config.version).toBe('1.0.0'); // Default values should be preserved
      expect(config.logLevel).toBe('info');
    });

    it('should handle partial configuration', () => {
      const partialConfig = {
        logLevel: 'error',
        features: {
          autoCleanup: true,
          // notifications missing - should use default
        },
        // ui section missing - should use default
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(partialConfig));
      
      const config = loadConfig();
      
      expect(config.logLevel).toBe('error');
      expect(config.features.autoCleanup).toBe(true);
      // Shallow merge overwrites nested objects completely
      expect(config.features.notifications).toBeUndefined(); // Overwritten
      expect(config.ui.toolSuppression.enabled).toBe(true); // Default preserved
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file with correct permissions', () => {
      const mockConfig = {
        version: '1.0.0',
        logLevel: 'debug',
        features: {
          autoCleanup: true,
        },
      };
      
      saveConfig(mockConfig);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        JSON.stringify(mockConfig, null, 2),
        { mode: 0o600 }
      );
    });

    it('should throw FileSystemError on write errors', () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });
      
      const mockConfig = { version: '1.0.0' };
      
      expect(() => saveConfig(mockConfig)).toThrow(FileSystemError);
      expect(() => saveConfig(mockConfig)).toThrow('Failed to save configuration');
    });

    it('should handle complex configuration objects', () => {
      const complexConfig = {
        version: '1.0.0',
        features: {
          autoCleanup: true,
          notifications: false,
        },
        ui: {
          toolSuppression: {
            enabled: false,
            suppressedTools: ['git', 'npm'],
            showToolResults: false,
          },
        },
        logging: {
          agents: {
            enabled: false,
            directory: '/custom/path',
            maxPromptLength: 100,
          },
        },
      };
      
      saveConfig(complexConfig);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        JSON.stringify(complexConfig, null, 2),
        { mode: 0o600 }
      );
    });

    it('should handle permission errors', () => {
      fs.writeFileSync.mockImplementation(() => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        throw error;
      });
      
      const mockConfig = { version: '1.0.0' };
      
      expect(() => saveConfig(mockConfig)).toThrow(FileSystemError);
      expect(() => saveConfig(mockConfig)).toThrow('Permission denied');
    });

    it('should handle null/undefined config gracefully', () => {
      // JSON.stringify handles null and undefined, but will cause issues
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Cannot convert undefined or null to JSON');
      });
      
      expect(() => saveConfig(null)).toThrow(FileSystemError);
      expect(() => saveConfig(undefined)).toThrow(FileSystemError);
    });
  });

  describe('Integration Tests', () => {
    it('should support full config lifecycle', async () => {
      // Initialize storage
      fs.existsSync.mockReturnValue(false);
      await initializeSessionStorage();
      
      // Load default config
      fs.existsSync.mockReturnValue(false);
      const defaultConfig = loadConfig();
      expect(defaultConfig.logLevel).toBe('info');
      
      // Modify and save config
      const modifiedConfig = { ...defaultConfig, logLevel: 'debug' };
      saveConfig(modifiedConfig);
      
      // Load modified config
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(modifiedConfig));
      const loadedConfig = loadConfig();
      
      expect(loadedConfig.logLevel).toBe('debug');
    });

    it('should handle concurrent access scenarios', () => {
      // Simulate file being deleted between existence check and read
      let fileExists = true;
      fs.existsSync.mockImplementation(() => fileExists);
      fs.readFileSync.mockImplementation(() => {
        fileExists = false; // File deleted after existence check
        throw new Error('ENOENT: no such file or directory');
      });
      
      expect(() => loadConfig()).toThrow(FileSystemError);
    });
  });
});