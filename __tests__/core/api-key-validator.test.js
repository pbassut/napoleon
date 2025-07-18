const ApiKeyValidator = require('../../src/core/api-key-validator');
const { EnvironmentValidationError, ConfigurationError } = require('../../src/utils/errors');
const logger = require('../../src/utils/logger');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe('ApiKeyValidator', () => {
  let validator;
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new ApiKeyValidator();
    // Store original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      expect(validator.logger).toBe(logger);
    });
  });

  describe('getApiKeyFromEnvironment', () => {
    it('should return API key from ANTHROPIC_API_KEY', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      
      const result = validator.getApiKeyFromEnvironment();
      
      expect(result).toBe('sk-ant-test-key');
    });

    it('should return API key from CLAUDE_API_KEY', () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.CLAUDE_API_KEY = 'sk-ant-claude-key';
      
      const result = validator.getApiKeyFromEnvironment();
      
      expect(result).toBe('sk-ant-claude-key');
    });

    it('should return API key from CLAUDE_CODE_API_KEY', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;
      process.env.CLAUDE_CODE_API_KEY = 'sk-ant-code-key';
      
      const result = validator.getApiKeyFromEnvironment();
      
      expect(result).toBe('sk-ant-code-key');
    });

    it('should trim whitespace from API key', () => {
      process.env.ANTHROPIC_API_KEY = '  sk-ant-test-key  ';
      
      const result = validator.getApiKeyFromEnvironment();
      
      expect(result).toBe('sk-ant-test-key');
    });

    it('should return null when no API key is found', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;
      delete process.env.CLAUDE_CODE_API_KEY;
      
      const result = validator.getApiKeyFromEnvironment();
      
      expect(result).toBeNull();
    });

    it('should return null for empty API key', () => {
      process.env.ANTHROPIC_API_KEY = '';
      
      const result = validator.getApiKeyFromEnvironment();
      
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only API key', () => {
      process.env.ANTHROPIC_API_KEY = '   ';
      
      const result = validator.getApiKeyFromEnvironment();
      
      expect(result).toBeNull();
    });
  });

  describe('validateKeyFormat', () => {
    it('should validate correct API key format', () => {
      const validKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      
      const result = validator.validateKeyFormat(validKey);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject API key that is too short', () => {
      const shortKey = 'sk-ant-short';
      
      const result = validator.validateKeyFormat(shortKey);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('API key appears too short');
    });

    it('should reject API key that is too long', () => {
      const longKey = 'sk-ant-' + 'a'.repeat(200);
      
      const result = validator.validateKeyFormat(longKey);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('API key appears too long');
    });

    it('should reject API key with invalid characters', () => {
      const invalidKey = 'sk-ant-api03-test@#$%^&*()abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      
      const result = validator.validateKeyFormat(invalidKey);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('API key contains invalid characters');
    });

    it('should reject API key with spaces', () => {
      const spacedKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef 1234';
      
      const result = validator.validateKeyFormat(spacedKey);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('API key contains spaces');
    });

    it('should reject API key without correct prefix', () => {
      const noPrefixKey = 'api-key-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      
      const result = validator.validateKeyFormat(noPrefixKey);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('API key does not start with expected prefix');
    });
  });

  describe('maskApiKey', () => {
    it('should mask normal length API key correctly', () => {
      const apiKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      
      const result = validator.maskApiKey(apiKey);
      
      expect(result).toMatch(/^sk-ant-\*+1234$/);
      expect(result.length).toBeGreaterThan(15);
    });

    it('should handle short API key', () => {
      const shortKey = 'sk-ant-123';
      
      const result = validator.maskApiKey(shortKey);
      
      expect(result).toBe('sk-ant-***');
    });

    it('should limit mask length for very long keys', () => {
      const longKey = 'sk-ant-' + 'a'.repeat(100) + '1234';
      
      const result = validator.maskApiKey(longKey);
      
      expect(result).toMatch(/^sk-ant-\*{20}1234$/);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      const validKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      process.env.ANTHROPIC_API_KEY = validKey;
      
      const result = await validator.validateApiKey();
      
      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toMatch(/^sk-ant-\*+1234$/);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('API key validated successfully')
      );
    });

    it('should throw EnvironmentValidationError when API key not found', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;
      delete process.env.CLAUDE_CODE_API_KEY;
      
      await expect(validator.validateApiKey())
        .rejects
        .toThrow(EnvironmentValidationError);
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('API key validation failed')
      );
    });

    it('should throw ConfigurationError for invalid format', async () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-key';
      
      await expect(validator.validateApiKey())
        .rejects
        .toThrow(ConfigurationError);
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('API key validation failed')
      );
    });

    it('should handle validation errors properly', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-short';
      
      try {
        await validator.validateApiKey();
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect(error.message).toContain('Invalid API key format');
        expect(error.code).toBe('INVALID_API_KEY_FORMAT');
        expect(error.suggestion).toBe('Please check your API key format and try again');
      }
    });
  });

  describe('error handling', () => {
    it('should provide proper error details for missing API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;
      delete process.env.CLAUDE_CODE_API_KEY;
      
      try {
        await validator.validateApiKey();
      } catch (error) {
        expect(error).toBeInstanceOf(EnvironmentValidationError);
        expect(error.code).toBe('API_KEY_NOT_FOUND');
        expect(error.suggestion).toContain('Set ANTHROPIC_API_KEY environment variable');
      }
    });

    it('should provide proper error details for format issues', async () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-format';
      
      try {
        await validator.validateApiKey();
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect(error.code).toBe('INVALID_API_KEY_FORMAT');
        expect(error.suggestion).toBe('Please check your API key format and try again');
      }
    });
  });
});