import React from 'react';
import { Box, Text } from 'ink';
import AgentItem from './AgentItem';
import { Agent } from '../../types';
import logger from '../../../../utils/logger';

const {
  useState, useEffect, useMemo, useCallback,
} = React;

interface AgentListProps {
  agents: Agent[];
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
  height?: number;
  isModalOpen?: boolean;
}

const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedIndex,
  height = 10,
  isModalOpen = false,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Log component lifecycle
  useEffect(() => {
    logger.debug('AgentList: Component mounted', {
      agentsCount: agents.length,
      selectedIndex,
      isModalOpen,
    });

    return () => {
      logger.debug('AgentList: Component unmounting');
    };
  }, []);

  // Log selection changes
  useEffect(() => {
    logger.debug('AgentList: Selected index changed', {
      selectedIndex,
      agentsCount: agents.length,
    });
  }, [selectedIndex, agents.length]);

  // Memoize separator line to avoid recalculation
  const separatorLine = useMemo(() => {
    const width = process.stdout.columns || 80;
    return '─'.repeat(Math.max(1, width - 8));
  }, []); // Empty deps - only calculate once

  // Reserve lines for header and potential scroll indicators
  const visibleItems = Math.max(1, height - 3);

  const adjustScrollOffset = useCallback((newSelectedIndex: number) => {
    if (newSelectedIndex < scrollOffset) {
      setScrollOffset(newSelectedIndex);
    } else if (newSelectedIndex >= scrollOffset + visibleItems) {
      setScrollOffset(newSelectedIndex - visibleItems + 1);
    }
  }, [scrollOffset, visibleItems]);

  useEffect(() => {
    adjustScrollOffset(selectedIndex);
  }, [selectedIndex, adjustScrollOffset]);

  // Navigation is now handled at the App level
  // This component just displays the list and responds to selection changes

  // Empty state
  if (agents.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        {/* Column headers */}
        <Box>
          <Box width={2}><Text> </Text></Box>
          <Box width={35}><Text bold>Agent</Text></Box>
          <Box width={10} justifyContent="flex-end"><Text bold>Runtime</Text></Box>
          <Box width={18} marginLeft={2}><Text bold>Status</Text></Box>
          <Box width={25} marginLeft={2}><Text bold>Current Task</Text></Box>
        </Box>

        {/* Separator line */}
        <Box width="100%">
          <Text>{separatorLine}</Text>
        </Box>

        {/* Empty state message */}
        <Box
          flexGrow={1}
          justifyContent="center"
          alignItems="center"
          minHeight={height - 3}
        >
          {!isModalOpen && (
            <Box flexDirection="column" alignItems="center">
              <Text color="gray">No agents running</Text>
              <Box marginTop={1}>
                <Text color="gray">Press 'n' to spawn a new agent</Text>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  const showScrollIndicators = agents.length > visibleItems;
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + visibleItems < agents.length;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Column headers */}
      <Box>
        <Box width={2}><Text> </Text></Box>
        <Box width={35}><Text bold>Agent</Text></Box>
        <Box width={10} justifyContent="flex-end"><Text bold>Runtime</Text></Box>
        <Box width={18} marginLeft={2}><Text bold>Status</Text></Box>
        <Box width={25} marginLeft={2}><Text bold>Current Task</Text></Box>
      </Box>

      {/* Separator line */}
      <Box width="100%">
        <Text>{'─'.repeat(process.stdout.columns - 8)}</Text>
      </Box>

      {/* Scroll indicator - top */}
      {showScrollIndicators && hasMoreAbove && (
        <Box paddingY={0}>
          <Text color="gray" dimColor>{`↑ ${scrollOffset} more above ↑`}</Text>
        </Box>
      )}

      {/* Agent list */}
      <Box flexDirection="column" flexGrow={1}>
        {agents.map((agent, index) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            isSelected={scrollOffset + index === selectedIndex}
            isFocused={true} // Always focused now since App handles input
            index={scrollOffset + index}
          />
        ))}
      </Box>

      {/* Scroll indicator - bottom */}
      {showScrollIndicators && hasMoreBelow && (
        <Box paddingY={0}>
          <Text color="gray" dimColor>
            {`↓ ${agents.length - scrollOffset - visibleItems} more below ↓`}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Enable why-did-you-render for this component
AgentList.whyDidYouRender = false;

export default AgentList;
