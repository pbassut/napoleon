const { initializeSessionStorage, loadConfig } = require('../core/config');
const { validateEnvironment } = require('./validators/environment');
const logger = require('../utils/logger');
const LogsCommand = require('./commands/logs');

/**
 * Initializes the CLI application
 */
async function initializeApplication(program) {
  try {
    // Validate environment before initialization
    await validateEnvironment();

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
      .option('--use-legacy-ui', 'Use the classic Blessed UI (deprecated)')
      .action(async (options) => {
        // Set environment variable to indicate we're running in terminal UI mode
        process.env.TERMINAL_UI_MODE = 'true';

        // Pass CLI options to UI config
        if (options.useLegacyUi) {
          process.env.NAPOLEON_USE_LEGACY_UI = 'true';
        }

        try {
          // eslint-disable-next-line global-require
          const getTerminalUI = require('../ui/index');
          const TerminalUI = await getTerminalUI();
          const ui = new TerminalUI();

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

    // Log commands
    const config = loadConfig();
    const logsCommand = new LogsCommand(config);

    // logs list command
    program
      .command('logs list')
      .description('List all agent logs')
      .option('-l, --limit <number>', 'limit number of logs shown', (value) => parseInt(value, 10))
      .option('-f, --format <format>', 'output format (table|json)', 'table')
      .action(async (options) => {
        try {
          await logsCommand.listLogs(options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
      });

    // logs view command
    program
      .command('logs view <identifier>')
      .description('View a specific log file')
      .option('-t, --tail <number>', 'show last N lines', (value) => parseInt(value, 10))
      .option('-f, --follow', 'follow log file like tail -f')
      .option('-r, --raw', 'show raw log entries without formatting')
      .action(async (identifier, options) => {
        try {
          await logsCommand.viewLog(identifier, options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
      });

    // logs search command
    program
      .command('logs search <term>')
      .description('Search across all logs for a term')
      .option('--from <date>', 'search from date (YYYY-MM-DD)')
      .option('--to <date>', 'search to date (YYYY-MM-DD)')
      .option('-c, --context <number>', 'lines of context around matches', (value) => parseInt(value, 10), 2)
      .action(async (term, options) => {
        try {
          await logsCommand.searchLogs(term, options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
      });

    // logs prompt command
    program
      .command('logs prompt <keyword>')
      .description('Find logs by prompt keywords')
      .option('-l, --limit <number>', 'limit number of results', (value) => parseInt(value, 10))
      .action(async (keyword, options) => {
        try {
          await logsCommand.searchByPrompt(keyword, options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
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
