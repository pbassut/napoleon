import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import AgentItem from './AgentItem';

export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'pending' | 'error' | 'terminated' | 'success';
  instructions?: string;
  startTime?: Date;
}

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
  
  const visibleItems = Math.max(1, height - 2);
  
  const visibleAgents = useMemo(() => {
    return agents.slice(scrollOffset, scrollOffset + visibleItems);
  }, [agents, scrollOffset, visibleItems]);
  
  const adjustScrollOffset = (newSelectedIndex: number) => {
    if (newSelectedIndex < scrollOffset) {
      setScrollOffset(newSelectedIndex);
    } else if (newSelectedIndex >= scrollOffset + visibleItems) {
      setScrollOffset(newSelectedIndex - visibleItems + 1);
    }
  };
  
  useEffect(() => {
    adjustScrollOffset(selectedIndex);
  }, [selectedIndex]);
  
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.upArrow || input === 'k') {
      const newIndex = Math.max(0, selectedIndex - 1);
      onSelectionChange(newIndex);
      adjustScrollOffset(newIndex);
    } else if (key.downArrow || input === 'j') {
      const newIndex = Math.min(agents.length - 1, selectedIndex + 1);
      onSelectionChange(newIndex);
      adjustScrollOffset(newIndex);
    }
  }, { isActive: isFocused });
  
  if (agents.length === 0) {
    return (
      <Box flexDirection="column" height={height} borderStyle="single" borderColor="gray">
        <Box paddingX={1} paddingY={1} justifyContent="center" alignItems="center">
          <Text color="gray">No agents running</Text>
        </Box>
      </Box>
    );
  }
  
  const showScrollIndicators = agents.length > visibleItems;
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + visibleItems < agents.length;
  
  return (
    <Box flexDirection="column" height={height} borderStyle="single" borderColor={isFocused ? 'cyan' : 'gray'}>
      {showScrollIndicators && hasMoreAbove && (
        <Box paddingX={1}>
          <Text color="gray">▲ {scrollOffset} more above</Text>
        </Box>
      )}
      
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
      
      {showScrollIndicators && hasMoreBelow && (
        <Box paddingX={1}>
          <Text color="gray">▼ {agents.length - scrollOffset - visibleItems} more below</Text>
        </Box>
      )}
    </Box>
  );
};

export default AgentList;