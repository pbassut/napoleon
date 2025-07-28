/**
 * Tests for API Key Setup Guide
 */

const ApiKeySetupGuide = require('../../src/core/api-key-setup-guide');

describe('ApiKeySetupGuide', () => {
  let guide;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    guide = new ApiKeySetupGuide();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with logger', () => {
      expect(guide).toBeDefined();
      expect(guide.logger).toBeDefined();
    });
  });

  describe('displayFormatError', () => {
    it('should display format error for long API key', () => {
      const longApiKey = 'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz123456';
      
      guide.displayFormatError(longApiKey);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Invalid API Key Format');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nThe provided API key (sk-ant-***123456) does not match the expected Anthropic format.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n📋 Expected format: sk-ant-api03-[your-key-here]');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n🔗 Get your API key at: https://console.anthropic.com/');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Make sure to:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   • Copy the complete key including the "sk-ant-" prefix');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   • Check for any extra spaces or characters');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   • Ensure the key is not truncated');
    });

    it('should display format error for short API key', () => {
      const shortApiKey = 'short';
      
      guide.displayFormatError(shortApiKey);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nThe provided API key (***) does not match the expected Anthropic format.');
    });

    it('should handle empty API key', () => {
      guide.displayFormatError('');

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nThe provided API key (***) does not match the expected Anthropic format.');
    });

    it('should handle no API key parameter', () => {
      guide.displayFormatError();

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nThe provided API key (***) does not match the expected Anthropic format.');
    });

    it('should handle exactly 10 character API key', () => {
      const tenCharKey = '1234567890';
      
      guide.displayFormatError(tenCharKey);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nThe provided API key (***) does not match the expected Anthropic format.');
    });

    it('should handle exactly 11 character API key', () => {
      const elevenCharKey = '12345678901';
      
      guide.displayFormatError(elevenCharKey);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nThe provided API key (1234567***78901) does not match the expected Anthropic format.');
    });

    it('should mask medium length API key correctly', () => {
      const mediumKey = 'sk-ant-api03-medium';
      
      guide.displayFormatError(mediumKey);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\nThe provided API key (sk-ant-***medium) does not match the expected Anthropic format.');
    });
  });

  describe('displayMissingApiKeyMessage', () => {
    it('should display missing API key message', () => {
      guide.displayMissingApiKeyMessage();

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Missing');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nNo Anthropic API key found. Please set your API key using one of these methods:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n🔧 Option 1: Environment Variable');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n🔧 Option 2: .env file');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   Create a .env file in your project root:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n🔗 Get your API key at: https://console.anthropic.com/');
    });
  });

  describe('displaySetupInstructions', () => {
    it('should display setup instructions', () => {
      guide.displaySetupInstructions();

      expect(consoleLogSpy).toHaveBeenCalledWith('\n🔑 API Key Setup Guide');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n1. Visit https://console.anthropic.com/');
      expect(consoleLogSpy).toHaveBeenCalledWith('2. Sign in or create an account');
      expect(consoleLogSpy).toHaveBeenCalledWith('3. Navigate to your API Keys section');
      expect(consoleLogSpy).toHaveBeenCalledWith('4. Create a new API key');
      expect(consoleLogSpy).toHaveBeenCalledWith('5. Copy the key (starts with "sk-ant-")');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n6. Set the key using one of these methods:');
      expect(consoleLogSpy).toHaveBeenCalledWith('   • Environment variable: export ANTHROPIC_API_KEY="your-key"');
      expect(consoleLogSpy).toHaveBeenCalledWith('   • .env file: ANTHROPIC_API_KEY=your-key');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n✅ Your API key will be validated automatically on next run.');
    });
  });

  describe('displayValidationSuccess', () => {
    it('should display validation success message', () => {
      const maskedKey = 'sk-ant-***xyz123';
      
      guide.displayValidationSuccess(maskedKey);

      expect(consoleLogSpy).toHaveBeenCalledWith(`\n✅ API key validated successfully (${maskedKey})`);
    });

    it('should handle empty masked key', () => {
      guide.displayValidationSuccess('');

      expect(consoleLogSpy).toHaveBeenCalledWith('\n✅ API key validated successfully ()');
    });

    it('should handle undefined masked key', () => {
      guide.displayValidationSuccess(undefined);

      expect(consoleLogSpy).toHaveBeenCalledWith('\n✅ API key validated successfully (undefined)');
    });
  });

  describe('displayValidationError', () => {
    it('should display validation error for invalid format', () => {
      const error = {
        message: 'Invalid API key format',
        error: 'API_KEY_INVALID_FORMAT'
      };

      // Spy on the displayFormatError method
      const displayFormatErrorSpy = jest.spyOn(guide, 'displayFormatError').mockImplementation(() => {});

      guide.displayValidationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: Invalid API key format');
      expect(displayFormatErrorSpy).toHaveBeenCalled();

      displayFormatErrorSpy.mockRestore();
    });

    it('should display validation error for missing API key', () => {
      const error = {
        message: 'API key is required',
        error: 'API_KEY_MISSING'
      };

      // Spy on the displayMissingApiKeyMessage method
      const displayMissingApiKeyMessageSpy = jest.spyOn(guide, 'displayMissingApiKeyMessage').mockImplementation(() => {});

      guide.displayValidationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: API key is required');
      expect(displayMissingApiKeyMessageSpy).toHaveBeenCalled();

      displayMissingApiKeyMessageSpy.mockRestore();
    });

    it('should display generic validation error', () => {
      const error = {
        message: 'Generic API error',
        error: 'UNKNOWN_ERROR'
      };

      guide.displayValidationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: Generic API error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Please check your API key and try again.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔗 Get help at: https://console.anthropic.com/');
    });

    it('should handle error without error property', () => {
      const error = {
        message: 'Some error without error code'
      };

      guide.displayValidationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: Some error without error code');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Please check your API key and try again.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔗 Get help at: https://console.anthropic.com/');
    });

    it('should handle error without message property', () => {
      const error = {
        error: 'API_KEY_INVALID_FORMAT'
      };

      const displayFormatErrorSpy = jest.spyOn(guide, 'displayFormatError').mockImplementation(() => {});

      guide.displayValidationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: undefined');
      expect(displayFormatErrorSpy).toHaveBeenCalled();

      displayFormatErrorSpy.mockRestore();
    });

    it('should handle empty error object', () => {
      const error = {};

      guide.displayValidationError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: undefined');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Please check your API key and try again.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔗 Get help at: https://console.anthropic.com/');
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle all console methods being called', () => {
      // Test a complete flow that uses both console.log and console.error
      guide.displaySetupInstructions();
      guide.displayMissingApiKeyMessage();

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle rapid successive calls', () => {
      guide.displayValidationSuccess('key1');
      guide.displayValidationSuccess('key2');
      guide.displayValidationSuccess('key3');

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle null error object', () => {
      const error = null;

      expect(() => {
        guide.displayValidationError(error);
      }).toThrow();
    });

    it('should work with real logger instance', () => {
      // Verify that the logger is properly required
      expect(guide.logger).toBeDefined();
      expect(typeof guide.logger).toBe('object');
    });

    it('should handle API key masking edge cases', () => {
      // Test boundary conditions for API key masking
      const testCases = [
        { input: '', expected: '***' },
        { input: 'a', expected: '***' },
        { input: '1234567890', expected: '***' },
        { input: '12345678901', expected: '1234567***78901' },
        { input: 'sk-ant-test', expected: '***' },
        { input: 'sk-ant-api03-123456', expected: 'sk-ant-***123456' },
      ];

      testCases.forEach(({ input, expected }) => {
        consoleErrorSpy.mockClear();
        guide.displayFormatError(input);
        
        const errorCall = consoleErrorSpy.mock.calls.find(call => 
          call[0].includes('The provided API key')
        );
        expect(errorCall[0]).toContain(`(${expected})`);
      });
    });
  });
});