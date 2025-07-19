import React, { useState } from 'react';
import { Box, useApp, Text } from 'ink';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { Footer } from './components/Layout/Footer';

const App: React.FC = () => {
  const { exit } = useApp();
  const [agentCount] = useState(3); // Placeholder state for agent count
  
  React.useEffect(() => {
    const handleExit = (input: string) => {
      if (input === 'q') {
        exit();
      }
    };
    
    process.stdin.on('data', (data) => {
      const input = data.toString();
      handleExit(input);
    });
    
    return () => {
      process.stdin.removeAllListeners('data');
    };
  }, [exit]);
  
  return (
    <ErrorBoundary>
      <Box flexDirection="column" height="100%">
        <Header />
        <MainContent>
          <Box padding={1}>
            <Text>Agent list placeholder - will be implemented in next story</Text>
          </Box>
        </MainContent>
        <Footer agentCount={agentCount} />
      </Box>
    </ErrorBoundary>
  );
};

export default App;