import React from 'react';
import { Box, Text } from 'ink';

export const Header: React.FC = () => (
  <Box
    width="100%"
    justifyContent="center"
    paddingY={1}
    borderStyle="single"
    borderBottom
    borderTop={false}
    borderLeft={false}
    borderRight={false}
  >
    <Text bold>Napoleon</Text>
  </Box>
);
