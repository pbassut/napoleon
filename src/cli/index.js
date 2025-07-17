const { initializeSessionStorage } = require('../core/config');
const logger = require('../utils/logger');

/**
 * Initializes the CLI application
 */
async function initializeApplication(program) {
  try {
    // Initialize session storage
    await initializeSessionStorage();

    // Set up CLI commands
    program
      .name('add-manager')
      .description('Agent Driven Development Manager - CLI tool for managing multiple Claude CLI sessions')
      .version('1.0.0');

    // Start command (main TUI)
    program
      .command('start')
      .description('Start the ADD Manager terminal interface')
      .action(async () => {
        // eslint-disable-next-line global-require
        const TerminalUI = require('../ui/index');
        const ui = new TerminalUI();

        try {
          await ui.initialize();
          logger.info('Terminal UI started successfully');
        } catch (error) {
          logger.error('Failed to start terminal UI', { error: error.message });
          console.error('Failed to start terminal interface:', error.message);
          process.exit(1);
        }
      });

    // Status command
    program
      .command('status')
      .description('Show current agent status')
      .action(async () => {
        console.log('Agent Status:');
        console.log('No active agents');
        // TODO: This will be implemented in later stories
      });

    // Default action (no command specified)
    program
      .action(() => {
        // If no command is specified, show help
        program.help();
      });

    logger.info('CLI application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize CLI application', { error: error.message });
    throw error;
  }
}

module.exports = {
  initializeApplication,
};
