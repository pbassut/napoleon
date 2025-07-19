import React from 'react';
import { Box } from 'ink';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Header from './components/Layout/Header';
import MainContent from './components/Layout/MainContent';
import Footer from './components/Layout/Footer';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Box flexDirection="column" height="100%">
        <Header />
        <MainContent />
        <Footer />
      </Box>
    </ErrorBoundary>
  );
};

export default App;