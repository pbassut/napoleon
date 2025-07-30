const semver = require('semver');
const { exec } = require('child_process');
const { promisify } = require('util');
const { EnvironmentValidationError, ConfigurationError } = require('../../utils/errors');
const GitStatusChecker = require('../../core/git-status-checker');
const StartupWarningDisplay = require('../../core/startup-warning-display');
const ApiKeyValidator = require('../../core/api-key-validator');

const execAsync = promisify(exec);

/**
 * Validates git working tree status
 */
async function validateGitWorkingTree() {
  const gitChecker = new GitStatusChecker();
  const warningDisplay = new StartupWarningDisplay();

  try {
    // First validate git repository context
    const repositoryValidation = await gitChecker.validateGitRepository();

    if (!repositoryValidation.isValid) {
      await warningDisplay.displayGitValidationError(repositoryValidation);
      throw new EnvironmentValidationError(
        repositoryValidation.message,
        repositoryValidation.error,
        'Please ensure you are in a git repository with proper access',
      );
    }

    // Check working tree status
    const gitStatus = await gitChecker.checkWorkingTreeStatus();

    // Git working tree warnings are currently disabled
    // if (!gitStatus.isClean) {
    //   const userChoice = await warningDisplay.displayGitWarning(gitStatus);
    //
    //   if (userChoice === 'exit') {
    //     warningDisplay.displayExitMessage();
    //     process.exit(0);
    //   } else {
    //     await warningDisplay.displayContinueMessage();
    //     console.log(chalk.yellow('⚠️  Continuing with dirty working tree...'));
    //   }
    // }

    return gitStatus;
  } catch (error) {
    if (error.message.includes('Not in a git repository')) {
      warningDisplay.displayNonGitRepoError();
      process.exit(1);
    }

    throw error;
  }
}

/**
 * Validates the system environment for Napoleon (optimized with parallel checks)
 */
async function validateEnvironment() {
  // Node.js version check (immediate, no async needed)
  const nodeVersion = process.version;
  if (!semver.gte(nodeVersion, '18.0.0')) {
    throw new EnvironmentValidationError(
      `Node.js version ${nodeVersion} is not supported. Required: >=18.0.0`,
      'NODE_VERSION_UNSUPPORTED',
      'Please upgrade Node.js to version 18.0.0 or higher',
    );
  }

  // Run all async validations in parallel for faster startup
  const validationPromises = [
    // Git version check (async)
    (async () => {
      try {
        const { stdout: gitVersion } = await execAsync('git --version', {
          encoding: 'utf8',
          timeout: 2000,
        });
        const version = gitVersion.match(/git version (\d+\.\d+\.\d+)/)?.[1];
        if (!version || !semver.gte(version, '2.20.0')) {
          throw new EnvironmentValidationError(
            `Git version ${version} is not supported. Required: >=2.20.0`,
            'GIT_VERSION_UNSUPPORTED',
            'Please upgrade git to version 2.20.0 or higher',
          );
        }
      } catch (error) {
        if (error instanceof EnvironmentValidationError) {
          throw error;
        }
        throw new EnvironmentValidationError(
          'Git is not available in system PATH',
          'GIT_NOT_FOUND',
          'Please install git and ensure it is available in your PATH',
        );
      }
    })(),

    // Claude Code SDK check (optional, async)
    (async () => {
      try {
        await execAsync('claude --version', {
          encoding: 'utf8',
          timeout: 1000,
        });
      } catch (error) {
        // Claude Code SDK is not required for basic functionality
        // This is just a warning for now - but don't warn in tests
        if (process.env.NODE_ENV !== 'test') {
          console.warn(
            'Warning: Claude Code SDK not found. Some features may be limited.',
          );
        }
      }
    })(),

    // Git working tree status validation
    // validateGitWorkingTree(),
  ];

  // Wait for all validations to complete
  // Use allSettled to handle optional validations gracefully
  const results = await Promise.allSettled(validationPromises);

  // Check for critical failures (non-optional validations)
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      // Index 2 is git working tree validation (critical)
      // Index 0 is git version (critical), Index 1 is Claude SDK (optional)
      if (index !== 1) { // Skip Claude SDK check failure (index 1)
        throw result.reason;
      }
    }
  });
}

/**
 * Validates the API key using the ApiKeyValidator
 */
async function validateApiKey() {
  const validator = new ApiKeyValidator();

  try {
    const result = await validator.validateApiKey();

    if (result.isValid) {
      console.log(`✅ API key validated: ${result.maskedKey}`);
      return result;
    }
    if (result.error === 'API_KEY_MISSING') {
      console.error('\n❌ API Key Missing');
      console.error('\nNo Anthropic API key found. Please set your API key using one of these methods:');
      console.error('\n🔧 Option 1: Environment Variable');
      console.error('   export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"');
      console.error('\n🔧 Option 2: .env file');
      console.error('   Create a .env file in your project root:');
      console.error('   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here');
      console.error('\n🔗 Get your API key at: https://console.anthropic.com/');
      throw new EnvironmentValidationError(
        'API key not found in environment variables',
        'API_KEY_NOT_FOUND',
        'Set ANTHROPIC_API_KEY environment variable',
      );
    } else if (result.error === 'API_KEY_INVALID_FORMAT') {
      console.error('\n❌ Invalid API Key Format');
      console.error('\nThe provided API key does not match the expected Anthropic format.');
      console.error('\n📋 Expected format: sk-ant-api03-[your-key-here]');
      console.error('\n🔗 Get your API key at: https://console.anthropic.com/');
      console.error('\n💡 Make sure to:');
      console.error('   • Copy the complete key including the "sk-ant-" prefix');
      console.error('   • Check for any extra spaces or characters');
      console.error('   • Ensure the key is not truncated');
      throw new ConfigurationError(
        'Invalid API key format: API key appears too short',
        'INVALID_API_KEY_FORMAT',
        'Please check your API key format',
      );
    } else {
      throw new EnvironmentValidationError(
        result.message,
        result.error,
        'Please check your API key configuration',
      );
    }
  } catch (error) {
    if (error instanceof EnvironmentValidationError || error instanceof ConfigurationError) {
      throw error;
    }
    throw new EnvironmentValidationError(
      'Failed to validate API key',
      'API_KEY_VALIDATION_ERROR',
      'Please check your API key configuration',
    );
  }
}

module.exports = {
  validateEnvironment,
  validateGitWorkingTree,
  validateApiKey,
};
