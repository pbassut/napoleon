const blessed = require('blessed');
const logger = require('../../utils/logger');

class BlessedUI {
  constructor() {
    this.screen = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Create the blessed screen
      this.screen = blessed.screen({
        smartCSR: true,
        fullUnicode: true,
        title: 'Napoleon - Agent Driven Development Manager',
        dockBorders: true,
      });

      // Create main container
      const mainBox = blessed.box({
        parent: this.screen,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        label: ' Napoleon ',
        border: {
          type: 'line',
        },
        style: {
          border: {
            fg: 'cyan',
          },
        },
      });

      // Create content area
      const content = blessed.text({
        parent: mainBox,
        top: 1,
        left: 1,
        right: 1,
        bottom: 1,
        content: 'Welcome to Napoleon Terminal UI (Blessed)\nPress q to quit',
        tags: true,
      });

      // Set up keyboard handlers
      this.screen.key(['q', 'C-c'], () => {
        logger.info('User requested exit');
        this.cleanup();
        process.exit(0);
      });

      // Focus and render
      this.screen.render();
      this.initialized = true;
      
      logger.info('Blessed UI initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Blessed UI', { error: error.message });
      throw error;
    }
  }

  cleanup() {
    if (this.screen) {
      this.screen.destroy();
    }
  }
}

module.exports = BlessedUI;