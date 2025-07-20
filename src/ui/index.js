const logger = require('../utils/logger');
const { uiConfig } = require('../core/ui-config');
const chalk = require('chalk');

let TerminalUI;
let uiMode = null;

/**
 * Show migration message to users on first run with Ink
 */
async function showMigrationMessage() {
  if (await uiConfig.hasSeenMigrationMessage()) {
    return;
  }

  console.log();
  console.log(chalk.blue('═══════════════════════════════════════════════════'));
  console.log(chalk.bold('    🎉 Welcome to Napoleon\'s New UI! 🎉'));
  console.log(chalk.blue('═══════════════════════════════════════════════════'));
  console.log();
  console.log('We\'ve upgraded to a modern React-based interface');
  console.log('that\'s faster, more responsive, and more reliable!');
  console.log();
  console.log(chalk.green('✨ What\'s New:'));
  console.log('  • Improved performance and responsiveness');
  console.log('  • Better terminal compatibility');
  console.log('  • Enhanced keyboard navigation');
  console.log('  • Smoother scrolling and animations');
  console.log();
  
  if (uiConfig.canUseLegacyUI()) {
    console.log(chalk.yellow('📝 Note:'));
    console.log('  If you experience any issues, you can temporarily');
    console.log('  switch back to the classic UI with:');
    console.log(chalk.cyan('  napoleon start --use-legacy-ui'));
    console.log();
    const daysRemaining = uiConfig.getDaysUntilLegacyCutoff();
    if (daysRemaining < 90) {
      console.log(chalk.yellow(`  ⚠️  Legacy UI will be removed in ${daysRemaining} days`));
      console.log();
    }
  }
  
  console.log('Please report any issues at:');
  console.log(chalk.cyan('https://github.com/pbassut/napoleon/issues'));
  console.log();
  console.log(chalk.blue('═══════════════════════════════════════════════════'));
  console.log();
  console.log(chalk.dim('Press any key to continue...'));
  
  // Wait for user input
  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
    process.stdin.setRawMode(true);
    process.stdin.resume();
  });
  
  process.stdin.setRawMode(false);
  process.stdin.pause();
  
  await uiConfig.markMigrationMessageSeen();
}

/**
 * Initialize the appropriate UI based on configuration
 */
async function initializeUI() {
  // Determine UI mode
  uiMode = await uiConfig.determineUI();
  logger.info('UI mode determined', { mode: uiMode });

  if (uiMode === 'ink') {
    try {
      // Show migration message for first-time Ink users
      await showMigrationMessage();

      // Create Ink UI wrapper
      class InkUIWrapper {
        constructor() {
          this.agentManager = null;
        }

        async initialize() {
          logger.info('Initializing Ink UI');

          // Initialize AgentManager
          const AgentManager = require('../core/agent-manager');
          this.agentManager = new AgentManager();
          await this.agentManager.initialize();

          // Start Ink UI with AgentManager
          const startInkWithManager = require('./ink/startWithManager');
          await startInkWithManager(this.agentManager);
        }
      }
      
      TerminalUI = InkUIWrapper;
      logger.info('Ink UI wrapper created');
      
    } catch (error) {
      logger.error('Failed to load Ink UI', { error: error.message });
      
      // If Ink fails and legacy is available, fall back
      if (uiConfig.canUseLegacyUI()) {
        logger.info('Falling back to Blessed UI');
        console.error(chalk.yellow('\n⚠️  Failed to start new UI, falling back to classic UI\n'));
        TerminalUI = require('./blessed');
      } else {
        // If legacy is not available, we must fail
        throw new Error('Failed to initialize UI and legacy UI is not available');
      }
    }
  } else if (uiMode === 'blessed') {
    // Check if legacy UI is actually available
    if (!uiConfig.canUseLegacyUI()) {
      console.error(chalk.red('\n❌ Legacy UI is no longer available\n'));
      console.error('The classic UI has been retired. Please use the new UI.');
      console.error('Remove the --use-legacy-ui flag and try again.\n');
      process.exit(1);
    }

    // Load Blessed UI
    try {
      TerminalUI = require('./blessed');
      logger.info('Blessed UI loaded');
      
      // Show deprecation warning
      const daysRemaining = uiConfig.getDaysUntilLegacyCutoff();
      console.warn(chalk.yellow('\n⚠️  You are using the legacy UI'));
      console.warn(chalk.yellow(`   This UI will be removed in ${daysRemaining} days`));
      console.warn(chalk.yellow('   Please consider switching to the new UI\n'));
      
      // Small delay so user can see the warning
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      logger.error('Failed to load Blessed UI', { error: error.message });
      throw new Error('Failed to initialize legacy UI: ' + error.message);
    }
  } else {
    throw new Error(`Unknown UI mode: ${uiMode}`);
  }

  return TerminalUI;
}

// Export a function that returns the UI class
module.exports = async function getTerminalUI() {
  if (!TerminalUI) {
    await initializeUI();
  }
  return TerminalUI;
};

// Also export the UI mode for other modules to check
module.exports.getUIMode = () => uiMode;

// For backward compatibility, also export as default
module.exports.default = module.exports;