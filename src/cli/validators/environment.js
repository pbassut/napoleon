const semver = require('semver');
const { exec } = require('child_process');
const { promisify } = require('util');
const chalk = require('chalk');
const { EnvironmentValidationError } = require('../../utils/errors');
const ApiKeyValidator = require('../../core/api-key-validator');
const ApiKeySetupGuide = require('../../core/api-key-setup-guide');
const GitStatusChecker = require('../../core/git-status-checker');
const StartupWarningDisplay = require('../../core/startup-warning-display');

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

    if (false && !gitStatus.isClean) {
      const userChoice = await warningDisplay.displayGitWarning(gitStatus);

      if (userChoice === 'exit') {
        warningDisplay.displayExitMessage();
        process.exit(0);
      } else {
        await warningDisplay.displayContinueMessage();
        console.log(chalk.yellow('⚠️  Continuing with dirty working tree...'));
      }
    }

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
 * Validates Anthropic API key
 */
async function validateApiKey() {
  const validator = new ApiKeyValidator();
  const setupGuide = new ApiKeySetupGuide();

  try {
    const result = await validator.validateApiKey();

    console.log(chalk.green(`✅ API key validated (${result.maskedKey})`));

    return result;
  } catch (error) {
    if (error.message.includes('not found in environment')) {
      setupGuide.displaySetupInstructions();
    } else if (error.message.includes('Invalid API key format')) {
      setupGuide.displayFormatError(error.message);
    } else {
      console.error(
        chalk.red(`❌ API key validation failed: ${error.message}`),
      );
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
    validateGitWorkingTree(),

    // API key validation
    validateApiKey(),
  ];

  // Wait for all validations to complete
  // Use allSettled to handle optional validations gracefully
  const results = await Promise.allSettled(validationPromises);

  // Check for critical failures (non-optional validations)
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      // Index 2 and 3 are git and API key validation (critical)
      // Index 0 is git version (critical), Index 1 is Claude SDK (optional)
      if (index !== 1) { // Skip Claude SDK check failure (index 1)
        throw result.reason;
      }
    }
  });
}

module.exports = {
  validateEnvironment,
  validateApiKey,
  validateGitWorkingTree,
};
