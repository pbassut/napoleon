/**
 * Tests for API Key Validator
 */

const ApiKeyValidator = require('../../src/core/api-key-validator');

describe('ApiKeyValidator', () => {
  let validator;
  let originalEnv;

  beforeEach(() => {
    validator = new ApiKeyValidator();
    originalEnv = { ...process.env };
    // Clear the API key from environment
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should initialize with logger', () => {
      expect(validator).toBeDefined();
      expect(validator.logger).toBeDefined();
    });
  });

  describe('validateApiKey', () => {
    describe('API key validation logic', () => {
      it('should validate a correct API key format', async () => {
        const validKey = 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz123456';
        
        const result = await validator.validateApiKey(validKey);

        expect(result.isValid).toBe(true);
        expect(result.maskedKey).toBe('sk-ant-***123456');
        expect(result.error).toBeUndefined();
        expect(result.message).toBeUndefined();
      });

      it('should reject invalid API key format', async () => {
        const invalidKey = 'invalid-key-format';
        
        const result = await validator.validateApiKey(invalidKey);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_INVALID_FORMAT');
        expect(result.message).toBe('API key does not match expected Anthropic format');
        expect(result.maskedKey).toBeUndefined();
      });

      it('should handle missing API key parameter', async () => {
        const result = await validator.validateApiKey();

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_MISSING');
        expect(result.message).toBe('ANTHROPIC_API_KEY environment variable is not set');
      });

      it('should handle null API key parameter', async () => {
        const result = await validator.validateApiKey(null);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_MISSING');
        expect(result.message).toBe('ANTHROPIC_API_KEY environment variable is not set');
      });

      it('should handle empty string API key parameter', async () => {
        const result = await validator.validateApiKey('');

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_MISSING');
        expect(result.message).toBe('ANTHROPIC_API_KEY environment variable is not set');
      });
    });

    describe('Environment variable handling', () => {
      it('should use environment variable when no key provided', async () => {
        const envKey = 'sk-ant-api03-env-key-test-1234567890abcdefghijklmnop';
        process.env.ANTHROPIC_API_KEY = envKey;

        const result = await validator.validateApiKey();

        expect(result.isValid).toBe(true);
        expect(result.maskedKey).toBe('sk-ant-***mnop');
      });

      it('should prefer provided key over environment variable', async () => {
        process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-env-key-1234567890';
        const providedKey = 'sk-ant-api03-provided-key-1234567890abcdef';

        const result = await validator.validateApiKey(providedKey);

        expect(result.isValid).toBe(true);
        expect(result.maskedKey).toBe('sk-ant-***cdef');
      });

      it('should handle missing environment variable', async () => {
        delete process.env.ANTHROPIC_API_KEY;

        const result = await validator.validateApiKey();

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_MISSING');
      });

      it('should handle empty environment variable', async () => {
        process.env.ANTHROPIC_API_KEY = '';

        const result = await validator.validateApiKey();

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_MISSING');
      });
    });

    describe('Error handling', () => {
      it('should handle validation errors gracefully', async () => {
        // Mock the maskApiKey method to throw an error
        const originalMaskApiKey = validator.maskApiKey;
        validator.maskApiKey = jest.fn().mockImplementation(() => {
          throw new Error('Masking failed');
        });

        // Mock logger to verify error logging
        validator.logger.error = jest.fn();

        const validKey = 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz123456';
        const result = await validator.validateApiKey(validKey);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_VALIDATION_FAILED');
        expect(result.message).toBe('Failed to validate API key');
        expect(validator.logger.error).toHaveBeenCalledWith('API key validation failed:', expect.any(Error));

        // Restore original method
        validator.maskApiKey = originalMaskApiKey;
      });

      it('should handle errors in format checking', async () => {
        // Mock isValidKeyFormat to throw an error
        const originalIsValidKeyFormat = validator.isValidKeyFormat;
        validator.isValidKeyFormat = jest.fn().mockImplementation(() => {
          throw new Error('Format check failed');
        });

        validator.logger.error = jest.fn();

        const validKey = 'sk-ant-api03-test-key';
        const result = await validator.validateApiKey(validKey);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('API_KEY_VALIDATION_FAILED');
        expect(validator.logger.error).toHaveBeenCalled();

        // Restore original method
        validator.isValidKeyFormat = originalIsValidKeyFormat;
      });
    });
  });

  describe('isValidKeyFormat', () => {
    describe('Valid formats', () => {
      it('should accept valid Anthropic API key format', () => {
        const validKeys = [
          'sk-ant-api03-1234567890abc',
          'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890',
          'sk-ant-test-1234567890',
          'sk-ant-production-key-123456789012345',
        ];

        validKeys.forEach(key => {
          expect(validator.isValidKeyFormat(key)).toBe(true);
        });
      });

      it('should handle exactly minimum length keys', () => {
        const minValidKey = 'sk-ant-1234'; // 11 characters
        expect(validator.isValidKeyFormat(minValidKey)).toBe(true);
      });
    });

    describe('Invalid formats', () => {
      it('should reject keys that do not start with sk-ant-', () => {
        const invalidKeys = [
          'invalid-key-format',
          'sk-openai-1234567890',
          'ant-sk-1234567890',
          'key-sk-ant-1234567890',
        ];

        invalidKeys.forEach(key => {
          expect(validator.isValidKeyFormat(key)).toBe(false);
        });
      });

      it('should reject keys that are too short', () => {
        const shortKeys = [
          'sk-ant-',
          'sk-ant-12',
          'sk-ant-123',
          'sk-ant-12345', // 10 characters
        ];

        shortKeys.forEach(key => {
          expect(validator.isValidKeyFormat(key)).toBe(false);
        });
      });

      it('should reject non-string inputs', () => {
        const nonStringInputs = [
          null,
          undefined,
          123,
          {},
          [],
          true,
          false,
        ];

        nonStringInputs.forEach(input => {
          expect(validator.isValidKeyFormat(input)).toBe(false);
        });
      });

      it('should reject empty strings', () => {
        expect(validator.isValidKeyFormat('')).toBe(false);
      });

      it('should handle keys with exactly 10 characters', () => {
        const tenCharKey = 'sk-ant-123'; // 10 characters exactly
        expect(validator.isValidKeyFormat(tenCharKey)).toBe(false);
      });
    });
  });

  describe('maskApiKey', () => {
    describe('Proper masking', () => {
      it('should mask long API keys correctly', () => {
        const longKey = 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz123456';
        const masked = validator.maskApiKey(longKey);
        
        expect(masked).toBe('sk-ant-***123456');
        expect(masked.length).toBeLessThan(longKey.length);
      });

      it('should mask medium length keys correctly', () => {
        const mediumKey = 'sk-ant-api03-12345';
        const masked = validator.maskApiKey(mediumKey);
        
        expect(masked).toBe('sk-ant-***12345');
      });

      it('should handle exactly 10 character keys', () => {
        const tenCharKey = '1234567890';
        const masked = validator.maskApiKey(tenCharKey);
        
        expect(masked).toBe('1234567***567890');
      });

      it('should preserve first 7 and last 6 characters', () => {
        const testKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456';
        const masked = validator.maskApiKey(testKey);
        
        expect(masked.startsWith('sk-ant-')).toBe(true);
        expect(masked.endsWith('123456')).toBe(true);
        expect(masked.includes('***')).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle short keys with default masking', () => {
        const shortKeys = [
          '',
          'short',
          '123456789', // 9 characters
        ];

        shortKeys.forEach(key => {
          expect(validator.maskApiKey(key)).toBe('***');
        });
      });

      it('should handle null and undefined keys', () => {
        expect(validator.maskApiKey(null)).toBe('***');
        expect(validator.maskApiKey(undefined)).toBe('***');
      });

      it('should handle empty string', () => {
        expect(validator.maskApiKey('')).toBe('***');
      });

      it('should handle non-string inputs', () => {
        const nonStringInputs = [
          123,
          {},
          [],
          true,
          false,
        ];

        nonStringInputs.forEach(input => {
          expect(validator.maskApiKey(input)).toBe('***');
        });
      });

      it('should handle exactly 9 character keys', () => {
        const nineCharKey = '123456789';
        expect(validator.maskApiKey(nineCharKey)).toBe('***');
      });
    });
  });

  describe('Integration tests', () => {
    it('should work end-to-end with valid key', async () => {
      const validKey = 'sk-ant-api03-test-key-1234567890abcdefghijklmnop';
      
      const result = await validator.validateApiKey(validKey);

      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***mnop');
      expect(result.error).toBeUndefined();
      expect(result.message).toBeUndefined();
    });

    it('should work end-to-end with invalid key', async () => {
      const invalidKey = 'not-a-valid-anthropic-key';
      
      const result = await validator.validateApiKey(invalidKey);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API_KEY_INVALID_FORMAT');
      expect(result.maskedKey).toBeUndefined();
    });

    it('should work with environment variable flow', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-env-test-1234567890abcdef';
      
      const result = await validator.validateApiKey();

      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***cdef');
    });

    it('should handle mixed valid and invalid scenarios', async () => {
      // Test with invalid env var but valid parameter
      process.env.ANTHROPIC_API_KEY = 'invalid-env-key';
      const validKey = 'sk-ant-api03-valid-param-key-1234567890';
      
      const result = await validator.validateApiKey(validKey);

      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***7890');
    });
  });

  describe('Logger integration', () => {
    it('should use logger for error reporting', async () => {
      // Mock logger
      validator.logger.error = jest.fn();

      // Force an error by mocking format validation to throw
      const originalIsValidKeyFormat = validator.isValidKeyFormat;
      validator.isValidKeyFormat = jest.fn().mockImplementation(() => {
        throw new Error('Format validation error');
      });

      await validator.validateApiKey('sk-ant-test-key');

      expect(validator.logger.error).toHaveBeenCalledWith(
        'API key validation failed:', 
        expect.any(Error)
      );

      // Restore
      validator.isValidKeyFormat = originalIsValidKeyFormat;
    });

    it('should have logger instance available', () => {
      expect(validator.logger).toBeDefined();
      expect(typeof validator.logger).toBe('object');
    });
  });
});