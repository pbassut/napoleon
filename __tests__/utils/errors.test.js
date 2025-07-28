/**
 * Tests for Utils Errors - Custom error classes
 */

const {
  EnvironmentValidationError,
  ConfigurationError,
  FileSystemError,
} = require('../../src/utils/errors');

describe('Custom Error Classes', () => {
  describe('EnvironmentValidationError', () => {
    it('should create error with message only', () => {
      const error = new EnvironmentValidationError('Environment validation failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect(error.message).toBe('Environment validation failed');
      expect(error.name).toBe('EnvironmentValidationError');
      expect(error.code).toBeUndefined();
      expect(error.suggestion).toBeUndefined();
    });

    it('should create error with message and code', () => {
      const error = new EnvironmentValidationError('Git not found', 'GIT_NOT_FOUND');
      
      expect(error.message).toBe('Git not found');
      expect(error.code).toBe('GIT_NOT_FOUND');
      expect(error.name).toBe('EnvironmentValidationError');
      expect(error.suggestion).toBeUndefined();
    });

    it('should create error with message, code, and suggestion', () => {
      const error = new EnvironmentValidationError(
        'Node.js version too old',
        'NODE_VERSION_OLD',
        'Please upgrade to Node.js v16 or higher'
      );
      
      expect(error.message).toBe('Node.js version too old');
      expect(error.code).toBe('NODE_VERSION_OLD');
      expect(error.suggestion).toBe('Please upgrade to Node.js v16 or higher');
      expect(error.name).toBe('EnvironmentValidationError');
    });

    it('should have correct prototype chain', () => {
      const error = new EnvironmentValidationError('Test error');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof EnvironmentValidationError).toBe(true);
      expect(error.constructor).toBe(EnvironmentValidationError);
    });

    it('should capture stack trace', () => {
      const error = new EnvironmentValidationError('Stack trace test');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EnvironmentValidationError: Stack trace test');
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with message only', () => {
      const error = new ConfigurationError('Configuration invalid');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe('Configuration invalid');
      expect(error.name).toBe('ConfigurationError');
      expect(error.code).toBeUndefined();
      expect(error.suggestion).toBeUndefined();
    });

    it('should create error with message and code', () => {
      const error = new ConfigurationError('Missing API key', 'API_KEY_MISSING');
      
      expect(error.message).toBe('Missing API key');
      expect(error.code).toBe('API_KEY_MISSING');
      expect(error.name).toBe('ConfigurationError');
      expect(error.suggestion).toBeUndefined();
    });

    it('should create error with message, code, and suggestion', () => {
      const error = new ConfigurationError(
        'Invalid config format',
        'CONFIG_INVALID_FORMAT',
        'Check the config file syntax and try again'
      );
      
      expect(error.message).toBe('Invalid config format');
      expect(error.code).toBe('CONFIG_INVALID_FORMAT');
      expect(error.suggestion).toBe('Check the config file syntax and try again');
      expect(error.name).toBe('ConfigurationError');
    });

    it('should have correct prototype chain', () => {
      const error = new ConfigurationError('Test error');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ConfigurationError).toBe(true);
      expect(error.constructor).toBe(ConfigurationError);
    });

    it('should capture stack trace', () => {
      const error = new ConfigurationError('Stack trace test');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ConfigurationError: Stack trace test');
    });
  });

  describe('FileSystemError', () => {
    it('should create error with message only', () => {
      const error = new FileSystemError('File operation failed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.message).toBe('File operation failed');
      expect(error.name).toBe('FileSystemError');
      expect(error.code).toBeUndefined();
      expect(error.suggestion).toBeUndefined();
    });

    it('should create error with message and code', () => {
      const error = new FileSystemError('Permission denied', 'EACCES');
      
      expect(error.message).toBe('Permission denied');
      expect(error.code).toBe('EACCES');
      expect(error.name).toBe('FileSystemError');
      expect(error.suggestion).toBeUndefined();
    });

    it('should create error with message, code, and suggestion', () => {
      const error = new FileSystemError(
        'Directory not found',
        'ENOENT',
        'Create the directory before trying to access it'
      );
      
      expect(error.message).toBe('Directory not found');
      expect(error.code).toBe('ENOENT');
      expect(error.suggestion).toBe('Create the directory before trying to access it');
      expect(error.name).toBe('FileSystemError');
    });

    it('should have correct prototype chain', () => {
      const error = new FileSystemError('Test error');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof FileSystemError).toBe(true);
      expect(error.constructor).toBe(FileSystemError);
    });

    it('should capture stack trace', () => {
      const error = new FileSystemError('Stack trace test');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('FileSystemError: Stack trace test');
    });
  });

  describe('Error Differentiation', () => {
    it('should create distinct error types', () => {
      const envError = new EnvironmentValidationError('Env error');
      const configError = new ConfigurationError('Config error');
      const fsError = new FileSystemError('FS error');
      
      expect(envError instanceof EnvironmentValidationError).toBe(true);
      expect(envError instanceof ConfigurationError).toBe(false);
      expect(envError instanceof FileSystemError).toBe(false);
      
      expect(configError instanceof ConfigurationError).toBe(true);
      expect(configError instanceof EnvironmentValidationError).toBe(false);
      expect(configError instanceof FileSystemError).toBe(false);
      
      expect(fsError instanceof FileSystemError).toBe(true);
      expect(fsError instanceof EnvironmentValidationError).toBe(false);
      expect(fsError instanceof ConfigurationError).toBe(false);
    });

    it('should have different names', () => {
      const envError = new EnvironmentValidationError('Env error');
      const configError = new ConfigurationError('Config error');
      const fsError = new FileSystemError('FS error');
      
      expect(envError.name).toBe('EnvironmentValidationError');
      expect(configError.name).toBe('ConfigurationError');
      expect(fsError.name).toBe('FileSystemError');
    });
  });

  describe('Error Serialization', () => {
    it('should serialize EnvironmentValidationError correctly', () => {
      const error = new EnvironmentValidationError('Test error', 'TEST_CODE', 'Test suggestion');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.message).toBe('Test error');
      expect(parsed.code).toBe('TEST_CODE');
      expect(parsed.suggestion).toBe('Test suggestion');
      expect(parsed.name).toBe('EnvironmentValidationError');
    });

    it('should serialize ConfigurationError correctly', () => {
      const error = new ConfigurationError('Config error', 'CONFIG_CODE', 'Config suggestion');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.message).toBe('Config error');
      expect(parsed.code).toBe('CONFIG_CODE');
      expect(parsed.suggestion).toBe('Config suggestion');
      expect(parsed.name).toBe('ConfigurationError');
    });

    it('should serialize FileSystemError correctly', () => {
      const error = new FileSystemError('FS error', 'FS_CODE', 'FS suggestion');
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.message).toBe('FS error');
      expect(parsed.code).toBe('FS_CODE');
      expect(parsed.suggestion).toBe('FS suggestion');
      expect(parsed.name).toBe('FileSystemError');
    });
  });

  describe('Error toString', () => {
    it('should convert EnvironmentValidationError to string', () => {
      const error = new EnvironmentValidationError('Environment test error');
      const stringified = error.toString();
      
      expect(stringified).toBe('EnvironmentValidationError: Environment test error');
    });

    it('should convert ConfigurationError to string', () => {
      const error = new ConfigurationError('Configuration test error');
      const stringified = error.toString();
      
      expect(stringified).toBe('ConfigurationError: Configuration test error');
    });

    it('should convert FileSystemError to string', () => {
      const error = new FileSystemError('FileSystem test error');
      const stringified = error.toString();
      
      expect(stringified).toBe('FileSystemError: FileSystem test error');
    });
  });

  describe('Module Exports', () => {
    it('should export all error classes', () => {
      const errors = require('../../src/utils/errors');
      
      expect(errors.EnvironmentValidationError).toBeDefined();
      expect(errors.ConfigurationError).toBeDefined();
      expect(errors.FileSystemError).toBeDefined();
      
      expect(typeof errors.EnvironmentValidationError).toBe('function');
      expect(typeof errors.ConfigurationError).toBe('function');
      expect(typeof errors.FileSystemError).toBe('function');
    });

    it('should create instances from exported classes', () => {
      const errors = require('../../src/utils/errors');
      
      const envError = new errors.EnvironmentValidationError('Test');
      const configError = new errors.ConfigurationError('Test');
      const fsError = new errors.FileSystemError('Test');
      
      expect(envError instanceof errors.EnvironmentValidationError).toBe(true);
      expect(configError instanceof errors.ConfigurationError).toBe(true);
      expect(fsError instanceof errors.FileSystemError).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const error = new EnvironmentValidationError('');
      
      expect(error.message).toBe('');
      expect(error.name).toBe('EnvironmentValidationError');
    });

    it('should handle null/undefined values', () => {
      const error = new ConfigurationError('Test', null, undefined);
      
      expect(error.message).toBe('Test');
      expect(error.code).toBeNull();
      expect(error.suggestion).toBeUndefined();
    });

    it('should handle special characters in message', () => {
      const error = new FileSystemError('Error with éspecial çhars & symbols!');
      
      expect(error.message).toBe('Error with éspecial çhars & symbols!');
      expect(error.name).toBe('FileSystemError');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new EnvironmentValidationError(longMessage);
      
      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });
  });
});