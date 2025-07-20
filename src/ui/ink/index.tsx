// Ink UI entry point for CommonJS compatibility with ESM module
import React from 'react';
const { useState, useEffect } = React;
const logger = require('../../utils/logger');

async function startInkUI() {
  try {
    // Dynamic import for ESM module
    const {
      render, Box, Text, useApp,
    } = await import('ink');

    // Import our components
    const AgentListModule = await import('./components/AgentList/AgentList');
    const AgentList = AgentListModule.default;

    // Mock data for now
    const mockAgents = [
      { id: '1', name: 'feature-branch-agent', status: 'running', startTime: new Date() },
      { id: '2', name: 'bugfix-auth-agent', status: 'pending', startTime: new Date() },
      { id: '3', name: 'refactor-ui-agent', status: 'error', startTime: new Date() },
      { id: '4', name: 'docs-update-agent', status: 'success', startTime: new Date() },
      { id: '5', name: 'test-coverage-agent', status: 'running', startTime: new Date() },
      { id: '6', name: 'performance-optimization-agent', status: 'terminated', startTime: new Date() },
    ];

    const App = () => {
      const { exit } = useApp();
      const [selectedIndex, setSelectedIndex] = useState(0);

      useEffect(() => {
        const handleExit = (data) => {
          if (data.toString() === 'q') {
            exit();
          }
        };

        process.stdin.on('data', handleExit);
        return () => {
          process.stdin.removeListener('data', handleExit);
        };
      }, [exit]);

      return (
        <Box flexDirection="column" height="100%">
          <Box borderStyle="single" paddingX={1}>
            <Text color="cyan" bold>
              Napoleon - Agent Driven Development Manager (Ink UI)
            </Text>
          </Box>
          <Box flexGrow={1} paddingX={1} paddingY={1}>
            <AgentList
              agents={mockAgents}
              selectedIndex={selectedIndex}
              onSelectionChange={setSelectedIndex}
              height={15}
            />
          </Box>
          <Box paddingX={1}>
            <Text color="gray">
              Press q to quit | Use ↑/↓ or j/k to navigate
            </Text>
          </Box>
        </Box>
      );
    };

    const { clear } = render(<App />);

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