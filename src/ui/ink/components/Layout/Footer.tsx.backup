import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  agentCount: number;
}

export const Footer: React.FC<FooterProps> = ({ agentCount }) => {
  return (
    <Box 
      borderStyle="single" 
      borderColor="blue" 
      paddingX={1}
      width="100%"
      justifyContent="space-between"
    >
      <Text color="white">
        q=quit | n=new agent | d=delete agent | Enter=view details | h=help
      </Text>
      <Text color="gray">
        {agentCount} agent{agentCount !== 1 ? 's' : ''} running
      </Text>
    </Box>
  );
};