const chalk = require('chalk');
const os = require('os');
const console = require('../utils/console-wrapper');

/**
 * API Key Setup Guide
 * Provides clear instructions for setting up Anthropic API keys
 */
class ApiKeySetupGuide {
  constructor() {
    this.chalk = chalk;
    this.os = os;
  }

  /**
   * Display complete setup instructions for missing API key
   */
  displaySetupInstructions() {
    console.log(this.chalk.red('\n❌ Anthropic API Key Required\n'));

    console.log(this.chalk.white('Napoleon requires an Anthropic API key to function.'));
    console.log(this.chalk.white('Please follow these steps to set up your API key:\n'));

    console.log(this.chalk.cyan('1. Get your API key:'));
    console.log(this.chalk.white('   Visit: https://console.anthropic.com/account/keys'));
    console.log(this.chalk.white('   Create a new API key if you don\'t have one\n'));

    console.log(this.chalk.cyan('2. Set the environment variable:'));
    this.displayShellSpecificInstructions();

    console.log(this.chalk.cyan('3. Verify the setup:'));
    console.log(this.chalk.white('   echo $ANTHROPIC_API_KEY | head -c 10'));
    console.log(this.chalk.white('   (Should display: sk-ant-***)\n'));

    console.log(this.chalk.yellow('⚠️  Security Note:'));
    console.log(this.chalk.yellow('   Never commit API keys to version control'));
    console.log(this.chalk.yellow('   Consider using a .env file for local development\n'));

    console.log(this.chalk.green('💡 Need help? Check our setup guide:'));
    console.log(this.chalk.green('   docs/API-KEY-SETUP.md\n'));
  }

  /**
   * Display shell-specific instructions for setting environment variables
   */
  displayShellSpecificInstructions() {
    const shell = this.detectShell();

    switch (shell) {
      case 'zsh':
        console.log(this.chalk.white('   echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.zshrc'));
        console.log(this.chalk.white('   source ~/.zshrc'));
        break;
      case 'bash':
        console.log(this.chalk.white('   echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.bashrc'));
        console.log(this.chalk.white('   source ~/.bashrc'));
        break;
      case 'fish':
        console.log(this.chalk.white('   set -Ux ANTHROPIC_API_KEY "your-key-here"'));
        break;
      default:
        console.log(this.chalk.white('   export ANTHROPIC_API_KEY="your-key-here"'));
        console.log(this.chalk.white('   (Add to your shell profile for persistence)'));
    }
    console.log();
  }

  /**
   * Detect the current shell environment
   * @returns {string} Shell name (zsh, bash, fish, unknown)
   */
  detectShell() {
    const shell = process.env.SHELL || '';

    if (shell.includes('zsh')) return 'zsh';
    if (shell.includes('bash')) return 'bash';
    if (shell.includes('fish')) return 'fish';

    return 'unknown';
  }

  /**
   * Display format error guidance with common issues
   * @param {string} reason - The specific format error reason
   */
  displayFormatError(reason) {
    console.log(this.chalk.red('\n❌ API Key Format Error\n'));
    console.log(this.chalk.white(`Issue detected: ${reason}`));
    console.log(this.chalk.white('Please check your API key and try again.\n'));

    console.log(this.chalk.cyan('Common issues:'));
    console.log(this.chalk.white('• API key copied with extra spaces or characters'));
    console.log(this.chalk.white('• API key truncated during copy/paste'));
    console.log(this.chalk.white('• Wrong environment variable name'));
    console.log(this.chalk.white('• API key enclosed in quotes when not needed\n'));

    console.log(this.chalk.yellow('💡 Tips for fixing:'));
    console.log(this.chalk.white('• Copy the entire API key from console.anthropic.com'));
    console.log(this.chalk.white('• Ensure no extra spaces before or after the key'));
    console.log(this.chalk.white('• Use ANTHROPIC_API_KEY as the environment variable name'));
    console.log(this.chalk.white('• API key should start with "sk-ant-"\n'));

    console.log(this.chalk.green('Need help? Check our setup guide:'));
    console.log(this.chalk.green('   docs/API-KEY-SETUP.md\n'));
  }

  /**
   * Get setup instructions text for testing
   * @returns {Object} Instruction text for different scenarios
   */
  getInstructionText() {
    return {
      setupTitle: '❌ Anthropic API Key Required',
      getKeyStep: '1. Get your API key:',
      anthropicUrl: 'https://console.anthropic.com/account/keys',
      setEnvStep: '2. Set the environment variable:',
      verifyStep: '3. Verify the setup:',
      securityNote: '⚠️  Security Note:',
      helpLink: 'docs/API-KEY-SETUP.md',
    };
  }

  /**
   * Get shell-specific command for testing
   * @param {string} shell - Shell type (zsh, bash, fish, unknown)
   * @returns {string} Command for setting environment variable
   */
  getShellCommand(shell) {
    switch (shell) {
      case 'zsh':
        return 'echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.zshrc';
      case 'bash':
        return 'echo \'export ANTHROPIC_API_KEY="your-key-here"\' >> ~/.bashrc';
      case 'fish':
        return 'set -Ux ANTHROPIC_API_KEY "your-key-here"';
      default:
        return 'export ANTHROPIC_API_KEY="your-key-here"';
    }
  }

  /**
   * Get format error guidance text for testing
   * @returns {Object} Error guidance text
   */
  getFormatErrorText() {
    return {
      errorTitle: '❌ API Key Format Error',
      commonIssues: [
        'API key copied with extra spaces or characters',
        'API key truncated during copy/paste',
        'Wrong environment variable name',
        'API key enclosed in quotes when not needed',
      ],
      tips: [
        'Copy the entire API key from console.anthropic.com',
        'Ensure no extra spaces before or after the key',
        'Use ANTHROPIC_API_KEY as the environment variable name',
        'API key should start with "sk-ant-"',
      ],
    };
  }
}

module.exports = ApiKeySetupGuide;
