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

  // Memoize separator line to avoid recalculation
  const separatorLine = useMemo(() => {
    const width = process.stdout.columns || 80;
    return '─'.repeat(Math.max(1, width - 8));
  }, []); // Empty deps - only calculate once

  // Reserve lines for header and potential scroll indicators
  const visibleItems = Math.max(1, height - 3);

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
      <Box flexDirection="column" flexGrow={1}>
        {/* Column headers */}
        <Box>
          <Box width={2}><Text> </Text></Box>
          <Box width={50}><Text bold>Agent</Text></Box>
          <Box width={10} justifyContent="flex-end"><Text bold>Runtime</Text></Box>
          <Box width={18} marginLeft={2}><Text bold>Status</Text></Box>
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
          <Box flexDirection="column" alignItems="center">
            <Text color="gray">No agents running</Text>
            <Box marginTop={1}>
              <Text color="gray">Press 'n' to spawn a new agent</Text>
            </Box>
          </Box>
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
        <Box width={50}><Text bold>Agent</Text></Box>
        <Box width={10} justifyContent="flex-end"><Text bold>Runtime</Text></Box>
        <Box width={18} marginLeft={2}><Text bold>Status</Text></Box>
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
        {visibleAgents.map((agent, index) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            isSelected={scrollOffset + index === selectedIndex}
            isFocused={isFocused}
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
AgentList.whyDidYouRender = true;

export default AgentList;