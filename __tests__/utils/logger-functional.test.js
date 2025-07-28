/**
 * Functional tests for logger utility - testing actual functionality
 */

const logger = require('../../src/utils/logger');

// Mock console methods to capture logger output
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

describe('Logger Functional Tests', () => {
  let mockConsole;

  beforeEach(() => {
    // Replace console methods with mocks
    mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    
    console.log = mockConsole.log;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    console.debug = mockConsole.debug;
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe('Logger Method Execution', () => {
    it('should execute info logging', () => {
      logger.info('Test info message');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should execute warn logging', () => {
      logger.warn('Test warning message');
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should execute error logging', () => {
      logger.error('Test error message');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should execute debug logging', () => {
      logger.debug('Test debug message');
      expect(mockConsole.debug).toHaveBeenCalled();
    });
  });

  describe('Logger Output Format', () => {
    it('should include timestamp in info messages', () => {
      logger.info('Test message');
      
      const calls = mockConsole.log.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Check if the output contains timestamp-like pattern
      const output = calls[0].join(' ');
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
    });

    it('should include timestamp in warning messages', () => {
      logger.warn('Test warning');
      
      const calls = mockConsole.warn.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const output = calls[0].join(' ');
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
    });

    it('should include timestamp in error messages', () => {
      logger.error('Test error');
      
      const calls = mockConsole.error.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      const output = calls[0].join(' ');
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}/); // Date pattern
    });

    it('should include message content', () => {
      const testMessage = 'Unique test message 12345';
      logger.info(testMessage);
      
      const calls = mockConsole.log.mock.calls;
      const output = calls[0].join(' ');
      expect(output).toContain(testMessage);
    });
  });

  describe('Logger with Objects and Metadata', () => {
    it('should handle object parameters in info', () => {
      const testObject = { key: 'value', number: 42 };
      logger.info('Test with object', testObject);
      
      expect(mockConsole.log).toHaveBeenCalled();
      const calls = mockConsole.log.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should handle object parameters in warn', () => {
      const testObject = { warning: 'data', code: 'WARN001' };
      logger.warn('Warning with object', testObject);
      
      expect(mockConsole.warn).toHaveBeenCalled();
      const calls = mockConsole.warn.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should handle object parameters in error', () => {
      const errorObject = { error: 'details', stack: 'fake-stack' };
      logger.error('Error with object', errorObject);
      
      expect(mockConsole.error).toHaveBeenCalled();
      const calls = mockConsole.error.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should handle multiple parameters', () => {
      logger.info('Multiple', 'parameters', { object: true }, 42);
      
      expect(mockConsole.log).toHaveBeenCalled();
      const calls = mockConsole.log.mock.calls;
      expect(calls[0].length).toBeGreaterThan(1); // Multiple arguments passed
    });
  });

  describe('Logger Edge Cases', () => {
    it('should handle empty messages', () => {
      logger.info('');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle null parameters', () => {
      logger.info(null);
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle undefined parameters', () => {
      logger.warn(undefined);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should handle circular objects gracefully', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;
      
      expect(() => {
        logger.error('Circular object', circularObj);
      }).not.toThrow();
      
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should handle very long messages', () => {
      const longMessage = 'Very long message: ' + 'x'.repeat(1000);
      
      expect(() => {
        logger.info(longMessage);
      }).not.toThrow();
      
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });

  describe('Logger Module Structure', () => {
    it('should export all required methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should be a valid module', () => {
      expect(logger).toBeDefined();
      expect(typeof logger).toBe('object');
    });

    it('should handle method chaining scenarios', () => {
      // Test calling multiple logger methods in sequence
      logger.info('First message');
      logger.warn('Second message');
      logger.error('Third message');
      logger.debug('Fourth message');
      
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.debug).toHaveBeenCalled();
    });
  });

  describe('Logger Environment Integration', () => {
    it('should work in test environment', () => {
      // Verify logger works in current Node.js test environment
      expect(() => {
        logger.info('Test environment check');
      }).not.toThrow();
      
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle process information logging', () => {
      // Test logging process-related information
      logger.info('Process info', { 
        pid: process.pid, 
        platform: process.platform 
      });
      
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle date/time logging', () => {
      const now = new Date();
      logger.info('Timestamp test', { timestamp: now });
      
      expect(mockConsole.log).toHaveBeenCalled();
      
      const calls = mockConsole.log.mock.calls;
      const output = calls[0].join(' ');
      expect(output).toContain('Timestamp test');
    });
  });
});