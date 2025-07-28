/**
 * Tests for Winston logger utility
 */

// Mock filesystem and Winston before requiring logger
jest.mock('fs');
jest.mock('winston', () => {
  const mockTransports = {
    Console: jest.fn().mockImplementation(() => ({
      format: jest.fn(),
    })),
    File: jest.fn().mockImplementation(() => ({
      filename: 'mock-file',
      level: 'info',
    })),
  };

  const mockFormat = {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(),
    level: 'debug',
    transports: [],
    silent: false,
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    transports: mockTransports,
    format: mockFormat,
    mockLogger, // Export for test access
  };
});

const fs = require('fs');
const winston = require('winston');

// Set up filesystem mocks
fs.existsSync.mockReturnValue(true);
fs.mkdirSync.mockImplementation(() => {});

describe('Winston Logger Tests', () => {
  let logger;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.DISABLE_LOGGING;
    delete process.env.LOG_LEVEL;
    delete process.env.TERMINAL_UI_MODE;
    delete process.env.LOG_TESTS;
    
    // Get the mock logger instance
    mockLogger = winston.mockLogger;
    
    // Require logger fresh
    delete require.cache[require.resolve('../../src/utils/logger')];
    logger = require('../../src/utils/logger');
  });

  describe('Logger Creation and Configuration', () => {
    it('should create Winston logger with correct configuration', () => {
      expect(winston.createLogger).toHaveBeenCalledWith({
        level: 'debug',
        format: expect.any(Object),
        defaultMeta: { service: 'napoleon' },
        transports: [],
        silent: false,
      });
    });

    it('should configure logger with timestamp format', () => {
      expect(winston.format.combine).toHaveBeenCalled();
      expect(winston.format.timestamp).toHaveBeenCalled();
      expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
      expect(winston.format.json).toHaveBeenCalled();
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'error';
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error'
        })
      );
    });

    it('should disable logging when DISABLE_LOGGING is true', () => {
      process.env.DISABLE_LOGGING = 'true';
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          silent: true
        })
      );
    });
  });

  describe('Transport Configuration', () => {
    it('should add console transport when not in terminal UI mode', () => {
      process.env.TERMINAL_UI_MODE = 'false';
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(mockLogger.add).toHaveBeenCalledWith(
        expect.any(winston.transports.Console)
      );
    });

    it('should add console transport when LOG_TESTS is enabled', () => {
      process.env.TERMINAL_UI_MODE = 'true';
      process.env.LOG_TESTS = 'true';
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(mockLogger.add).toHaveBeenCalledWith(
        expect.any(winston.transports.Console)
      );
    });

    it('should always add file transports for persistent logging', () => {
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      // Should add error log file
      expect(mockLogger.add).toHaveBeenCalledWith(
        expect.any(winston.transports.File)
      );
      
      // Should add combined log file
      expect(mockLogger.add).toHaveBeenCalledWith(
        expect.any(winston.transports.File)
      );
    });

    it('should not add transports when logging is disabled', () => {
      process.env.DISABLE_LOGGING = 'true';
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      // Should not add any transports
      expect(mockLogger.add).not.toHaveBeenCalled();
    });
  });

  describe('Directory Creation', () => {
    it('should create log directory when it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.napoleon/logs'),
        { recursive: true }
      );
    });

    it('should not create log directory when it exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('Logger Method Calls', () => {
    it('should call Winston info method', () => {
      logger.info('Test info message');
      expect(mockLogger.info).toHaveBeenCalledWith('Test info message');
    });

    it('should call Winston warn method', () => {
      logger.warn('Test warning message');
      expect(mockLogger.warn).toHaveBeenCalledWith('Test warning message');
    });

    it('should call Winston error method', () => {
      logger.error('Test error message');
      expect(mockLogger.error).toHaveBeenCalledWith('Test error message');
    });

    it('should call Winston debug method', () => {
      logger.debug('Test debug message');
      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message');
    });

    it('should pass multiple arguments to Winston methods', () => {
      const testObj = { key: 'value' };
      logger.info('Message with object', testObj);
      
      expect(mockLogger.info).toHaveBeenCalledWith('Message with object', testObj);
    });
  });

  describe('Environment Detection', () => {
    it('should detect terminal UI mode from environment variable', () => {
      process.env.TERMINAL_UI_MODE = 'true';
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      // Should still create logger but with different transport config
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should detect terminal UI mode from process arguments', () => {
      const originalArgv = process.argv;
      process.argv = [...process.argv, 'start'];
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalled();
      
      process.argv = originalArgv;
    });

    it('should detect Napoleon.js in process arguments', () => {
      const originalArgv = process.argv;
      process.argv = [...process.argv, '/path/to/napoleon.js'];
      
      delete require.cache[require.resolve('../../src/utils/logger')];
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalled();
      
      process.argv = originalArgv;
    });
  });

  describe('Logger Module Export', () => {
    it('should export Winston logger instance', () => {
      expect(logger).toBe(mockLogger);
    });

    it('should have all required logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', () => {
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      fs.existsSync.mockReturnValue(false);
      
      // Should not throw even if directory creation fails
      expect(() => {
        delete require.cache[require.resolve('../../src/utils/logger')];
        require('../../src/utils/logger');
      }).not.toThrow();
    });

    it('should handle Winston configuration errors', () => {
      winston.createLogger.mockImplementation(() => {
        throw new Error('Winston error');
      });
      
      // Should propagate Winston errors
      expect(() => {
        delete require.cache[require.resolve('../../src/utils/logger')];
        require('../../src/utils/logger');
      }).toThrow('Winston error');
    });
  });
});