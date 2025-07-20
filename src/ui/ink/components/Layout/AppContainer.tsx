import React from 'react';
import { Box, Text } from 'ink';

interface AppContainerProps {
  children: React.ReactNode;
}

export const AppContainer: React.FC<AppContainerProps> = ({ children }) => {
  const width = 82; // Fixed width for consistency
  
  return (
    <Box flexDirection="column" width={width}>
      {/* Top border */}
      <Box>
        <Text>┌{'─'.repeat(width - 2)}┐</Text>
      </Box>
      
      {/* Content with side borders */}
      <Box flexDirection="column" flexGrow={1}>
        {React.Children.map(children, (child, index) => (
          <Box key={index}>
            <Text>│</Text>
            <Box width={width - 2} flexGrow={1}>
              {child}
            </Box>
            <Text>│</Text>
          </Box>
        ))}
      </Box>
      
      {/* Bottom border */}
      <Box>
        <Text>└{'─'.repeat(width - 2)}┘</Text>
      </Box>
    </Box>
  );
};