import React from 'react';
import { Box, Text } from 'ink';

// Import package.json at module level for better performance and type safety
const { version } = require('../../../../../package.json');

export const Header: React.FC = () => {
  
  return (
    <Box 
      borderStyle="single" 
      borderColor="blue" 
      paddingX={1}
      width="100%"
    >
      <Text color="white" bold>
        Napoleon v{version}
      </Text>
    </Box>
  );
};