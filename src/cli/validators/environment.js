const semver = require('semver');
const { execSync } = require('child_process');
const { EnvironmentValidationError } = require('../../utils/errors');

/**
 * Validates the system environment for ADD Manager
 */
async function validateEnvironment() {
  // Node.js version check
  const nodeVersion = process.version;
  if (!semver.gte(nodeVersion, '16.0.0')) {
    throw new EnvironmentValidationError(
      `Node.js version ${nodeVersion} is not supported. Required: >=16.0.0`,
      'NODE_VERSION_UNSUPPORTED',
      'Please upgrade Node.js to version 16.0.0 or higher',
    );
  }

  // Git availability check
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' });
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

  // Claude CLI check (optional for now)
  try {
    execSync('claude --version', { encoding: 'utf8', stdio: 'ignore' });
  } catch (error) {
    // Claude CLI is not required for basic functionality
    // This is just a warning for now
    console.warn('Warning: Claude CLI not found. Some features may be limited.');
  }
}

module.exports = {
  validateEnvironment,
};
