import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  agentCount: number;
}

export const Footer: React.FC<FooterProps> = () => (
  <Box
    width="100%"
    paddingX={1}
    paddingY={1}
    borderStyle="single"
    borderTop
    borderBottom={false}
    borderLeft={false}
    borderRight={false}
  >
    <Box gap={2}>
      <Text color="yellow">[n]</Text>
      <Text>ew agent</Text>
      <Text color="yellow">[d]</Text>
      <Text>elete</Text>
      <Text color="yellow">[Enter]</Text>
      <Text> inspect</Text>
      <Text color="yellow">[q]</Text>
      <Text>uit</Text>
      <Box marginLeft={4}>
        <Text color="gray">🔍 [/] search</Text>
      </Box>
      <Box marginLeft={2}>
        <Text color="gray">[f] follow</Text>
      </Box>
    </Box>
  </Box>
);
