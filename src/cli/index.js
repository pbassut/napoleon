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
      .name('napoleon')
      .description('Agent Driven Development Manager - CLI tool for managing multiple Claude Code SDK sessions')
      .version('1.0.0');

    // Start command (main TUI)
    program
      .command('start')
      .description('Start the Napoleon terminal interface')
      .action(async () => {
        // Set environment variable to indicate we're running in terminal UI mode
        process.env.TERMINAL_UI_MODE = 'true';

        // eslint-disable-next-line global-require
        const TerminalUI = require('../ui/index');
        const ui = new TerminalUI();

        try {
          await ui.initialize();
          logger.info('Terminal UI started successfully');
        } catch (error) {
          logger.error('Failed to start terminal UI', { error: error.message });
          // Use stderr for error output in terminal UI mode to avoid interfering with blessed
          process.stderr.write(`Failed to start terminal interface: ${error.message}\n`);
          process.exit(1);
        }
      });

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
