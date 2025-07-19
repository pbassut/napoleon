import React from 'react';
import { Box, Text } from 'ink';

const MainContent: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1} flexGrow={1}>
      <Text>Welcome to Napoleon Ink UI!</Text>
      <Text color="gray">This is a placeholder for the main content area.</Text>
    </Box>
  );
};

export default MainContent;