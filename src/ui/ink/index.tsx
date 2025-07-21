// Ink UI entry point for direct testing with real AgentManager
import './wdyr'; // Must be first import
import React from 'react';
import { render } from 'ink';
import App from './App';
import logger from '../../utils/logger.js';
import AgentManagerClass from '../../core/agent-manager.js';

async function startInkUI() {
  try {
    // Use real AgentManager instead of mock
    const agentManager = new AgentManagerClass();
    await agentManager.initialize();
    logger.info('Real AgentManager initialized for testing');

    // Enable debug mode when performance debugging is active
    const debugMode = process.env.NAPOLEON_DEBUG_RENDERS === 'true' || 
                     process.env.NODE_ENV === 'development';
    
    const { clear } = render(<App agentManager={agentManager} />, {
      debug: debugMode
    });

    process.on('exit', () => {
      clear();
    });

    logger.info('Ink UI started successfully with real AgentManager');
  } catch (error) {
    logger.error('Failed to start Ink UI', { error: error.message });
    throw error;
  }
}

// Start the UI
startInkUI().catch((error) => {
  console.error('Failed to initialize Ink UI:', error.message);
  process.exit(1);
});

export {};