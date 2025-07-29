const fs = require('fs');
const os = require('os');
const path = require('path');
const winston = require('winston');

// Mock winston and fs before requiring logger
jest.mock('winston', () => {
  const mockCreateLogger = jest.fn();
  return {
    createLogger: mockCreateLogger,
    format: {
      combine: jest.fn(() => 'combined-format'),
      timestamp: jest.fn(() => 'timestamp-format'),
      errors: jest.fn(() => 'errors-format'),
      json: jest.fn(() => 'json-format'),
      colorize: jest.fn(() => 'colorize-format'),
      simple: jest.fn(() => 'simple-format'),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

jest.mock('fs');
jest.mock('os');

describe('Logger', () => {
  let mockLogger;
  let originalEnv;
  let originalArgv;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Store original values
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    
    // Mock logger instance
    mockLogger = {
      add: jest.fn(),
    };
    
    // Get the mocked winston and set up the return value
    const winston = require('winston');
    winston.createLogger.mockReturnValue(mockLogger);
    
    // Mock fs methods
    const fs = require('fs');
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    
    // Mock os.homedir
    const os = require('os');
    os.homedir.mockReturnValue('/mock/home');
  });

  afterEach(() => {
    // Restore original values
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  describe('Initialization', () => {
    it('should create log directory if it does not exist', () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(false);
      
      require('../../src/utils/logger');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/.napoleon/logs', { recursive: true });
    });

    it('should not create log directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      require('../../src/utils/logger');
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should create winston logger with correct configuration', () => {
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith({
        level: 'debug',
        format: 'combined-format',
        defaultMeta: { service: 'napoleon' },
        transports: [],
        silent: false,
      });
    });

    it('should use LOG_LEVEL environment variable when set', () => {
      process.env.LOG_LEVEL = 'warn';
      
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
        })
      );
    });
  });

  describe('Terminal UI Mode Detection', () => {
    it('should detect terminal UI mode when TERMINAL_UI_MODE is true', () => {
      process.env.TERMINAL_UI_MODE = 'true';
      
      require('../../src/utils/logger');
      
      // Should not add console transport in terminal UI mode
      expect(mockLogger.add).not.toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: winston.transports.Console
        })
      );
    });

    it('should detect terminal UI mode when argv includes start', () => {
      process.argv = ['node', 'napoleon', 'start'];
      
      require('../../src/utils/logger');
      
      // Should not add console transport in terminal UI mode
      expect(mockLogger.add).not.toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: winston.transports.Console
        })
      );
    });

    it('should detect terminal UI mode when argv includes napoleon.js', () => {
      process.argv = ['node', '/path/to/napoleon.js'];
      
      require('../../src/utils/logger');
      
      // Should not add console transport in terminal UI mode
      expect(mockLogger.add).not.toHaveBeenCalledWith(
        expect.objectContaining({
          constructor: winston.transports.Console
        })
      );
    });

    it('should not be in terminal UI mode by default', () => {
      process.env.TERMINAL_UI_MODE = undefined;
      process.argv = ['node', 'test'];
      
      require('../../src/utils/logger');
      
      // Should add console transport when not in terminal UI mode
      expect(mockLogger.add).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('Logging Disabled', () => {
    it('should disable logging when DISABLE_LOGGING is true', () => {
      process.env.DISABLE_LOGGING = 'true';
      
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: true,
        })
      );
      
      // Should not add any transports
      expect(mockLogger.add).not.toHaveBeenCalled();
    });

    it('should enable logging when DISABLE_LOGGING is false', () => {
      process.env.DISABLE_LOGGING = 'false';
      
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: false,
        })
      );
    });

    it('should enable logging when DISABLE_LOGGING is not set', () => {
      delete process.env.DISABLE_LOGGING;
      
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: false,
        })
      );
    });
  });

  describe('Transport Configuration', () => {
    it('should add console transport when not in terminal UI mode', () => {
      process.env.TERMINAL_UI_MODE = 'false';
      process.argv = ['node', 'test'];
      
      require('../../src/utils/logger');
      
      expect(winston.transports.Console).toHaveBeenCalledWith({
        format: 'combined-format',
      });
      expect(mockLogger.add).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should add console transport when LOG_TESTS is enabled even in terminal UI mode', () => {
      process.env.TERMINAL_UI_MODE = 'true';
      process.env.LOG_TESTS = 'true';
      
      require('../../src/utils/logger');
      
      expect(winston.transports.Console).toHaveBeenCalledWith({
        format: 'combined-format',
      });
    });

    it('should always add file transports when logging is enabled', () => {
      require('../../src/utils/logger');
      
      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: '/mock/home/.napoleon/logs/error.log',
        level: 'error',
      });
      
      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: '/mock/home/.napoleon/logs/combined.log',
      });
      
      expect(mockLogger.add).toHaveBeenCalledTimes(3); // Console + 2 File transports
    });

    it('should not add any transports when logging is disabled', () => {
      process.env.DISABLE_LOGGING = 'true';
      
      require('../../src/utils/logger');
      
      expect(mockLogger.add).not.toHaveBeenCalled();
    });
  });

  describe('Format Configuration', () => {
    it('should configure winston formats correctly', () => {
      require('../../src/utils/logger');
      
      expect(winston.format.combine).toHaveBeenCalled();
      expect(winston.format.timestamp).toHaveBeenCalled();
      expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
      expect(winston.format.json).toHaveBeenCalled();
    });

    it('should configure console format correctly', () => {
      process.env.TERMINAL_UI_MODE = 'false';
      
      require('../../src/utils/logger');
      
      expect(winston.format.colorize).toHaveBeenCalled();
      expect(winston.format.simple).toHaveBeenCalled();
    });
  });

  describe('Module Export', () => {
    it('should export the logger instance', () => {
      const logger = require('../../src/utils/logger');
      
      expect(logger).toBe(mockLogger);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing home directory gracefully', () => {
      os.homedir.mockReturnValue('');
      
      expect(() => {
        require('../../src/utils/logger');
      }).not.toThrow();
    });

    it('should handle fs.mkdirSync errors gracefully', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => {
        require('../../src/utils/logger');
      }).toThrow('Permission denied');
    });

    it('should handle multiple argv patterns', () => {
      process.argv = ['node', 'some-napoleon.js', 'command'];
      
      require('../../src/utils/logger');
      
      // Should detect terminal UI mode due to napoleon.js in path
      expect(mockLogger.add).toHaveBeenCalledTimes(2); // Only file transports
    });

    it('should handle environment variable edge cases', () => {
      process.env.TERMINAL_UI_MODE = '';
      process.env.DISABLE_LOGGING = '';
      process.env.LOG_TESTS = '';
      process.env.LOG_LEVEL = '';
      
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug', // Default level
          silent: false,  // Not disabled
        })
      );
    });
  });
});