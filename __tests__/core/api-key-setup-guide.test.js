const ApiKeySetupGuide = require('../../src/core/api-key-setup-guide');

describe('ApiKeySetupGuide', () => {
  let guide;
  let originalConsoleError;
  let originalConsoleLog;
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    guide = new ApiKeySetupGuide();
    
    // Mock console methods
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create an instance with logger', () => {
      expect(guide).toBeInstanceOf(ApiKeySetupGuide);
      expect(guide.logger).toBeDefined();
    });

    it('should require logger from utils', () => {
      expect(guide.logger).toBeDefined();
      expect(typeof guide.logger).toBe('object');
    });
  });

  describe('displayFormatError', () => {
    it('should display format error with masked API key for long keys', () => {
      const apiKey = 'sk-ant-api03-1234567890abcdefghijklmnop';
      
      guide.displayFormatError(apiKey);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Invalid API Key Format');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (sk-ant-***klmnop) does not match the expected Anthropic format.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n📋 Expected format: sk-ant-api03-[your-key-here]');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n🔗 Get your API key at: https://console.anthropic.com/');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Make sure to:');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   • Copy the complete key including the "sk-ant-" prefix');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   • Check for any extra spaces or characters');
      expect(consoleErrorSpy).toHaveBeenCalledWith('   • Ensure the key is not truncated');
    });

    it('should display format error with *** for short keys', () => {
      const apiKey = 'short';
      
      guide.displayFormatError(apiKey);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (***) does not match the expected Anthropic format.'
      );
    });

    it('should handle empty API key', () => {
      guide.displayFormatError('');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (***) does not match the expected Anthropic format.'
      );
    });

    it('should handle undefined API key', () => {
      guide.displayFormatError(undefined);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (***) does not match the expected Anthropic format.'
      );
    });

    it('should mask exactly 10 character key', () => {
      const apiKey = '1234567890';
      
      guide.displayFormatError(apiKey);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (***) does not match the expected Anthropic format.'
      );
    });

    it('should mask 11 character key properly', () => {
      const apiKey = '12345678901';
      
      guide.displayFormatError(apiKey);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (1234567***678901) does not match the expected Anthropic format.'
      );
    });
  });

  describe('displayMissingApiKeyMessage', () => {
    it('should display missing API key message with all options', () => {
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

    it('should call console.error exactly 8 times', () => {
      guide.displayMissingApiKeyMessage();
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(8);
    });
  });

  describe('displaySetupInstructions', () => {
    it('should display complete setup instructions', () => {
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

    it('should call console.log exactly 10 times', () => {
      guide.displaySetupInstructions();
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(10);
    });
  });

  describe('displayValidationSuccess', () => {
    it('should display success message with masked key', () => {
      const maskedKey = 'sk-ant-***abcd';
      
      guide.displayValidationSuccess(maskedKey);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\n✅ API key validated successfully (sk-ant-***abcd)');
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
    it('should display validation error with API_KEY_INVALID_FORMAT', () => {
      const error = {
        message: 'Invalid format detected',
        error: 'API_KEY_INVALID_FORMAT'
      };
      
      // Mock the displayFormatError method
      jest.spyOn(guide, 'displayFormatError').mockImplementation(() => {});
      
      guide.displayValidationError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: Invalid format detected');
      expect(guide.displayFormatError).toHaveBeenCalled();
    });

    it('should display validation error with API_KEY_MISSING', () => {
      const error = {
        message: 'No API key found',
        error: 'API_KEY_MISSING'
      };
      
      // Mock the displayMissingApiKeyMessage method
      jest.spyOn(guide, 'displayMissingApiKeyMessage').mockImplementation(() => {});
      
      guide.displayValidationError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: No API key found');
      expect(guide.displayMissingApiKeyMessage).toHaveBeenCalled();
    });

    it('should display generic validation error for unknown error types', () => {
      const error = {
        message: 'Network error',
        error: 'NETWORK_ERROR'
      };
      
      guide.displayValidationError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Please check your API key and try again.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔗 Get help at: https://console.anthropic.com/');
    });

    it('should handle error without error property', () => {
      const error = {
        message: 'Something went wrong'
      };
      
      guide.displayValidationError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: Something went wrong');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Please check your API key and try again.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔗 Get help at: https://console.anthropic.com/');
    });

    it('should handle error without message property', () => {
      const error = {
        error: 'UNKNOWN_ERROR'
      };
      
      guide.displayValidationError(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ API Key Validation Failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\nError: undefined');
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Please check your API key and try again.');
      expect(consoleErrorSpy).toHaveBeenCalledWith('🔗 Get help at: https://console.anthropic.com/');
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

  describe('Integration Tests', () => {
    it('should work with all methods called in sequence', () => {
      guide.displaySetupInstructions();
      guide.displayMissingApiKeyMessage();
      guide.displayFormatError('sk-ant-api03-test');
      guide.displayValidationSuccess('sk-ant-***test');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(11); // 10 from setup + 1 from success
      expect(consoleErrorSpy).toHaveBeenCalledTimes(16); // 8 from missing + 8 from format (including header)
    });

    it('should handle complex error scenarios', () => {
      const formatError = {
        message: 'Invalid format',
        error: 'API_KEY_INVALID_FORMAT'
      };
      
      const missingError = {
        message: 'Key not found',
        error: 'API_KEY_MISSING'  
      };
      
      jest.spyOn(guide, 'displayFormatError').mockImplementation(() => {});
      jest.spyOn(guide, 'displayMissingApiKeyMessage').mockImplementation(() => {});
      
      guide.displayValidationError(formatError);
      guide.displayValidationError(missingError);
      
      expect(guide.displayFormatError).toHaveBeenCalledTimes(1);
      expect(guide.displayMissingApiKeyMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null API key in displayFormatError', () => {
      guide.displayFormatError(null);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (***) does not match the expected Anthropic format.'
      );
    });

    it('should handle special characters in API key masking', () => {
      const apiKey = 'sk-ant-api03-!@#$%^&*()_+{}|:"<>?';
      
      guide.displayFormatError(apiKey);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (sk-ant-***|:"<>?) does not match the expected Anthropic format.'
      );
    });

    it('should handle very long API key', () => {
      const apiKey = 'sk-ant-api03-' + 'a'.repeat(100);
      
      guide.displayFormatError(apiKey);
      
      const expectedMasked = 'sk-ant-***aaaaaa';
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `\nThe provided API key (${expectedMasked}) does not match the expected Anthropic format.`
      );
    });

    it('should handle API key exactly 13 characters (7+6)', () => {
      const apiKey = '1234567890123';
      
      guide.displayFormatError(apiKey);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '\nThe provided API key (1234567***890123) does not match the expected Anthropic format.'
      );
    });
  });
});