const { initializeSessionStorage, loadConfig } = require('../core/config');
const { validateEnvironment } = require('./validators/environment');
const logger = require('../utils/logger');

/**
 * Starts the terminal UI (shared logic)
 */
async function startTerminalUI() {
  // Set environment variable to indicate we're running in terminal UI mode
  process.env.TERMINAL_UI_MODE = 'true';

  try {
    // Use dynamic import for ES module
    const { default: TerminalUI } = await import('../ui/index.ts');
    const ui = new TerminalUI();

    await ui.initialize();
    logger.info('Terminal UI started successfully');
  } catch (error) {
    logger.error('Failed to start terminal UI', { error: error.message, stack: error.stack });
    process.stderr.write(`Failed to start terminal interface: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Initializes the CLI application (optimized for fast startup)
 */
async function initializeApplication(program) {
  try {
    // Validate environment before initialization
    await validateEnvironment();

    // Initialize session storage (lightweight operation)
    await initializeSessionStorage();

    // Set up CLI commands
    program
      .name('napoleon')
      .description('Agent Driven Development Manager - CLI tool for managing multiple Claude Code SDK sessions')
      .version(require('../../package.json').version);

    // Start command (main TUI)
    program
      .command('start')
      .description('Start the Napoleon terminal interface')
      .action(startTerminalUI);

    // Status command
    program
      .command('status')
      .description('Show current agent status')
      .action(async () => {
        // Safe to use console.log here since we're not in terminal UI mode
        console.log('Agent Status:');
        console.log('No active agents');
        // TODO: This will be implemented in later stories
      });

    // Default action (no command specified) - launch terminal UI
    program
      .action(startTerminalUI);

    logger.info('CLI application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize CLI application', { error: error.message });

    // Handle startup validation failures gracefully
    if (error.name === 'EnvironmentValidationError' || error.name === 'ConfigurationError') {
      console.log('\n❌ Napoleon startup failed');
      console.log('Please resolve the above issues and try again.\n');
      process.exit(1);
    }

    throw error;
  }
}

module.exports = {
  initializeApplication,
};
