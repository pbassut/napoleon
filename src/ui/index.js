const logger = require('../utils/logger');

// Determine UI mode at module load time
const uiMode = process.env.NAPOLEON_UI || 'blessed';
logger.info('UI mode determined', { mode: uiMode });

let TerminalUI;

if (uiMode === 'ink') {
  try {
    // For Ink, we need to create a wrapper class that matches the expected interface
    class InkUIWrapper {
      async initialize() {
        logger.info('Initializing Ink UI');
        // Use dynamic import for ESM module
        await import('./ink/index.js');
      }
    }
    TerminalUI = InkUIWrapper;
    logger.info('Ink UI wrapper created');
  } catch (error) {
    logger.error('Failed to load Ink UI, falling back to Blessed', { error: error.message });
    TerminalUI = require('./blessed');
  }
} else {
  TerminalUI = require('./blessed');
  logger.info('Blessed UI loaded');
}

module.exports = TerminalUI;