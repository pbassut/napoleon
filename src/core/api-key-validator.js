/**
 * API Key Validator for validating Anthropic API keys
 */
class ApiKeyValidator {
  constructor() {
    this.logger = require('../utils/logger');
  }

  /**
   * Validates an Anthropic API key
   * @param {string} apiKey - The API key to validate (optional, uses env var if not provided)
   * @returns {Promise<{isValid: boolean, maskedKey?: string}>}
   */
  async validateApiKey(apiKey = null) {
    const keyToValidate = apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!keyToValidate) {
      return {
        isValid: false,
        error: 'API_KEY_MISSING',
        message: 'ANTHROPIC_API_KEY environment variable is not set'
      };
    }

    // Basic format validation for Anthropic API keys
    if (!this.isValidKeyFormat(keyToValidate)) {
      return {
        isValid: false,
        error: 'API_KEY_INVALID_FORMAT',
        message: 'API key does not match expected Anthropic format'
      };
    }

    try {
      // For now, we'll do basic validation
      // In a real implementation, this would make an API call to verify the key
      const maskedKey = this.maskApiKey(keyToValidate);
      
      return {
        isValid: true,
        maskedKey
      };
    } catch (error) {
      this.logger.error('API key validation failed:', error);
      return {
        isValid: false,
        error: 'API_KEY_VALIDATION_FAILED',
        message: 'Failed to validate API key'
      };
    }
  }

  /**
   * Checks if the API key matches expected Anthropic format
   * @param {string} apiKey - The API key to check
   * @returns {boolean}
   */
  isValidKeyFormat(apiKey) {
    // Anthropic API keys typically start with 'sk-ant-'
    return typeof apiKey === 'string' && 
           apiKey.length > 10 && 
           apiKey.startsWith('sk-ant-');
  }

  /**
   * Masks an API key for safe logging
   * @param {string} apiKey - The API key to mask
   * @returns {string}
   */
  maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 10) {
      return '***';
    }
    
    return `${apiKey.substring(0, 7)}***${apiKey.substring(apiKey.length - 6)}`;
  }
}

module.exports = ApiKeyValidator;