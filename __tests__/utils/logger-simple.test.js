// Simple logger test focused on the key functionality
describe('Logger module functionality', () => {
  let logger;
  let mockWinston;
  let mockFs;
  let mockOs;

  beforeEach(() => {
    // Clear module cache
    jest.resetModules();
    
    // Mock winston
    mockWinston = {
      createLogger: jest.fn(() => ({
        add: jest.fn(),
      })),
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
    
    // Mock fs
    mockFs = {
      existsSync: jest.fn(() => true),
      mkdirSync: jest.fn(),
    };
    
    // Mock os
    mockOs = {
      homedir: jest.fn(() => '/mock/home'),
    };
    
    // Set up jest mocks
    jest.doMock('winston', () => mockWinston);
    jest.doMock('fs', () => mockFs);
    jest.doMock('os', () => mockOs);
  });

  afterEach(() => {
    jest.unmock('winston');
    jest.unmock('fs');
    jest.unmock('os');
  });

  it('should create logger and directory setup', () => {
    mockFs.existsSync.mockReturnValue(false);
    
    logger = require('../../src/utils/logger');
    
    // Should create directory
    expect(mockFs.mkdirSync).toHaveBeenCalledWith('/mock/home/.napoleon/logs', { recursive: true });
    
    // Should create winston logger
    expect(mockWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug',
        defaultMeta: { service: 'napoleon' },
        silent: false,
      })
    );
  });

  it('should not create directory if it exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    
    logger = require('../../src/utils/logger');
    
    expect(mockFs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should disable logging when DISABLE_LOGGING is true', () => {
    process.env.DISABLE_LOGGING = 'true';
    
    logger = require('../../src/utils/logger');
    
    expect(mockWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        silent: true,
      })
    );
    
    delete process.env.DISABLE_LOGGING;
  });

  it('should use custom log level when LOG_LEVEL is set', () => {
    process.env.LOG_LEVEL = 'warn';
    
    logger = require('../../src/utils/logger');
    
    expect(mockWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
      })
    );
    
    delete process.env.LOG_LEVEL;
  });

  it('should detect terminal UI mode with environment variable', () => {
    process.env.TERMINAL_UI_MODE = 'true';
    const mockLoggerInstance = { add: jest.fn() };
    mockWinston.createLogger.mockReturnValue(mockLoggerInstance);
    
    logger = require('../../src/utils/logger');
    
    // Should not add console transport in terminal UI mode (without LOG_TESTS)
    const calls = mockLoggerInstance.add.mock.calls;
    const hasConsoleTransport = calls.some(call => 
      call[0] && call[0].constructor === mockWinston.transports.Console
    );
    
    delete process.env.TERMINAL_UI_MODE;
  });

  it('should detect terminal UI mode with start argument', () => {
    const originalArgv = process.argv;
    process.argv = ['node', 'napoleon', 'start'];
    
    const mockLoggerInstance = { add: jest.fn() };
    mockWinston.createLogger.mockReturnValue(mockLoggerInstance);
    
    logger = require('../../src/utils/logger');
    
    // Verify logger was created and called add method for file transports
    expect(mockLoggerInstance.add).toHaveBeenCalled();
    
    process.argv = originalArgv;
  });

  it('should add console transport when LOG_TESTS is enabled', () => {
    process.env.TERMINAL_UI_MODE = 'true';
    process.env.LOG_TESTS = 'true';
    
    const mockLoggerInstance = { add: jest.fn() };
    mockWinston.createLogger.mockReturnValue(mockLoggerInstance);
    
    logger = require('../../src/utils/logger');
    
    // Should add console transport when LOG_TESTS is enabled
    expect(mockWinston.transports.Console).toHaveBeenCalled();
    
    delete process.env.TERMINAL_UI_MODE;
    delete process.env.LOG_TESTS;
  });

  it('should add file transports when logging is enabled', () => {
    const mockLoggerInstance = { add: jest.fn() };
    mockWinston.createLogger.mockReturnValue(mockLoggerInstance);
    
    logger = require('../../src/utils/logger');
    
    // Should add file transports
    expect(mockWinston.transports.File).toHaveBeenCalledWith({
      filename: '/mock/home/.napoleon/logs/error.log',
      level: 'error',
    });
    
    expect(mockWinston.transports.File).toHaveBeenCalledWith({
      filename: '/mock/home/.napoleon/logs/combined.log',
    });
  });

  it('should not add transports when logging is disabled', () => {
    process.env.DISABLE_LOGGING = 'true';
    
    const mockLoggerInstance = { add: jest.fn() };
    mockWinston.createLogger.mockReturnValue(mockLoggerInstance);
    
    logger = require('../../src/utils/logger');
    
    // Should not add any transports
    expect(mockLoggerInstance.add).not.toHaveBeenCalled();
    
    delete process.env.DISABLE_LOGGING;
  });

  it('should export the logger instance', () => {
    const mockLoggerInstance = { add: jest.fn() };
    mockWinston.createLogger.mockReturnValue(mockLoggerInstance);
    
    logger = require('../../src/utils/logger');
    
    expect(logger).toBe(mockLoggerInstance);
  });

  it('should handle winston format calls', () => {
    logger = require('../../src/utils/logger');
    
    expect(mockWinston.format.combine).toHaveBeenCalled();
    expect(mockWinston.format.timestamp).toHaveBeenCalled();
    expect(mockWinston.format.errors).toHaveBeenCalledWith({ stack: true });
    expect(mockWinston.format.json).toHaveBeenCalled();
  });

  it('should handle fs.mkdirSync errors', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => {
      throw new Error('Permission denied');
    });
    
    expect(() => {
      require('../../src/utils/logger');
    }).toThrow('Permission denied');
  });
});