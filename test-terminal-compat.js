#!/usr/bin/env node

/**
 * Comprehensive terminal compatibility test for Napoleon Ink UI
 * Tests all UI components with terminal capability detection
 */

const React = require('react');
const { detectCapabilities } = require('./src/ui/ink/utils/terminal-capabilities');
const { getPerformanceReport } = require('./src/ui/ink/utils/performance-monitor');

async function runCompatibilityTest() {
  console.log('Napoleon Ink UI - Terminal Compatibility Test\n');
  
  const capabilities = detectCapabilities();
  console.log('Terminal:', capabilities.terminalName);
  console.log('Capabilities:', JSON.stringify(capabilities, null, 2));
  console.log('\nStarting UI test...\n');

  try {
    // Dynamic imports for ESM
    const { render } = await import('ink');
    const { Box, Text, useInput, useApp } = await import('ink');
    const { useState, useEffect } = React;

    // Import compatibility components
    const { AgentListCompat } = require('./src/ui/ink/components/AgentList/AgentListCompat');
    const { usePerformanceMonitor } = require('./src/ui/ink/utils/performance-monitor');
    const { getBoxChar, getStatusSymbol } = require('./src/ui/ink/utils/terminal-capabilities');
    const { normalizeKey, matchesBinding, getKeyDescription } = require('./src/ui/ink/utils/input-normalizer');

    // Test App Component
    const TestApp = () => {
      const { exit } = useApp();
      const [selectedIndex, setSelectedIndex] = useState(0);
      const [testPhase, setTestPhase] = useState('list');
      const [keyLog, setKeyLog] = useState([]);
      const perfMonitor = usePerformanceMonitor('TestApp');

      // Mock agents for testing
      const mockAgents = [
        { id: '1', name: 'test-agent-running', status: 'running' },
        { id: '2', name: 'test-agent-pending-with-long-name-truncation', status: 'pending' },
        { id: '3', name: 'test-agent-error', status: 'error' },
        { id: '4', name: 'test-agent-success', status: 'success' },
        { id: '5', name: 'test-agent-terminated', status: 'terminated' },
        // Add more for scroll testing
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `scroll-${i}`,
          name: `scroll-test-agent-${i}`,
          status: ['running', 'pending', 'error'][i % 3],
        })),
      ];

      // Handle keyboard input
      useInput((input, key) => {
        const normalized = normalizeKey(input, key);
        
        // Log key for debugging
        const keyInfo = {
          input: input.replace(/\x1b/g, '\\x1b'),
          key: Object.keys(normalized).filter(k => normalized[k] && k !== 'sequence'),
          timestamp: new Date().toISOString(),
        };
        setKeyLog(prev => [...prev.slice(-4), keyInfo]);

        // Test phase navigation
        if (input === '1') setTestPhase('list');
        if (input === '2') setTestPhase('colors');
        if (input === '3') setTestPhase('performance');
        if (input === '4') setTestPhase('keys');

        // Exit on 'q' or Escape
        if (matchesBinding(normalized, 'quit')) {
          console.log('\nPerformance Report:\n');
          console.log(getPerformanceReport());
          exit();
        }
      });

      // Performance test
      useEffect(() => {
        if (testPhase === 'performance') {
          const interval = setInterval(() => {
            // Force re-render to test performance
            setSelectedIndex(prev => (prev + 1) % mockAgents.length);
          }, 100);
          
          return () => clearInterval(interval);
        }
      }, [testPhase, mockAgents.length]);

      return React.createElement(Box, { flexDirection: 'column' }, [
        // Header
        React.createElement(
          Box,
          { key: 'header', borderStyle: 'single', paddingX: 1, marginBottom: 1 },
          React.createElement(
            Text,
            { bold: true },
            `Napoleon Terminal Test - ${capabilities.terminalName}`
          )
        ),

        // Navigation
        React.createElement(
          Box,
          { key: 'nav', gap: 2, marginBottom: 1 },
          ['1:List', '2:Colors', '3:Perf', '4:Keys'].map((item, i) => 
            React.createElement(
              Text,
              { 
                key: item,
                color: testPhase === ['list', 'colors', 'performance', 'keys'][i] ? 'cyan' : 'gray',
                bold: testPhase === ['list', 'colors', 'performance', 'keys'][i],
              },
              item
            )
          )
        ),

        // Content based on test phase
        testPhase === 'list' && React.createElement(
          Box,
          { key: 'list-test', flexDirection: 'column' },
          React.createElement(Text, { color: 'yellow' }, 'Agent List Test:'),
          React.createElement(AgentListCompat, {
            agents: mockAgents,
            selectedIndex,
            onSelectionChange: setSelectedIndex,
            height: 10,
          })
        ),

        testPhase === 'colors' && React.createElement(
          Box,
          { key: 'color-test', flexDirection: 'column', gap: 1 },
          React.createElement(Text, { color: 'yellow' }, 'Color Capability Test:'),
          React.createElement(Text, null, `Detected: ${capabilities.colors} color support`),
          React.createElement(Box, { gap: 1 }, [
            React.createElement(Text, { key: 'r', color: 'red' }, 'Red'),
            React.createElement(Text, { key: 'g', color: 'green' }, 'Green'),
            React.createElement(Text, { key: 'b', color: 'blue' }, 'Blue'),
            React.createElement(Text, { key: 'y', color: 'yellow' }, 'Yellow'),
            React.createElement(Text, { key: 'c', color: 'cyan' }, 'Cyan'),
            React.createElement(Text, { key: 'm', color: 'magenta' }, 'Magenta'),
          ]),
          capabilities.colors === 'truecolor' && React.createElement(
            Text,
            { color: '#FF6B6B' },
            'True Color Test: #FF6B6B'
          )
        ),

        testPhase === 'performance' && React.createElement(
          Box,
          { key: 'perf-test', flexDirection: 'column' },
          React.createElement(Text, { color: 'yellow' }, 'Performance Test (rapid updates):'),
          React.createElement(Text, { dimColor: true }, 'Monitoring render performance...'),
          React.createElement(AgentListCompat, {
            agents: mockAgents.slice(0, 10),
            selectedIndex: selectedIndex % 10,
            onSelectionChange: () => {},
            height: 8,
          })
        ),

        testPhase === 'keys' && React.createElement(
          Box,
          { key: 'key-test', flexDirection: 'column', gap: 1 },
          React.createElement(Text, { color: 'yellow' }, 'Keyboard Input Test:'),
          React.createElement(Text, { dimColor: true }, 'Press any key to see normalized output'),
          React.createElement(Box, { flexDirection: 'column', marginTop: 1 }, 
            keyLog.map((log, i) => 
              React.createElement(
                Text,
                { key: i, color: 'gray' },
                `${log.input} → ${log.key.join(', ')}`
              )
            )
          ),
          React.createElement(Box, { flexDirection: 'column', marginTop: 1 }, [
            React.createElement(Text, { key: 'h1', color: 'cyan' }, 'Key Bindings:'),
            React.createElement(Text, { key: 'h2' }, `Up: ${getKeyDescription('up')}`),
            React.createElement(Text, { key: 'h3' }, `Down: ${getKeyDescription('down')}`),
            React.createElement(Text, { key: 'h4' }, `Quit: ${getKeyDescription('quit')}`),
          ])
        ),

        // Footer
        React.createElement(
          Box,
          { key: 'footer', marginTop: 1 },
          React.createElement(
            Text,
            { dimColor: true },
            'Press 1-4 to switch tests, q to quit'
          )
        ),
      ]);
    };

    // Render the test app
    const { unmount, waitUntilExit } = render(React.createElement(TestApp));

    // Wait for exit
    await waitUntilExit();
    unmount();

    console.log('\nTest completed successfully!');
    
    // Show final compatibility summary
    console.log('\nCompatibility Summary:');
    console.log('✓ Terminal detected:', capabilities.terminalName);
    console.log('✓ Color support:', capabilities.colors);
    console.log('✓ Unicode:', capabilities.unicode ? 'Enabled' : 'ASCII fallback');
    console.log('✓ Performance:', 'Check report above');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runCompatibilityTest().catch(console.error);