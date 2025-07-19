import React from 'react';
import { Box, Text } from 'ink';

const Header: React.FC = () => {
  return (
    <Box borderStyle="single" paddingX={1}>
      <Text color="cyan" bold>
        Napoleon - Agent Driven Development Manager
      </Text>
    </Box>
  );
};

export default Header;