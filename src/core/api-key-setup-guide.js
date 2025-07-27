/**
 * API Key Setup Guide for helping users configure their Anthropic API key
 */
class ApiKeySetupGuide {
  constructor() {
    this.logger = require('../utils/logger');
  }

  /**
   * Display error message for invalid API key format
   * @param {string} apiKey - The invalid API key
   */
  displayFormatError(apiKey = '') {
    const maskedKey = apiKey.length > 10
      ? `${apiKey.substring(0, 7)}***${apiKey.substring(apiKey.length - 6)}`
      : '***';

    console.error('\n❌ Invalid API Key Format');
    console.error(`\nThe provided API key (${maskedKey}) does not match the expected Anthropic format.`);
    console.error('\n📋 Expected format: sk-ant-api03-[your-key-here]');
    console.error('\n🔗 Get your API key at: https://console.anthropic.com/');
    console.error('\n💡 Make sure to:');
    console.error('   • Copy the complete key including the "sk-ant-" prefix');
    console.error('   • Check for any extra spaces or characters');
    console.error('   • Ensure the key is not truncated');
  }

  /**
   * Display message when API key is missing
   */
  displayMissingApiKeyMessage() {
    console.error('\n❌ API Key Missing');
    console.error('\nNo Anthropic API key found. Please set your API key using one of these methods:');
    console.error('\n🔧 Option 1: Environment Variable');
    console.error('   export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"');
    console.error('\n🔧 Option 2: .env file');
    console.error('   Create a .env file in your project root:');
    console.error('   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here');
    console.error('\n🔗 Get your API key at: https://console.anthropic.com/');
  }

  /**
   * Display instructions for API key configuration
   */
  displaySetupInstructions() {
    console.log('\n🔑 API Key Setup Guide');
    console.log('\n1. Visit https://console.anthropic.com/');
    console.log('2. Sign in or create an account');
    console.log('3. Navigate to your API Keys section');
    console.log('4. Create a new API key');
    console.log('5. Copy the key (starts with "sk-ant-")');
    console.log('\n6. Set the key using one of these methods:');
    console.log('   • Environment variable: export ANTHROPIC_API_KEY="your-key"');
    console.log('   • .env file: ANTHROPIC_API_KEY=your-key');
    console.log('\n✅ Your API key will be validated automatically on next run.');
  }

  /**
   * Display API key validation success message
   * @param {string} maskedKey - The masked API key
   */
  displayValidationSuccess(maskedKey) {
    console.log(`\n✅ API key validated successfully (${maskedKey})`);
  }

  /**
   * Display API key validation error
   * @param {Object} error - The validation error details
   */
  displayValidationError(error) {
    console.error('\n❌ API Key Validation Failed');
    console.error(`\nError: ${error.message}`);

    if (error.error === 'API_KEY_INVALID_FORMAT') {
      this.displayFormatError();
    } else if (error.error === 'API_KEY_MISSING') {
      this.displayMissingApiKeyMessage();
    } else {
      console.error('\n💡 Please check your API key and try again.');
      console.error('🔗 Get help at: https://console.anthropic.com/');
    }
  }
}

module.exports = ApiKeySetupGuide;
