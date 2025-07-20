const chalk = require('chalk');
const logger = require('../utils/logger');

/**
 * Napoleon UI Entry Point
 * Now exclusively uses the modern Ink-based React UI
 */

class InkUIWrapper {
  constructor() {
    this.agentManager = null;
  }

  async initialize() {
    logger.info('Initializing Napoleon Ink UI');

    try {
      // Initialize AgentManager
      const AgentManager = require('../core/agent-manager');
      this.agentManager = new AgentManager();
      await this.agentManager.initialize();

      // Start Ink UI with AgentManager
      const startInkWithManager = require('./ink/startWithManager');
      await startInkWithManager(this.agentManager);

      logger.info('Ink UI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Ink UI', { error: error.message });

      // Show user-friendly error message
      console.error(chalk.red('\n❌ Failed to start Napoleon UI\n'));
      console.error('Error:', error.message);
      console.error('\nPlease check:');
      console.error('• Your terminal supports modern UI features');
      console.error('• Node.js version is >= 18.0.0');
      console.error('• No conflicting terminal settings');
      console.error('\nFor support, visit: https://github.com/pbassut/napoleon/issues\n');

      throw error;
    }
  }
}

// Export the UI class directly
module.exports = InkUIWrapper;

// For backward compatibility
module.exports.default = InkUIWrapper;
