// Ink UI entry point for CommonJS compatibility with ESM module
import './wdyr'; // Must be first import
import React from 'react';
import { render } from 'ink';
import App from './App';
import logger from '../../utils/logger';

async function startInkUI() {
  try {
    // Mock AgentManager with state
    const mockAgents = [];
    let agentCounter = 1;
    
    const mockAgentManager = {
      initialize: async () => {},
      getActiveAgents: () => [...mockAgents],
      canSpawnAgent: () => mockAgents.length < 3,
      spawnAgent: async ({ instructions, workingDirectory }) => {
        logger.info('Mock spawn agent', { instructions, workingDirectory });
        const newAgent = { 
          id: `agent-${Date.now()}`, 
          name: `Agent ${agentCounter++}: ${instructions.substring(0, 30)}...`,
          status: 'running',
          instructions,
          startTime: new Date()
        };
        mockAgents.push(newAgent);
        return newAgent;
      },
      terminateAgent: async (agentId) => {
        logger.info('Mock terminate agent', { agentId });
        const index = mockAgents.findIndex(a => a.id === agentId);
        if (index >= 0) {
          mockAgents.splice(index, 1);
        }
      },
      maxAgents: 3,
    };

    // Enable debug mode when performance debugging is active
    const debugMode = process.env.NAPOLEON_DEBUG_RENDERS === 'true' || 
                     process.env.NODE_ENV === 'development';
    
    const { clear } = render(<App agentManager={mockAgentManager} />, {
      debug: debugMode
    });

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