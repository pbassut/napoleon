const { EnvironmentValidationError, ConfigurationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * API Key Validator
 * Validates Anthropic API keys with format checking and secure masking
 */
class ApiKeyValidator {
  constructor() {
    this.logger = logger;
  }

  /**
   * Validate API key from environment
   * @returns {Promise<Object>} Validation result with masked key
   */
  async validateApiKey() {
    try {
      const apiKey = this.getApiKeyFromEnvironment();

      if (!apiKey) {
        throw new EnvironmentValidationError(
          'API key not found in environment variables',
          'API_KEY_NOT_FOUND',
          'Set ANTHROPIC_API_KEY environment variable with your Anthropic API key',
        );
      }

      const validation = this.validateKeyFormat(apiKey);

      if (!validation.isValid) {
        throw new ConfigurationError(
          `Invalid API key format: ${validation.reason}`,
          'INVALID_API_KEY_FORMAT',
          'Please check your API key format and try again',
        );
      }

      // Log successful validation without exposing key
      this.logger.info(`API key validated successfully (${this.maskApiKey(apiKey)})`);

      return {
        isValid: true,
        maskedKey: this.maskApiKey(apiKey),
      };
    } catch (error) {
      this.logger.error(`API key validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get API key from environment variables
   * @returns {string|null} API key or null if not found
   */
  getApiKeyFromEnvironment() {
    // Check multiple possible environment variable names
    const possibleKeys = [
      'ANTHROPIC_API_KEY',
      'CLAUDE_API_KEY',
      'CLAUDE_CODE_API_KEY',
    ];

    for (const keyName of possibleKeys) {
      const value = process.env[keyName];
      if (value && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  /**
   * Validate API key format without network calls
   * @param {string} apiKey - API key to validate
   * @returns {Object} Validation result
   */
  validateKeyFormat(apiKey) {
    // Basic format validation without network calls
    const validations = [
      {
        test: apiKey.length >= 50,
        reason: 'API key appears too short',
      },
      {
        test: apiKey.length <= 200,
        reason: 'API key appears too long',
      },
      {
        test: !apiKey.includes(' '),
        reason: 'API key contains spaces',
      },
      {
        test: /^[a-zA-Z0-9\-_]+$/.test(apiKey),
        reason: 'API key contains invalid characters',
      },
      {
        test: apiKey.startsWith('sk-ant-'),
        reason: 'API key does not start with expected prefix',
      },
    ];

    for (const validation of validations) {
      if (!validation.test) {
        return {
          isValid: false,
          reason: validation.reason,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Mask API key for secure display
   * @param {string} apiKey - API key to mask
   * @returns {string} Masked API key
   */
  maskApiKey(apiKey) {
    // Show first 7 characters (sk-ant-) and last 4, mask the middle
    if (apiKey.length < 12) {
      return 'sk-ant-***';
    }

    const start = apiKey.substring(0, 7);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.min(apiKey.length - 11, 20));

    return `${start}${middle}${end}`;
  }
}

module.exports = ApiKeyValidator;
