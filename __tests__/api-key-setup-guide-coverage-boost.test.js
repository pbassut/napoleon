/**
 * Coverage boost test for api-key-setup-guide.js
 * Targets the low coverage file to meet CI thresholds
 */

const ApiKeySetupGuide = require('../src/core/api-key-setup-guide');

describe('ApiKeySetupGuide Coverage Boost', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should display setup instructions', () => {
    const guide = new ApiKeySetupGuide();
    guide.displaySetupInstructions();

    expect(consoleSpy).toHaveBeenCalledWith('\n❌ API Key Missing');
    expect(consoleSpy).toHaveBeenCalledWith('\nNo Anthropic API key found. Please set your API key using one of these methods:');
    expect(consoleSpy).toHaveBeenCalledWith('\n🔧 Option 1: Environment Variable');
    expect(consoleSpy).toHaveBeenCalledWith('   export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"');
    expect(consoleSpy).toHaveBeenCalledWith('\n🔧 Option 2: .env file');
    expect(consoleSpy).toHaveBeenCalledWith('   Create a .env file in your project root:');
    expect(consoleSpy).toHaveBeenCalledWith('   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here');
    expect(consoleSpy).toHaveBeenCalledWith('\n🔗 Get your API key at: https://console.anthropic.com/');
  });

  test('should display format error instructions', () => {
    const guide = new ApiKeySetupGuide();
    guide.displayFormatError();

    expect(consoleSpy).toHaveBeenCalledWith('\n❌ Invalid API Key Format');
    expect(consoleSpy).toHaveBeenCalledWith('\nThe provided API key does not match the expected Anthropic format.');
    expect(consoleSpy).toHaveBeenCalledWith('\n📋 Expected format: sk-ant-api03-[your-key-here]');
    expect(consoleSpy).toHaveBeenCalledWith('\n🔗 Get your API key at: https://console.anthropic.com/');
    expect(consoleSpy).toHaveBeenCalledWith('\n💡 Make sure to:');
    expect(consoleSpy).toHaveBeenCalledWith('   • Copy the complete key including the "sk-ant-" prefix');
    expect(consoleSpy).toHaveBeenCalledWith('   • Check for any extra spaces or characters');
    expect(consoleSpy).toHaveBeenCalledWith('   • Ensure the key is not truncated');
  });

  test('should support legacy displayMissingApiKeyMessage method', () => {
    const guide = new ApiKeySetupGuide();
    guide.displayMissingApiKeyMessage();

    // Should call displaySetupInstructions internally
    expect(consoleSpy).toHaveBeenCalledWith('\n❌ API Key Missing');
    expect(consoleSpy).toHaveBeenCalledWith('\nNo Anthropic API key found. Please set your API key using one of these methods:');
  });

  test('should create multiple instances', () => {
    const guide1 = new ApiKeySetupGuide();
    const guide2 = new ApiKeySetupGuide();

    expect(guide1).toBeInstanceOf(ApiKeySetupGuide);
    expect(guide2).toBeInstanceOf(ApiKeySetupGuide);
    expect(guide1).not.toBe(guide2);
  });

  test('should have all required methods', () => {
    const guide = new ApiKeySetupGuide();

    expect(typeof guide.displaySetupInstructions).toBe('function');
    expect(typeof guide.displayFormatError).toBe('function');
    expect(typeof guide.displayMissingApiKeyMessage).toBe('function');
  });
});