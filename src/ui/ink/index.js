// Ink UI entry point for CommonJS compatibility with ESM module
const logger = require('../../utils/logger');

async function startInkUI() {
  try {
    // Dynamic import for ESM module
    const { render, Box, Text } = await import('ink');
    const React = await import('react');
    
    const App = () => {
      return React.createElement(Box, {
        flexDirection: 'column',
        height: '100%',
        borderStyle: 'single',
        padding: 1,
      }, [
        React.createElement(Text, { key: 'header', color: 'cyan', bold: true }, 
          'Napoleon - Agent Driven Development Manager (Ink UI)'),
        React.createElement(Text, { key: 'content' }, 
          'Welcome to Napoleon Ink UI!'),
        React.createElement(Text, { key: 'help', color: 'gray' }, 
          'Press q to quit'),
      ]);
    };

    const { clear } = render(React.createElement(App));

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