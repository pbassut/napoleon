import React from 'react';
import { Box, Text } from 'ink';

export const Header: React.FC = () => {
  const packageJson = require('../../../../../package.json');
  const version = packageJson.version;
  
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