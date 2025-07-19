#!/usr/bin/env node

const React = require('react');
const { render, Box, Text } = require('ink');

const { useState } = React;

// Mock agent data generator
function generateMockAgents(count) {
  const statuses = ['running', 'pending', 'error', 'terminated', 'success'];
  const prefixes = ['feature', 'bugfix', 'refactor', 'docs', 'test', 'perf', 'security', 'deploy'];
  const suffixes = ['auth', 'ui', 'api', 'database', 'cache', 'logging', 'monitoring', 'config'];

  const agents = [];
  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    agents.push({
      id: `agent-${i + 1}`,
      name: `${prefix}-${suffix}-agent-${i + 1}`,
      status,
    });
  }
  return agents;
}

// Test App
const TestApp = () => {
  const [agents] = useState(() => generateMockAgents(50));
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Import AgentList dynamically
  const AgentList = require('./components/AgentList/AgentList').default;

  return React.createElement(
    Box,
    { flexDirection: 'column', height: '100%' },
    React.createElement(
      Box,
      { borderStyle: 'single', paddingX: 1 },
      React.createElement(Text, { color: 'cyan', bold: true }, 'Agent List Test - 50 Agents'),
    ),
    React.createElement(
      Box,
      { flexGrow: 1, paddingX: 1, paddingY: 1 },
      React.createElement(AgentList, {
        agents,
        selectedIndex,
        onSelectionChange: setSelectedIndex,
        height: 20,
      }),
    ),
    React.createElement(
      Box,
      { paddingX: 1 },
      React.createElement(
        Text,
        { color: 'gray' },
        `Selected: ${agents[selectedIndex]?.name || 'None'} | Use ↑/↓ or j/k to navigate | Press q to quit`,
      ),
    ),
  );
};

// Run the test
const { clear } = render(React.createElement(TestApp));

process.on('exit', () => {
  clear();
});
