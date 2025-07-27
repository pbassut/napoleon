import React from 'react';
import { Box, Text } from 'ink';

const { memo } = React;

const Header: React.FC = memo(() => (
  <Box width="100%" justifyContent="center" paddingY={1}>
    <Text bold>Napoleon</Text>
  </Box>
));

Header.displayName = 'Header';
Header.whyDidYouRender = true;

export default Header;
