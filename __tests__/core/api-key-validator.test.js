const ApiKeyValidator = require('../../src/core/api-key-validator');

describe('ApiKeyValidator', () => {
  let validator;
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    validator = new ApiKeyValidator();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create an instance with logger', () => {
      expect(validator).toBeInstanceOf(ApiKeyValidator);
      expect(validator.logger).toBeDefined();
    });

    it('should require logger from utils', () => {
      expect(validator.logger).toBeDefined();
      expect(typeof validator.logger).toBe('object');
    });
  });

  describe('validateApiKey', () => {
    it('should validate a valid API key format', async () => {
      const validApiKey = 'sk-ant-api03-1234567890abcdefghij_klmnopqrstuvwxyz';
      
      const result = await validator.validateApiKey(validApiKey);
      
      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***uvwxyz');
      expect(result.error).toBeUndefined();
    });

    it('should use environment variable when no API key provided', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-env-test-key-123456789';
      
      const result = await validator.validateApiKey();
      
      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***456789');
    });

    it('should return error when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      const result = await validator.validateApiKey();
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_MISSING');
      expect(result.message).toBe('ANTHROPIC_API_KEY environment variable is not set');
      expect(result.maskedKey).toBeUndefined();
    });

    it('should return error when provided API key is null', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      const result = await validator.validateApiKey(null);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_MISSING');
      expect(result.message).toBe('ANTHROPIC_API_KEY environment variable is not set');
    });

    it('should return error when provided API key is empty string', async () => {
      const result = await validator.validateApiKey('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_INVALID_FORMAT');
      expect(result.message).toBe('API key does not match expected Anthropic format');
    });

    it('should return error for invalid API key format', async () => {
      const invalidApiKey = 'invalid-key-format';
      
      const result = await validator.validateApiKey(invalidApiKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_INVALID_FORMAT');
      expect(result.message).toBe('API key does not match expected Anthropic format');
      expect(result.maskedKey).toBeUndefined();
    });

    it('should return error for short API key', async () => {
      const shortKey = 'sk-ant-';
      
      const result = await validator.validateApiKey(shortKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_INVALID_FORMAT');
      expect(result.message).toBe('API key does not match expected Anthropic format');
    });

    it('should return error for API key without sk-ant- prefix', async () => {
      const invalidKey = 'openai-api-key-1234567890';
      
      const result = await validator.validateApiKey(invalidKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_INVALID_FORMAT');
      expect(result.message).toBe('API key does not match expected Anthropic format');
    });

    it('should handle validation errors gracefully', async () => {
      const validApiKey = 'sk-ant-api03-test-key-123456789';
      
      // Mock the maskApiKey method to throw an error
      jest.spyOn(validator, 'maskApiKey').mockImplementation(() => {
        throw new Error('Masking failed');
      });
      
      // Mock logger.error
      jest.spyOn(validator.logger, 'error').mockImplementation(() => {});
      
      const result = await validator.validateApiKey(validApiKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_VALIDATION_FAILED');
      expect(result.message).toBe('Failed to validate API key');
      expect(validator.logger.error).toHaveBeenCalledWith('API key validation failed:', expect.any(Error));
    });

    it('should prefer provided API key over environment variable', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-env-key-123456789';
      const providedKey = 'sk-ant-api03-provided-key-123456789';
      
      const result = await validator.validateApiKey(providedKey);
      
      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***456789');
    });
  });

  describe('isValidKeyFormat', () => {
    it('should return true for valid Anthropic API key format', () => {
      const validKeys = [
        'sk-ant-api03-1234567890',
        'sk-ant-api03-abcdefghijklmnop',
        'sk-ant-api03-' + 'x'.repeat(50),
        'sk-ant-api03-test_key-123',
        'sk-ant-api03-test-key-123-456'
      ];
      
      validKeys.forEach(key => {
        expect(validator.isValidKeyFormat(key)).toBe(true);
      });
    });

    it('should return false for invalid API key formats', () => {
      const invalidKeys = [
        'sk-openai-123',
        'openai-key-123',
        'not-an-api-key',
        '',
        null,
        undefined,
        123,
        {},
        []
      ];
      
      invalidKeys.forEach(key => {
        expect(validator.isValidKeyFormat(key)).toBe(false);
      });
    });

    it('should return false for keys that are too short', () => {
      const shortKeys = [
        'sk-ant-1',
        'sk-ant-12',
        'sk-ant-123'
      ];
      
      shortKeys.forEach(key => {
        expect(validator.isValidKeyFormat(key)).toBe(false);
      });
    });

    it('should return false for non-string inputs', () => {
      const nonStringInputs = [
        null,
        undefined,
        123,
        true,
        false,
        {},
        [],
        Symbol('test')
      ];
      
      nonStringInputs.forEach(input => {
        expect(validator.isValidKeyFormat(input)).toBe(false);
      });
    });

    it('should return true for very long valid keys', () => {
      const longKey = 'sk-ant-api03-' + 'a'.repeat(100);
      expect(validator.isValidKeyFormat(longKey)).toBe(true);
    });

    it('should be case sensitive', () => {
      expect(validator.isValidKeyFormat('SK-ANT-API03-1234567890')).toBe(false);
      expect(validator.isValidKeyFormat('sk-ANT-api03-1234567890')).toBe(false);
      expect(validator.isValidKeyFormat('sk-ant-API03-1234567890')).toBe(true);
    });
  });

  describe('maskApiKey', () => {
    it('should mask long API keys correctly', () => {
      const longKey = 'sk-ant-api03-1234567890abcdefghijklmnop';
      const masked = validator.maskApiKey(longKey);
      
      expect(masked).toBe('sk-ant-***klmnop');
      expect(masked.length).toBeLessThan(longKey.length);
    });

    it('should return *** for short keys', () => {
      const shortKeys = [
        'short',
        'sk-ant-',
        '123456789',  // exactly 9 chars
        ''
      ];
      
      shortKeys.forEach(key => {
        expect(validator.maskApiKey(key)).toBe('***');
      });
    });

    it('should return *** for null or undefined keys', () => {
      expect(validator.maskApiKey(null)).toBe('***');
      expect(validator.maskApiKey(undefined)).toBe('***');
    });

    it('should handle exactly 10 character keys', () => {
      const tenCharKey = '1234567890';
      expect(validator.maskApiKey(tenCharKey)).toBe('1234567***567890');
    });

    it('should handle 11+ character keys properly', () => {
      const elevenCharKey = '12345678901';
      expect(validator.maskApiKey(elevenCharKey)).toBe('1234567***678901');
      
      const twelveCharKey = '123456789012';
      expect(validator.maskApiKey(twelveCharKey)).toBe('1234567***789012');
    });

    it('should preserve special characters in masking', () => {
      const keyWithSpecialChars = 'sk-ant-api03-test_key-123!@#$%^&*()';
      const masked = validator.maskApiKey(keyWithSpecialChars);
      
      expect(masked).toBe('sk-ant-***%^&*()');
      expect(masked).toContain('***');
    });

    it('should handle unicode characters', () => {
      const unicodeKey = 'sk-ant-api03-test-éñ-123456789';
      const masked = validator.maskApiKey(unicodeKey);
      
      expect(masked).toBe('sk-ant-***456789');
    });

    it('should handle minimum maskable length (11 chars)', () => {
      const minKey = 'sk-ant-test';  // 11 chars
      expect(validator.maskApiKey(minKey)).toBe('sk-ant-***t-test');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete validation workflow', async () => {
      const testKey = 'sk-ant-api03-integration-test-key-123456';
      
      // Test format validation
      expect(validator.isValidKeyFormat(testKey)).toBe(true);
      
      // Test masking
      expect(validator.maskApiKey(testKey)).toBe('sk-ant-***123456');
      
      // Test full validation
      const result = await validator.validateApiKey(testKey);
      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***123456');
    });

    it('should handle invalid key workflow', async () => {
      const invalidKey = 'invalid-key';
      
      // Test format validation
      expect(validator.isValidKeyFormat(invalidKey)).toBe(false);
      
      // Test full validation
      const result = await validator.validateApiKey(invalidKey);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_INVALID_FORMAT');
    });

    it('should handle environment variable fallback workflow', async () => {
      const envKey = 'sk-ant-api03-env-fallback-key-789012';
      process.env.ANTHROPIC_API_KEY = envKey;
      
      const result = await validator.validateApiKey();
      
      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***789012');
    });
  });

  describe('Edge Cases', () => {
    it('should handle keys with exactly required minimum length', () => {
      const minValidKey = 'sk-ant-api03-x';  // 14 chars, just over minimum
      
      const result = validator.isValidKeyFormat(minValidKey);
      expect(result).toBe(true);
    });

    it('should handle very specific API key patterns', () => {
      const specificKeys = [
        'sk-ant-api03-',  // Minimum prefix + nothing else
        'sk-ant-api03-a',  // Minimum prefix + 1 char
        'sk-ant-api03-ab',  // Minimum prefix + 2 chars
      ];
      
      specificKeys.forEach(key => {
        const isValid = validator.isValidKeyFormat(key);
        const expected = key.length > 10;
        expect(isValid).toBe(expected);
      });
    });

    it('should handle concurrent validation calls', async () => {
      const keys = [
        'sk-ant-api03-concurrent-test-1-123456',
        'sk-ant-api03-concurrent-test-2-789012',
        'sk-ant-api03-concurrent-test-3-345678'
      ];
      
      const promises = keys.map(key => validator.validateApiKey(key));
      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.isValid).toBe(true);
        expect(result.maskedKey).toContain('***');
      });
    });

    it('should handle logger error without throwing', async () => {
      // Mock maskApiKey to throw to trigger the catch block
      jest.spyOn(validator, 'maskApiKey').mockImplementation(() => {
        throw new Error('Masking failed');
      });
      
      // Mock logger.error to not throw during catch handling
      jest.spyOn(validator.logger, 'error').mockImplementation(() => {});
      
      const result = await validator.validateApiKey('sk-ant-api03-test-error-handling');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_VALIDATION_FAILED');
    });
  });
});