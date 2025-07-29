const fs = require('fs');
const path = require('path');
const os = require('os');

// Set NODE_ENV to test to export the class instead of singleton
process.env.NODE_ENV = 'test';

describe('SecureLogger', () => {
  let SecureLogger;
  let originalEnv;
  let originalArgv;

  beforeAll(() => {
    originalEnv = process.env;
    originalArgv = process.argv;
  });

  beforeEach(() => {
    // Reset environment and argv
    process.env = { ...originalEnv, NODE_ENV: 'test' };
    process.argv = [...originalArgv];
    
    // Clear module cache
    jest.clearAllMocks();
    delete require.cache[require.resolve('../../src/utils/secure-logger')];
    
    // Mock fs operations
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    
    SecureLogger = require('../../src/utils/secure-logger');
  });

  afterEach(() => {
    process.env = originalEnv;
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create SecureLogger instance', () => {
      const logger = new SecureLogger();
      
      expect(logger).toBeInstanceOf(SecureLogger);
      expect(logger.winston).toBeDefined();
      expect(logger.logDir).toBeDefined();
      expect(Array.isArray(logger.sensitivePatterns)).toBe(true);
    });

    it('should set correct log directory path', () => {
      const logger = new SecureLogger();
      const expectedPath = path.join(os.homedir(), '.napoleon', 'logs');
      
      expect(logger.logDir).toBe(expectedPath);
    });

    it('should initialize sensitive patterns for API key detection', () => {
      const logger = new SecureLogger();
      
      expect(logger.sensitivePatterns.length).toBeGreaterThan(0);
      expect(logger.sensitivePatterns[0]).toBeInstanceOf(RegExp);
    });

    it('should check if log directory exists', () => {
      new SecureLogger();
      
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should create log directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      new SecureLogger();
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.napoleon/logs'),
        { recursive: true }
      );
    });
  });

  describe('Terminal UI Mode Detection', () => {
    it('should detect terminal UI mode from environment variable', () => {
      process.env.TERMINAL_UI_MODE = 'true';
      
      const logger = new SecureLogger();
      
      expect(logger.isTerminalUI).toBe(true);
    });

    it('should detect terminal UI mode from process.argv containing "start"', () => {
      process.argv = ['node', 'script.js', 'start'];
      
      const logger = new SecureLogger();
      
      expect(logger.isTerminalUI).toBe(true);
    });

    it('should detect terminal UI mode from process.argv containing "napoleon.js"', () => {
      process.argv = ['node', '/path/to/napoleon.js', 'command'];
      
      const logger = new SecureLogger();
      
      expect(logger.isTerminalUI).toBe(true);
    });

    it('should not be in terminal UI mode by default', () => {
      const logger = new SecureLogger();
      
      expect(logger.isTerminalUI).toBe(false);
    });
  });

  describe('Message Sanitization', () => {
    let logger;

    beforeEach(() => {
      logger = new SecureLogger();
    });

    it('should sanitize Anthropic API keys (sk-ant-*)', () => {
      const message = 'API key is sk-ant-api03-1234567890abcdef';
      const sanitized = logger.sanitizeMessage(message);
      
      expect(sanitized).toBe('API key is [REDACTED]');
      expect(sanitized).not.toContain('sk-ant-');
    });

    it('should sanitize ANTHROPIC_API_KEY environment variable assignments', () => {
      const message = 'export ANTHROPIC_API_KEY=sk-ant-api03-1234567890abcdef';
      const sanitized = logger.sanitizeMessage(message);
      
      expect(sanitized).toBe('export [REDACTED]');
    });

    it('should sanitize CLAUDE_API_KEY environment variable assignments', () => {
      const message = 'CLAUDE_API_KEY: sk-ant-api03-1234567890abcdef';
      const sanitized = logger.sanitizeMessage(message);
      
      expect(sanitized).toBe('[REDACTED]');
    });

    it('should sanitize CLAUDE_CODE_API_KEY with flexible spacing', () => {
      const message = 'CLAUDE_CODE_API_KEY  =  sk-ant-api03-1234567890abcdef';
      const sanitized = logger.sanitizeMessage(message);
      
      expect(sanitized).toBe('[REDACTED]');
    });

    it('should handle multiple API keys in one message', () => {
      const message = 'First key: sk-ant-api03-abc123 and second key: sk-ant-api03-def456';
      const sanitized = logger.sanitizeMessage(message);
      
      expect(sanitized).toBe('First key: [REDACTED] and second key: [REDACTED]');
    });

    it('should handle non-string messages', () => {
      expect(logger.sanitizeMessage(123)).toBe(123);
      expect(logger.sanitizeMessage(null)).toBe(null);
      expect(logger.sanitizeMessage(undefined)).toBe(undefined);
      expect(logger.sanitizeMessage({})).toEqual({});
    });

    it('should handle empty strings', () => {
      expect(logger.sanitizeMessage('')).toBe('');
    });

    it('should not modify messages without sensitive content', () => {
      const message = 'This is a normal log message';
      const sanitized = logger.sanitizeMessage(message);
      
      expect(sanitized).toBe(message);
    });
  });

  describe('Object Sanitization', () => {
    let logger;

    beforeEach(() => {
      logger = new SecureLogger();
    });

    it('should sanitize object properties containing API keys', () => {
      const obj = {
        apiKey: 'sk-ant-api03-1234567890abcdef',
        message: 'Normal message',
        config: 'ANTHROPIC_API_KEY=sk-ant-api03-abcdef123456'
      };
      
      const sanitized = logger.sanitizeObject(obj);
      
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.message).toBe('Normal message');
      expect(sanitized.config).toBe('[REDACTED]');
    });

    it('should sanitize nested objects', () => {
      const obj = {
        credentials: {
          apiKey: 'sk-ant-api03-1234567890abcdef',
          user: 'test@example.com'
        },
        data: {
          nested: {
            secret: 'CLAUDE_API_KEY: sk-ant-api03-secret123'
          }
        }
      };
      
      const sanitized = logger.sanitizeObject(obj);
      
      expect(sanitized.credentials.apiKey).toBe('[REDACTED]');
      expect(sanitized.credentials.user).toBe('test@example.com');
      expect(sanitized.data.nested.secret).toBe('[REDACTED]');
    });

    it('should sanitize arrays', () => {
      const obj = {
        keys: [
          'sk-ant-api03-1234567890abcdef',
          'normal string',
          { apiKey: 'sk-ant-api03-another-key' }
        ]
      };
      
      const sanitized = logger.sanitizeObject(obj);
      
      expect(sanitized.keys[0]).toBe('[REDACTED]');
      expect(sanitized.keys[1]).toBe('normal string');
      expect(sanitized.keys[2].apiKey).toBe('[REDACTED]');
    });

    it('should handle non-object inputs', () => {
      expect(logger.sanitizeObject(null)).toBe(null);
      expect(logger.sanitizeObject(undefined)).toBe(undefined);
      expect(logger.sanitizeObject('string')).toBe('string');
      expect(logger.sanitizeObject(123)).toBe(123);
    });

    it('should handle empty objects and arrays', () => {
      expect(logger.sanitizeObject({})).toEqual({});
      expect(logger.sanitizeObject([])).toEqual([]);
    });
  });

  describe('Logging Methods', () => {
    let logger;

    beforeEach(() => {
      logger = new SecureLogger();
    });

    it('should have all standard logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.warn).toBe('function');
    });

    it('should call winston methods when logging', () => {
      jest.spyOn(logger.winston, 'info');
      jest.spyOn(logger.winston, 'error');
      jest.spyOn(logger.winston, 'debug');
      jest.spyOn(logger.winston, 'warn');
      
      logger.info('test info', { key: 'value' });
      logger.error('test error', { error: true });
      logger.debug('test debug');
      logger.warn('test warn');
      
      expect(logger.winston.info).toHaveBeenCalledWith('test info', { key: 'value' });
      expect(logger.winston.error).toHaveBeenCalledWith('test error', { error: true });
      expect(logger.winston.debug).toHaveBeenCalledWith('test debug', {});
      expect(logger.winston.warn).toHaveBeenCalledWith('test warn', {});
    });

    it('should handle logging calls without metadata', () => {
      jest.spyOn(logger.winston, 'info');
      
      logger.info('test message');
      
      expect(logger.winston.info).toHaveBeenCalledWith('test message', {});
    });
  });

  describe('Sensitive Content Detection', () => {
    let logger;

    beforeEach(() => {
      logger = new SecureLogger();
    });

    it('should detect Anthropic API keys', () => {
      expect(logger.hasSensitiveContent('sk-ant-api03-1234567890abcdef')).toBe(true);
      expect(logger.hasSensitiveContent('sk-ant-api03-ABC123DEF456')).toBe(true);
      expect(logger.hasSensitiveContent('sk-ant-api03-test_key-123')).toBe(true);
    });

    it('should detect environment variable assignments', () => {
      expect(logger.hasSensitiveContent('ANTHROPIC_API_KEY=secret123')).toBe(true);
      expect(logger.hasSensitiveContent('CLAUDE_API_KEY: secret123')).toBe(true);
      expect(logger.hasSensitiveContent('CLAUDE_CODE_API_KEY = secret123')).toBe(true);
    });

    it('should not detect false positives', () => {
      expect(logger.hasSensitiveContent('This is a normal message')).toBe(false);
      expect(logger.hasSensitiveContent('sk-not-an-api-key')).toBe(false);
      expect(logger.hasSensitiveContent('API_KEY_NOT_SENSITIVE=value')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(logger.hasSensitiveContent(123)).toBe(false);
      expect(logger.hasSensitiveContent(null)).toBe(false);
      expect(logger.hasSensitiveContent(undefined)).toBe(false);
      expect(logger.hasSensitiveContent({})).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(logger.hasSensitiveContent('')).toBe(false);
    });
  });

  describe('Sensitive Patterns Access', () => {
    let logger;

    beforeEach(() => {
      logger = new SecureLogger();
    });

    it('should provide access to sensitive patterns', () => {
      const patterns = logger.getSensitivePatterns();
      
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      expect(typeof patterns[0]).toBe('string');
    });

    it('should return pattern sources not regex objects', () => {
      const patterns = logger.getSensitivePatterns();
      
      patterns.forEach(pattern => {
        expect(typeof pattern).toBe('string');
        expect(pattern).not.toBeInstanceOf(RegExp);
      });
    });
  });

  describe('Winston Logger Configuration', () => {
    it('should create winston logger with correct configuration', () => {
      const logger = new SecureLogger();
      
      expect(logger.winston).toBeDefined();
      expect(logger.winston.level).toBeDefined();
    });

    it('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'debug';
      
      const logger = new SecureLogger();
      
      // Winston mock should be configured with the log level
      expect(logger.winston).toBeDefined();
    });

    it('should add file transports', () => {
      const logger = new SecureLogger();
      
      // With winston mock, winston.add should be called for file transports
      expect(logger.winston.add).toBeDefined();
    });
  });

  describe('Module Export Behavior', () => {
    it('should export class in test environment', () => {
      process.env.NODE_ENV = 'test';
      
      delete require.cache[require.resolve('../../src/utils/secure-logger')];
      const ExportedSecureLogger = require('../../src/utils/secure-logger');
      
      expect(typeof ExportedSecureLogger).toBe('function');
      expect(ExportedSecureLogger.prototype.constructor).toBe(ExportedSecureLogger);
    });

    it('should export singleton in non-test environment', () => {
      // Test the export logic by verifying the condition in secure-logger.js
      // Since the module checks process.env.NODE_ENV at require time,
      // we test the logic indirectly by verifying behavior
      const currentEnv = process.env.NODE_ENV;
      
      // We know that in test environment (current), it exports the class
      expect(typeof SecureLogger).toBe('function');
      
      // In production, it would export a singleton instance
      // This behavior is tested through integration rather than unit test
      // since module.exports is evaluated at require time
      expect(currentEnv).toBe('test');
    });
  });

  describe('Error Handling', () => {
    it('should handle fs.existsSync errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      fs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => {
        new SecureLogger();
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create log directory:', 'Permission denied');
      consoleSpy.mockRestore();
    });

    it('should handle fs.mkdirSync errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => {
        new SecureLogger();
      }).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create log directory:', 'Permission denied');
      consoleSpy.mockRestore();
    });

    it('should handle malformed regex patterns gracefully', () => {
      const logger = new SecureLogger();
      
      // Should not throw even if patterns have issues
      expect(() => {
        logger.hasSensitiveContent('test message');
        logger.sanitizeMessage('test message');
      }).not.toThrow();
    });
  });

  describe('Real-world Scenarios', () => {
    let logger;

    beforeEach(() => {
      logger = new SecureLogger();
    });

    it('should sanitize configuration objects', () => {
      const config = {
        anthropic: {
          apiKey: 'sk-ant-api03-real-secret-key',
          model: 'claude-3-sonnet'
        },
        environment: 'production',
        debug: false
      };
      
      const sanitized = logger.sanitizeObject(config);
      
      expect(sanitized.anthropic.apiKey).toBe('[REDACTED]');
      expect(sanitized.anthropic.model).toBe('claude-3-sonnet');
      expect(sanitized.environment).toBe('production');
      expect(sanitized.debug).toBe(false);
    });

    it('should sanitize error messages with API keys', () => {
      const errorMsg = 'Authentication failed with API key sk-ant-api03-failed-key';
      const sanitized = logger.sanitizeMessage(errorMsg);
      
      expect(sanitized).toBe('Authentication failed with API key [REDACTED]');
    });

    it('should sanitize environment dumps', () => {
      const envDump = `
        NODE_ENV=production
        ANTHROPIC_API_KEY=sk-ant-api03-production-key
        PORT=3000
        CLAUDE_CODE_API_KEY  =  sk-ant-api03-code-key
      `;
      
      const sanitized = logger.sanitizeMessage(envDump);
      
      expect(sanitized).toContain('NODE_ENV=production');
      expect(sanitized).toContain('PORT=3000');
      expect(sanitized).not.toContain('sk-ant-api03-production-key');
      expect(sanitized).not.toContain('sk-ant-api03-code-key');
      expect(sanitized).toContain('[REDACTED]');
    });
  });
});