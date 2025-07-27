import React from 'react';
import { Box } from 'ink';

interface MainContentProps {
  children: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => (
  <Box flexGrow={1} flexDirection="column">
    {children}
  </Box>
);

MainContent.whyDidYouRender = true;

export default MainContent;
