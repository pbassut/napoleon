// Start Ink UI with AgentManager integration
const logger = require('../../utils/logger');

/**
 * Check if the current environment supports Ink UI
 */
function isInkSupported() {
  // Allow override for testing/development
  if (process.env.NAPOLEON_FORCE_INK === 'true') {
    return true;
  }

  if (process.env.NAPOLEON_DISABLE_INK === 'true') {
    return false;
  }

  // Check if we have a TTY
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  // Check if raw mode is supported
  if (typeof process.stdin.setRawMode !== 'function') {
    return false;
  }

  // Additional checks for specific environments
  if (process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true') {
    return false;
  }

  // Check for test environment
  if (process.env.NODE_ENV === 'test' || process.env.NAPOLEON_TEST_MODE === 'true') {
    return false;
  }

  return true;
}

/**
 * Start fallback console interface when Ink is not supported
 */
async function startFallbackUI(agentManager) {
  logger.info('Starting console interface (Ink not supported in this environment)');
  
  // Simple console interface
  console.log('\n🖥️  Napoleon Agent Manager');
  console.log('==============================');
  console.log('');
  console.log('Interactive UI not available in this environment.');
  console.log('Environment details:');
  console.log(`  • TTY Input: ${Boolean(process.stdin.isTTY)}`);
  console.log(`  • TTY Output: ${Boolean(process.stdout.isTTY)}`);
  console.log(`  • Raw Mode: ${typeof process.stdin.setRawMode === 'function'}`);
  console.log(`  • Node Env: ${process.env.NODE_ENV || 'not set'}`);
  console.log('');
  
  // List current agents
  try {
    const agents = agentManager.getActiveAgents();
    if (agents.length === 0) {
      console.log('No agents currently running.');
    } else {
      console.log('Current agents:');
      agents.forEach((agent, index) => {
        console.log(`  ${index + 1}. ${agent.name} (${agent.status})`);
      });
    }
  } catch (error) {
    console.log('Could not list agents:', error.message);
  }
  
  console.log('');
  console.log('Available commands:');
  console.log('  napoleon agent spawn "<instructions>" - Create a new agent');
  console.log('  napoleon agent list                  - List all agents');
  console.log('  napoleon agent terminate <id>        - Terminate an agent');
  console.log('');
  console.log('For interactive UI, run Napoleon in a proper terminal environment.');
  console.log('');
}

async function startInkWithManager(agentManager) {
  // Check if Ink is supported in current environment
  if (!isInkSupported()) {
    logger.info('Ink UI not supported in current environment, using fallback');
    await startFallbackUI(agentManager);
    return;
  }

  try {
    // Dynamic import for ESM modules
    const { render } = await import('ink');
    const React = await import('react');

    // Create the App component with dynamic imports
    const createApp = require('./createApp');
    const App = await createApp();

    // Create the app element with AgentManager
    const appElement = React.createElement(App, { agentManager });

    // Render the app with error handling for raw mode
    let result;
    try {
      result = render(appElement);
    } catch (renderError) {
      if (renderError.message.includes('Raw mode is not supported')) {
        logger.warn('Raw mode not supported, falling back to blessed UI');
        await startFallbackUI(agentManager);
        return;
      }
      throw renderError;
    }

    const { unmount, waitUntilExit, clear } = result;

    // Handle cleanup on exit
    process.on('exit', () => {
      clear();
    });

    // Wait for the app to exit
    await waitUntilExit();

    logger.info('Ink UI closed');
  } catch (error) {
    logger.error('Failed to start Ink UI with AgentManager', { error: error.message });
    
    // Try fallback UI if Ink fails
    if (error.message.includes('Raw mode is not supported')) {
      logger.info('Attempting fallback UI due to raw mode issue');
      await startFallbackUI(agentManager);
    } else {
      throw error;
    }
  }
}

module.exports = startInkWithManager;
