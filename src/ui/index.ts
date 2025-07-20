import chalk from 'chalk';
import logger from '../utils/logger';
import { AgentManager } from './ink/types';

/**
 * Napoleon UI Entry Point
 * Now exclusively uses the modern Ink-based React UI
 */

class InkUIWrapper {
  private agentManager: AgentManager | null = null;

  async initialize(): Promise<void> {
    logger.info('Initializing Napoleon Ink UI');

    try {
      // Initialize AgentManager
      const AgentManagerClass = require('../core/agent-manager');
      this.agentManager = new AgentManagerClass();
      await this.agentManager!.initialize();

      // Start Ink UI with AgentManager
      const startInkWithManager = require('./ink/startWithManager').default;
      await startInkWithManager(this.agentManager);

      logger.info('Ink UI initialized successfully');
    } catch (error: any) {
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
export default InkUIWrapper;