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

    // logs list command (lazy-load LogsCommand)
    program
      .command('logs list')
      .description('List all agent logs')
      .option('-l, --limit <number>', 'limit number of logs shown', (value) => parseInt(value, 10))
      .option('-f, --format <format>', 'output format (table|json)', 'table')
      .action(async (options) => {
        try {
          const config = loadConfig();
          // eslint-disable-next-line global-require
          const LogsCommand = require('./commands/logs');
          const logsCommand = new LogsCommand(config);
          await logsCommand.listLogs(options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
      });

    // logs view command (lazy-load LogsCommand)
    program
      .command('logs view <identifier>')
      .description('View a specific log file')
      .option('-t, --tail <number>', 'show last N lines', (value) => parseInt(value, 10))
      .option('-f, --follow', 'follow log file like tail -f')
      .option('-r, --raw', 'show raw log entries without formatting')
      .action(async (identifier, options) => {
        try {
          const config = loadConfig();
          // eslint-disable-next-line global-require
          const LogsCommand = require('./commands/logs');
          const logsCommand = new LogsCommand(config);
          await logsCommand.viewLog(identifier, options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
      });

    // logs search command (lazy-load LogsCommand)
    program
      .command('logs search <term>')
      .description('Search across all logs for a term')
      .option('--from <date>', 'search from date (YYYY-MM-DD)')
      .option('--to <date>', 'search to date (YYYY-MM-DD)')
      .option('-c, --context <number>', 'lines of context around matches', (value) => parseInt(value, 10), 2)
      .action(async (term, options) => {
        try {
          const config = loadConfig();
          // eslint-disable-next-line global-require
          const LogsCommand = require('./commands/logs');
          const logsCommand = new LogsCommand(config);
          await logsCommand.searchLogs(term, options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
      });

    // logs prompt command (lazy-load LogsCommand)
    program
      .command('logs prompt <keyword>')
      .description('Find logs by prompt keywords')
      .option('-l, --limit <number>', 'limit number of results', (value) => parseInt(value, 10))
      .action(async (keyword, options) => {
        try {
          const config = loadConfig();
          // eslint-disable-next-line global-require
          const LogsCommand = require('./commands/logs');
          const logsCommand = new LogsCommand(config);
          await logsCommand.searchByPrompt(keyword, options);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          process.exit(1);
        }
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
