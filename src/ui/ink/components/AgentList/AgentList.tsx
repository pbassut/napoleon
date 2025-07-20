import React from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import AgentItem from './AgentItem';
import { Agent } from '../../types';

const { useState, useEffect, useMemo, useCallback } = React;

interface AgentListProps {
  agents: Agent[];
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
  height?: number;
}

const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedIndex,
  onSelectionChange,
  height = 10,
}) => {
  const { isFocused } = useFocus();
  const [scrollOffset, setScrollOffset] = useState(0);

  // Reserve 4 lines for header row, borders, and potential scroll indicators
  const visibleItems = Math.max(1, height - 4);

  const visibleAgents = useMemo(() => agents.slice(scrollOffset, scrollOffset + visibleItems), [agents, scrollOffset, visibleItems]);

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

  // Handle keyboard input for future features
  useInput(useCallback((input: string, key: any) => {
    if (!isFocused) return;

    if (key.upArrow || input === 'k') {
      const newIndex = Math.max(0, selectedIndex - 1);
      onSelectionChange(newIndex);
      adjustScrollOffset(newIndex);
    } else if (key.downArrow || input === 'j') {
      const newIndex = Math.min(agents.length - 1, selectedIndex + 1);
      onSelectionChange(newIndex);
      adjustScrollOffset(newIndex);
    } else if (input === '/') {
      // Future: Search functionality
      // For now, we could show a message
    } else if (input === 'f') {
      // Future: Follow mode
      // For now, we could show a message
    }
  }, [isFocused, selectedIndex, agents.length, onSelectionChange, adjustScrollOffset]), { isActive: isFocused });

  // Empty state
  if (agents.length === 0) {
    return (
      <Box
        flexDirection="column"
        height={height}
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
      >
        {/* Column headers */}
        <Box paddingY={1} paddingX={1}>
          <Box width={2}><Text> </Text></Box>
          <Box width={50}><Text bold>Agent</Text></Box>
          <Box width={10} justifyContent="flex-end"><Text bold>Runtime</Text></Box>
          <Box width={18} marginLeft={2}><Text bold>Status</Text></Box>
        </Box>
        
        {/* Separator line */}
        <Box width="100%" paddingX={1}>
          <Text>{'─'.repeat(80)}</Text>
        </Box>

        {/* Empty state message */}
        <Box
          flexGrow={1}
          justifyContent="center"
          alignItems="center"
        >
          <Box flexDirection="column" alignItems="center">
            <Text color="gray">No agents running</Text>
            <Text color="gray">Press 'n' to spawn a new agent</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const showScrollIndicators = agents.length > visibleItems;
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + visibleItems < agents.length;

  return (
    <Box
      flexDirection="column"
      height={height}
      borderStyle="round"
      borderColor={isFocused ? 'cyan' : 'gray'}
    >
      {/* Column headers */}
      <Box paddingY={1} paddingX={2}>
        <Box width={2}><Text> </Text></Box>
        <Box width={50}><Text bold>Agent</Text></Box>
        <Box width={10} justifyContent="flex-end"><Text bold>Runtime</Text></Box>
        <Box width={18} marginLeft={2}><Text bold>Status</Text></Box>
      </Box>
      
      {/* Separator line */}
      <Box width="100%" paddingX={2}>
        <Text>{'─'.repeat(80)}</Text>
      </Box>

      {/* Scroll indicator - top */}
      {showScrollIndicators && hasMoreAbove && (
        <Box paddingX={2}>
          <Text color="gray" dimColor>{`↑ ${scrollOffset} more above ↑`}</Text>
        </Box>
      )}

      {/* Agent list with spacing */}
      <Box flexDirection="column" flexGrow={1} paddingTop={1}>
        {visibleAgents.map((agent, index) => (
          <Box key={agent.id} paddingY={0}>
            <AgentItem
              agent={agent}
              isSelected={scrollOffset + index === selectedIndex}
              isFocused={isFocused}
              index={scrollOffset + index}
            />
          </Box>
        ))}
      </Box>

      {/* Scroll indicator - bottom */}
      {showScrollIndicators && hasMoreBelow && (
        <Box paddingX={2} paddingBottom={1}>
          <Text color="gray" dimColor>
            {`↓ ${agents.length - scrollOffset - visibleItems} more below ↓`}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default AgentList;
