import chalk from 'chalk';
import logger from '../utils/logger.js'; // eslint-disable-line import/extensions
import type { AgentManager } from './ink/types'; // eslint-disable-line import/no-unresolved
import AgentManagerClass from '../core/agent-manager.js'; // eslint-disable-line import/extensions
import startInkWithManager from './ink/startWithManager'; // eslint-disable-line import/no-unresolved, import/extensions

/**
 * Napoleon UI Entry Point
 * Now exclusively uses the modern Ink-based React UI
 */

class InkUIWrapper {
  private agentManager: AgentManager | null = null;

  async initialize(): Promise<void> {
    logger.info('Initializing Napoleon Ink UI');

    try {
      // Create AgentManager but don't initialize it yet - this allows UI to render immediately
      this.agentManager = new AgentManagerClass();

      // Start Ink UI first with the uninitialized AgentManager
      // This allows the UI to show loading state while heavy operations complete
      const uiPromise = startInkWithManager(this.agentManager);

      // Initialize AgentManager in the background while UI renders
      const initPromise = this.agentManager!.initialize();

      // Wait for both UI and initialization to complete
      await Promise.all([uiPromise, initPromise]);

      logger.info('Ink UI initialized successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Failed to initialize Ink UI', { error: errorMessage, stack: errorStack });

      // Show user-friendly error message
      console.error(chalk.red('\n❌ Failed to start Napoleon UI\n'));
      console.error('Error:', errorMessage);
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
