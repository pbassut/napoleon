import React from 'react';
import { Box, Text } from 'ink';

const { memo } = React;

interface FooterProps {
  agentCount: number;
}

export const Footer: React.FC<FooterProps> = memo(() => (
  <Box width="100%" paddingX={1}>
    <Box>
      <Text color="yellow">[n]</Text>
      <Text>ew agent  </Text>
      <Text color="yellow">[d]</Text>
      <Text>elete  </Text>
      <Text color="yellow">[Enter]</Text>
      <Text> inspect  </Text>
      <Text color="yellow">[q]</Text>
      <Text>uit     </Text>
      <Text color="gray">🔍 </Text>
      <Text color="gray">[/] search  </Text>
      <Text color="gray">[f] follow</Text>
    </Box>
  </Box>
));

Footer.displayName = 'Footer';
Footer.whyDidYouRender = true;
