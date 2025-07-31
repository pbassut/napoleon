/**
 * API key setup guide and display utilities
 * Provides user-friendly instructions for API key configuration
 */

class ApiKeySetupGuide {
  /**
   * Display setup instructions for missing API key
   */
  displaySetupInstructions() {
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
   * Display format error instructions
   */
  displayFormatError() {
    console.error('\n❌ Invalid API Key Format');
    console.error('\nThe provided API key does not match the expected Anthropic format.');
    console.error('\n📋 Expected format: sk-ant-api03-[your-key-here]');
    console.error('\n🔗 Get your API key at: https://console.anthropic.com/');
    console.error('\n💡 Make sure to:');
    console.error('   • Copy the complete key including the "sk-ant-" prefix');
    console.error('   • Check for any extra spaces or characters');
    console.error('   • Ensure the key is not truncated');
  }

  /**
   * Display missing API key message (legacy compatibility)
   * @deprecated Use displaySetupInstructions() instead
   */
  displayMissingApiKeyMessage() {
    this.displaySetupInstructions();
  }
}

module.exports = ApiKeySetupGuide;
