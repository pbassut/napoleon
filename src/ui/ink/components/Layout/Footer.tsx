import React from 'react';
import { Box, Text } from 'ink';

const Footer: React.FC = () => {
  return (
    <Box borderStyle="single" paddingX={1}>
      <Text color="gray">Press q to quit | h for help</Text>
    </Box>
  );
};

export default Footer;