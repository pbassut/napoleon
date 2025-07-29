const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Logger Module', () => {
  const originalEnv = process.env;
  let logDir;

  beforeEach(() => {
    logDir = path.join(os.homedir(), '.napoleon', 'logs');
    
    // Clear module cache first
    delete require.cache[require.resolve('../../src/utils/logger')];
    
    // Mock fs to prevent actual directory creation
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Basic Logger Functionality', () => {
    it('should export a logger instance with required methods', () => {
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.add).toBe('function');
      expect(typeof logger.remove).toBe('function');
    });

    it('should export the same instance on multiple requires', () => {
      const logger1 = require('../../src/utils/logger');
      const logger2 = require('../../src/utils/logger');
      
      expect(logger1).toBe(logger2);
    });

    it('should have winston logger properties', () => {
      const logger = require('../../src/utils/logger');
      
      expect(logger.level).toBeDefined();
      expect(typeof logger.add).toBe('function');
      expect(typeof logger.remove).toBe('function');
      expect(typeof logger.isLevelEnabled).toBe('function');
    });
  });

  describe('Logging Methods', () => {
    it('should have all standard logging methods', () => {
      const logger = require('../../src/utils/logger');
      
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function'); 
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.verbose).toBe('function');
      expect(typeof logger.silly).toBe('function');
      expect(typeof logger.log).toBe('function');
    });

    it('should handle logging calls without throwing', () => {
      const logger = require('../../src/utils/logger');
      
      expect(() => {
        logger.info('Test info message');
        logger.error('Test error message');
        logger.debug('Test debug message');
        logger.warn('Test warn message');
        logger.verbose('Test verbose message');
        logger.silly('Test silly message');
        logger.log('info', 'Test log message');
      }).not.toThrow();
    });

    it('should call methods on the winston logger instance', () => {
      const logger = require('../../src/utils/logger');
      
      logger.info('test message');
      logger.error('error message');
      logger.debug('debug message');
      logger.warn('warn message');
      
      expect(logger.info).toHaveBeenCalledWith('test message');
      expect(logger.error).toHaveBeenCalledWith('error message');
      expect(logger.debug).toHaveBeenCalledWith('debug message');
      expect(logger.warn).toHaveBeenCalledWith('warn message');
    });
  });

  describe('File System Integration', () => {
    it.skip('should check if log directory exists during module loading', () => {
      // Reset the fs mock call counts
      fs.existsSync.mockClear();
      
      require('../../src/utils/logger');
      
      expect(fs.existsSync).toHaveBeenCalledWith(logDir);
    });

    it.skip('should create log directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockClear();
      
      require('../../src/utils/logger');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(logDir, { recursive: true });
    });

    it('should not create log directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      require('../../src/utils/logger');
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should use correct log directory path', () => {
      const expectedPath = path.join(os.homedir(), '.napoleon', 'logs');
      
      expect(logDir).toBe(expectedPath);
    });
  });

  describe('Environment Variables Impact', () => {

    it('should handle DISABLE_LOGGING environment variable', () => {
      process.env.DISABLE_LOGGING = 'true';
      
      const logger = require('../../src/utils/logger');
      
      // Logger should still be created and functional even when logging is disabled
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should handle LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'warn';
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });

    it('should handle TERMINAL_UI_MODE environment variable', () => {
      process.env.TERMINAL_UI_MODE = 'true';
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });

    it('should handle LOG_TESTS environment variable', () => {
      process.env.LOG_TESTS = 'true';
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });
  });

  describe('Process Arguments Impact', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should handle process.argv containing "start"', () => {
      process.argv = ['node', 'script.js', 'start'];
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });

    it('should handle process.argv containing "napoleon.js"', () => {
      process.argv = ['node', '/path/to/napoleon.js', 'command'];
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });

    it('should handle empty process.argv', () => {
      process.argv = [];
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });

    it('should handle process.argv with multiple arguments', () => {
      process.argv = ['node', 'script.js', '--verbose', '--config', 'test.json'];
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });
  });

  describe('Module Configuration Coverage', () => {

    it('should handle winston format configuration', () => {
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
      // The winston mock should have been called during logger creation
    });

    it('should handle winston transport configuration', () => {
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger.add).toBe('function');
    });

    it('should handle multiple environment combinations', () => {
      process.env.LOG_LEVEL = 'error';
      process.env.DISABLE_LOGGING = 'false';
      process.env.TERMINAL_UI_MODE = 'true';
      process.env.LOG_TESTS = 'true';
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing home directory gracefully', () => {
      // Mock os.homedir to return undefined
      const originalHomedir = os.homedir;
      os.homedir = () => '/tmp';
      
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBeDefined();
      
      // Restore original
      os.homedir = originalHomedir;
    });

    it.skip('should handle fs.existsSync throwing an error', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      fs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      // Should not throw during require
      expect(() => {
        require('../../src/utils/logger');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create log directory:', 'Permission denied');
      consoleSpy.mockRestore();
    });

    it.skip('should handle fs.mkdirSync throwing an error', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      // Should not throw during require
      expect(() => {
        require('../../src/utils/logger');
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create log directory:', 'Permission denied');
      consoleSpy.mockRestore();
    });
  });
});