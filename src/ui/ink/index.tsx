// Ink UI entry point for CommonJS compatibility with ESM module
import React from 'react';
import { render } from 'ink';
import App from './App';
import logger from '../../utils/logger';

async function startInkUI() {
  try {
    // Mock AgentManager for now
    const mockAgentManager = {
      initialize: async () => {},
      getActiveAgents: () => [],
      canSpawnAgent: () => true,
      spawnAgent: async ({ instructions, workingDirectory }) => {
        logger.info('Mock spawn agent', { instructions, workingDirectory });
        return { id: `agent-${Date.now()}`, name: 'mock-agent', status: 'running' };
      },
      terminateAgent: async (agentId) => {
        logger.info('Mock terminate agent', { agentId });
      },
      maxAgents: 3,
    };

    const { clear } = render(<App agentManager={mockAgentManager} />);

    process.on('exit', () => {
      clear();
    });

    logger.info('Ink UI started successfully');
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