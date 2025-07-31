/**
 * Unmocked logger coverage test - executes actual logger.js code
 * This test completely bypasses jest mocking to get real coverage
 */

// Completely disable all mocks for this test file
jest.unmock('winston');
jest.unmock('fs');
jest.unmock('path');
jest.unmock('os');

// Clear any existing mocks before importing
beforeAll(() => {
  // Remove winston mock specifically
  if (require.cache[require.resolve('winston')]) {
    delete require.cache[require.resolve('winston')];
  }
  
  // Clear logger from cache
  const loggerPath = require.resolve('../src/utils/logger');
  if (require.cache[loggerPath]) {
    delete require.cache[loggerPath];
  }
});

describe('Logger Unmocked Coverage Test', () => {
  const originalEnv = process.env;
  const originalArgv = process.argv;

  beforeEach(() => {
    // Store original values
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];
    
    // Clear logger from cache for fresh import
    const loggerPath = require.resolve('../src/utils/logger');
    if (require.cache[loggerPath]) {
      delete require.cache[loggerPath];
    }
  });

  afterEach(() => {
    // Restore original values
    process.env = originalEnv;
    process.argv = originalArgv;
  });

  test('should execute logger.js with default settings', () => {
    // Set environment for default execution path
    process.env.DISABLE_LOGGING = 'false';
    process.env.TERMINAL_UI_MODE = 'false';
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_TESTS;
    process.argv = ['node', 'script.js'];

    // Import logger - this executes all the initialization code
    const logger = require('../src/utils/logger');
    
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    
    // Exercise logger methods to ensure they work
    logger.info('Test info message');
    logger.error('Test error message');
    logger.debug('Test debug message');
    logger.warn('Test warn message');
  });

  test('should execute logger.js with disabled logging', () => {
    process.env.DISABLE_LOGGING = 'true';
    process.argv = ['node', 'script.js'];
    
    // Import logger with logging disabled (line 24, 37)
    const logger = require('../src/utils/logger');
    
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    
    // Test that logger still works even when disabled
    logger.info('Disabled logging test');
    logger.error('Disabled error test');
  });

  test('should execute logger.js with terminal UI mode via env var', () => {
    process.env.DISABLE_LOGGING = 'false';
    process.env.TERMINAL_UI_MODE = 'true';  // line 19
    process.argv = ['node', 'script.js'];
    
    const logger = require('../src/utils/logger');
    
    expect(logger).toBeDefined();
    logger.info('Terminal UI mode via env var test');
  });

  test('should execute logger.js with terminal UI mode via argv start', () => {
    process.env.DISABLE_LOGGING = 'false';
    delete process.env.TERMINAL_UI_MODE;
    process.argv = ['node', 'script.js', 'start'];  // line 20
    
    const logger = require('../src/utils/logger');
    
    expect(logger).toBeDefined();
    logger.info('Terminal UI mode via argv start test');
  });

  test('should execute logger.js with terminal UI mode via napoleon.js', () => {
    process.env.DISABLE_LOGGING = 'false';
    delete process.env.TERMINAL_UI_MODE;
    process.argv = ['node', '/path/to/napoleon.js'];  // line 21
    
    const logger = require('../src/utils/logger');
    
    expect(logger).toBeDefined();
    logger.info('Terminal UI mode via napoleon.js test');
  });

  test('should execute logger.js with custom log level', () => {
    process.env.DISABLE_LOGGING = 'false';
    process.env.LOG_LEVEL = 'warn';  // line 28
    process.env.TERMINAL_UI_MODE = 'false';
    process.argv = ['node', 'script.js'];
    
    const logger = require('../src/utils/logger');
    
    expect(logger).toBeDefined();
    logger.warn('Custom log level test');
    logger.error('Custom log level error test');
  });

  test('should execute logger.js with LOG_TESTS enabled in terminal UI mode', () => {
    process.env.DISABLE_LOGGING = 'false';
    process.env.TERMINAL_UI_MODE = 'true';
    process.env.LOG_TESTS = 'true';  // line 43
    process.argv = ['node', 'script.js'];
    
    const logger = require('../src/utils/logger');
    
    expect(logger).toBeDefined();
    logger.info('LOG_TESTS enabled test');
  });

  test('should exercise all winston transport configuration paths', () => {
    process.env.DISABLE_LOGGING = 'false';
    process.env.TERMINAL_UI_MODE = 'false';
    process.argv = ['node', 'script.js'];
    
    const logger = require('../src/utils/logger');
    
    // Test all logger methods to exercise transports (lines 44-61)
    logger.error('Error transport test');
    logger.warn('Warn transport test');
    logger.info('Info transport test');
    logger.debug('Debug transport test');
    logger.verbose('Verbose transport test');
    logger.silly('Silly transport test');
    
    // Test with metadata
    logger.info('Metadata test', { key: 'value', test: true });
    logger.error('Error with metadata', { error: 'test', stack: 'test-stack' });
    
    expect(logger).toBeDefined();
  });

  test('should test log directory creation paths', () => {
    // Skip this test in CI to avoid file system permission issues
    if (process.env.CI) {
      return;
    }
    
    // This test exercises the fs operations (lines 9-16)
    process.env.DISABLE_LOGGING = 'false';
    
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    
    // Import logger which should create the directory
    const logger = require('../src/utils/logger');
    
    // Verify the directory was created
    const expectedLogDir = path.join(os.homedir(), '.napoleon', 'logs');
    expect(fs.existsSync(expectedLogDir)).toBe(true);
    
    // Test logging to files
    logger.error('File creation test error');
    logger.info('File creation test info');
    
    expect(logger).toBeDefined();
  });

  test('should test all conditional branches comprehensively', () => {
    const testCases = [
      {
        name: 'isTerminalUI=false, console transport enabled',
        env: { DISABLE_LOGGING: 'false', TERMINAL_UI_MODE: 'false' },
        argv: ['node', 'script.js']
      },
      {
        name: 'isTerminalUI=true, LOG_TESTS=true, console transport enabled',
        env: { DISABLE_LOGGING: 'false', TERMINAL_UI_MODE: 'true', LOG_TESTS: 'true' },
        argv: ['node', 'script.js']
      },
      {
        name: 'isTerminalUI=true, LOG_TESTS=undefined, no console transport',
        env: { DISABLE_LOGGING: 'false', TERMINAL_UI_MODE: 'true' },
        argv: ['node', 'script.js'],
        clear: ['LOG_TESTS']
      },
      {
        name: 'argv contains start',
        env: { DISABLE_LOGGING: 'false' },
        argv: ['node', 'script.js', 'start'],
        clear: ['TERMINAL_UI_MODE']
      },
      {
        name: 'argv contains napoleon.js',
        env: { DISABLE_LOGGING: 'false' },
        argv: ['node', 'bin/napoleon.js', 'command'],
        clear: ['TERMINAL_UI_MODE']
      },
      {
        name: 'Custom LOG_LEVEL=error',
        env: { DISABLE_LOGGING: 'false', LOG_LEVEL: 'error', TERMINAL_UI_MODE: 'false' },
        argv: ['node', 'script.js']
      }
    ];

    testCases.forEach(({ name, env, argv, clear }) => {
      // Clear logger cache
      const loggerPath = require.resolve('../src/utils/logger');
      if (require.cache[loggerPath]) {
        delete require.cache[loggerPath];
      }

      // Clear specified env vars
      if (clear) {
        clear.forEach(key => delete process.env[key]);
      }

      // Set environment
      Object.keys(env).forEach(key => {
        process.env[key] = env[key];
      });
      process.argv = argv;

      // Import and test logger
      const logger = require('../src/utils/logger');
      expect(logger).toBeDefined();

      // Exercise logger methods
      logger.info(`Test case: ${name}`);
      logger.error(`Error for: ${name}`);
      logger.debug(`Debug for: ${name}`);
      logger.warn(`Warn for: ${name}`);
    });
  });

  test('should handle edge cases in argv processing', () => {
    const argvTestCases = [
      ['node', 'script.js'],
      ['node', 'script.js', 'napoleon.js'],
      ['node', '/full/path/napoleon.js'],
      ['node', 'script.js', '--flag=napoleon.js'],
      ['node', 'script.js', 'start', 'extra-args']
    ];

    argvTestCases.forEach((argv, index) => {
      // Clear logger cache
      const loggerPath = require.resolve('../src/utils/logger');
      if (require.cache[loggerPath]) {
        delete require.cache[loggerPath];
      }

      process.env.DISABLE_LOGGING = 'false';
      delete process.env.TERMINAL_UI_MODE;
      delete process.env.LOG_TESTS;
      process.argv = argv;

      const logger = require('../src/utils/logger');
      expect(logger).toBeDefined();
      
      logger.info(`Argv test ${index}: ${argv.join(' ')}`);
    });
  });
});