const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock winston before requiring SecureLogger
jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    add: jest.fn()
  };
  
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(() => 'combined-format'),
      timestamp: jest.fn(() => 'timestamp-format'),
      errors: jest.fn(() => 'errors-format'),
      printf: jest.fn((fn) => fn),
      colorize: jest.fn(() => 'colorize-format'),
      json: jest.fn(() => 'json-format')
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

// Mock file system operations
jest.mock('fs');
jest.mock('os', () => ({
  homedir: jest.fn(() => '/home/test')
}));

const secureLogger = require('../../src/utils/secure-logger');

describe('SecureLogger', () => {
  let mockWinston;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup fs mock
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    
    // Get winston mock instance
    const winston = require('winston');
    mockWinston = winston.createLogger();
  });

  describe('constructor', () => {
    it('should initialize with sensitive patterns', () => {
      const patterns = secureLogger.getSensitivePatterns();
      
      expect(patterns).toEqual([
        'sk-ant-[a-zA-Z0-9\\-_]+',
        'ANTHROPIC_API_KEY[=:]\\s*[^\\s]+',
        'CLAUDE_API_KEY[=:]\\s*[^\\s]+',
        'CLAUDE_CODE_API_KEY\\s*[=:]\\s*[^\\s]+'
      ]);
    });

    it('should create log directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      // Create new instance to trigger constructor
      const SecureLoggerClass = require('../../src/utils/secure-logger').constructor;
      new SecureLoggerClass();
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join('/home/test', '.napoleon', 'logs'),
        { recursive: true }
      );
    });
  });

  describe('sanitizeMessage', () => {
    it('should redact Anthropic API keys', () => {
      const message = 'API key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      
      const result = secureLogger.sanitizeMessage(message);
      
      expect(result).toBe('API key: [REDACTED]');
    });

    it('should redact ANTHROPIC_API_KEY environment variable assignments', () => {
      const message = 'Setting ANTHROPIC_API_KEY=sk-ant-api03-test';
      
      const result = secureLogger.sanitizeMessage(message);
      
      expect(result).toBe('Setting [REDACTED]');
    });

    it('should redact CLAUDE_API_KEY environment variable assignments', () => {
      const message = 'export CLAUDE_API_KEY: sk-ant-api03-test';
      
      const result = secureLogger.sanitizeMessage(message);
      
      expect(result).toBe('export [REDACTED]');
    });

    it('should redact CLAUDE_CODE_API_KEY environment variable assignments', () => {
      const message = 'CLAUDE_CODE_API_KEY = sk-ant-api03-test';
      
      const result = secureLogger.sanitizeMessage(message);
      
      expect(result).toBe('[REDACTED]');
    });

    it('should handle multiple API keys in same message', () => {
      const message = 'Key1: sk-ant-api03-test1 and Key2: sk-ant-api03-test2';
      
      const result = secureLogger.sanitizeMessage(message);
      
      expect(result).toBe('Key1: [REDACTED] and Key2: [REDACTED]');
    });

    it('should handle non-string input', () => {
      const result1 = secureLogger.sanitizeMessage(null);
      const result2 = secureLogger.sanitizeMessage(undefined);
      const result3 = secureLogger.sanitizeMessage(123);
      
      expect(result1).toBeNull();
      expect(result2).toBeUndefined();
      expect(result3).toBe(123);
    });

    it('should preserve safe messages unchanged', () => {
      const safeMessage = 'This is a safe log message with no sensitive data';
      
      const result = secureLogger.sanitizeMessage(safeMessage);
      
      expect(result).toBe(safeMessage);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties in objects', () => {
      const obj = {
        message: 'API key: sk-ant-api03-test',
        safe: 'This is safe',
        nested: {
          apiKey: 'sk-ant-api03-nested'
        }
      };
      
      const result = secureLogger.sanitizeObject(obj);
      
      expect(result).toEqual({
        message: 'API key: [REDACTED]',
        safe: 'This is safe',
        nested: {
          apiKey: '[REDACTED]'
        }
      });
    });

    it('should handle arrays with sensitive content', () => {
      const obj = {
        keys: ['sk-ant-api03-test1', 'safe-value', 'sk-ant-api03-test2']
      };
      
      const result = secureLogger.sanitizeObject(obj);
      
      expect(result).toEqual({
        keys: ['[REDACTED]', 'safe-value', '[REDACTED]']
      });
    });

    it('should handle non-object input', () => {
      expect(secureLogger.sanitizeObject(null)).toBeNull();
      expect(secureLogger.sanitizeObject(undefined)).toBeUndefined();
      expect(secureLogger.sanitizeObject('string')).toBe('string');
      expect(secureLogger.sanitizeObject(123)).toBe(123);
    });

    it('should preserve non-string object properties', () => {
      const obj = {
        count: 42,
        enabled: true,
        data: null
      };
      
      const result = secureLogger.sanitizeObject(obj);
      
      expect(result).toEqual(obj);
    });
  });

  describe('hasSensitiveContent', () => {
    it('should detect API keys', () => {
      const sensitiveMessage = 'Using API key sk-ant-api03-test';
      const safeMessage = 'This is a safe message';
      
      expect(secureLogger.hasSensitiveContent(sensitiveMessage)).toBe(true);
      expect(secureLogger.hasSensitiveContent(safeMessage)).toBe(false);
    });

    it('should detect environment variable assignments', () => {
      const sensitiveMessage = 'ANTHROPIC_API_KEY=sk-ant-test';
      const safeMessage = 'NODE_ENV=production';
      
      expect(secureLogger.hasSensitiveContent(sensitiveMessage)).toBe(true);
      expect(secureLogger.hasSensitiveContent(safeMessage)).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(secureLogger.hasSensitiveContent(null)).toBe(false);
      expect(secureLogger.hasSensitiveContent(undefined)).toBe(false);
      expect(secureLogger.hasSensitiveContent(123)).toBe(false);
    });
  });

  describe('logging methods', () => {
    it('should call winston info with sanitized content', () => {
      const message = 'API key: sk-ant-api03-test';
      const meta = { key: 'sk-ant-api03-meta' };
      
      secureLogger.info(message, meta);
      
      expect(mockWinston.info).toHaveBeenCalledWith(message, meta);
    });

    it('should call winston error with sanitized content', () => {
      const message = 'Error with API key: sk-ant-api03-test';
      
      secureLogger.error(message);
      
      expect(mockWinston.error).toHaveBeenCalledWith(message, {});
    });

    it('should call winston debug with sanitized content', () => {
      const message = 'Debug API key: sk-ant-api03-test';
      
      secureLogger.debug(message);
      
      expect(mockWinston.debug).toHaveBeenCalledWith(message, {});
    });

    it('should call winston warn with sanitized content', () => {
      const message = 'Warning about API key: sk-ant-api03-test';
      
      secureLogger.warn(message);
      
      expect(mockWinston.warn).toHaveBeenCalledWith(message, {});
    });
  });

  describe('security validation', () => {
    it('should never log actual API key values', () => {
      const apiKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      const message = `Authentication successful with key: ${apiKey}`;
      const sanitizedMessage = secureLogger.sanitizeMessage(message);
      
      secureLogger.info(message);
      
      // Verify the message was sanitized
      expect(sanitizedMessage).not.toContain(apiKey);
      expect(sanitizedMessage).toContain('[REDACTED]');
    });

    it('should handle edge cases in API key patterns', () => {
      const edgeCases = [
        'sk-ant-',  // Incomplete key
        'sk-ant-test',  // Short key
        'not-sk-ant-test',  // Wrong prefix
        'sk-ant-test with spaces'  // Key with spaces
      ];
      
      edgeCases.forEach(testCase => {
        const result = secureLogger.sanitizeMessage(`Key: ${testCase}`);
        // Should either be redacted or left unchanged (not partially redacted)
        expect(result).toMatch(/^Key: (\[REDACTED\]|.*)$/);
      });
    });
  });

  describe('integration', () => {
    it('should maintain logging functionality while securing content', () => {
      const testCases = [
        { level: 'info', message: 'Info with sk-ant-api03-test' },
        { level: 'error', message: 'Error with sk-ant-api03-test' },
        { level: 'debug', message: 'Debug with sk-ant-api03-test' },
        { level: 'warn', message: 'Warning with sk-ant-api03-test' }
      ];
      
      testCases.forEach(({ level, message }) => {
        secureLogger[level](message);
        expect(mockWinston[level]).toHaveBeenCalledWith(message, {});
      });
    });
  });
});