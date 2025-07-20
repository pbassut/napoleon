// Start Ink UI with AgentManager integration
const logger = require('../../utils/logger');

async function startInkWithManager(agentManager) {
  try {
    // Dynamic import for ESM modules
    const { render } = await import('ink');
    const React = await import('react');

    // Import the main App component
    const { default: App } = await import('./App.js');

    // Create the app element with AgentManager
    const appElement = React.createElement(App, { agentManager });

    // Render the app
    const { unmount, waitUntilExit, clear } = render(appElement);

    // Handle cleanup on exit
    process.on('exit', () => {
      clear();
    });

    // Wait for the app to exit
    await waitUntilExit();

    logger.info('Ink UI closed');
  } catch (error) {
    logger.error('Failed to start Ink UI with AgentManager', { error: error.message });
    throw error;
  }
}

module.exports = startInkWithManager;
