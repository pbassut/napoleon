import React from 'react';
import { Box, Text } from 'ink';
import { Agent } from '../../types';
import { getStatusInfo } from '../../constants/agentStatus';

const { memo } = React;

interface AgentItemProps {
  agent: Agent;
  isSelected: boolean;
  isFocused: boolean;
  index: number;
}

// Format runtime duration from seconds to human-readable format
const formatRuntime = (startTime: Date | undefined): string => {
  if (!startTime) return '0s';
  
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = now.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return `${diffSecs}s`;
  } else if (diffSecs < 3600) {
    const minutes = Math.floor(diffSecs / 60);
    const seconds = diffSecs % 60;
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(diffSecs / 3600);
    const minutes = Math.floor((diffSecs % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

const AgentItem: React.FC<AgentItemProps> = memo(({
  agent, isSelected, isFocused, index,
}) => {
  const statusInfo = getStatusInfo(agent.status);
  const textColor = isSelected && isFocused ? 'cyan' : 'white';
  const selectionColor = isSelected && isFocused ? 'cyan' : undefined;

  const truncateName = (name: string, maxLength: number = 40): string => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength - 3)}...`;
  };

  return (
    <Box 
      paddingX={1} 
      width="100%"
    >
      {/* Selection indicator */}
      <Box width={2}>
        <Text color={selectionColor}>
          {isSelected ? '❯' : ' '}
        </Text>
      </Box>

      {/* Agent name column */}
      <Box width={50}>
        <Text color={textColor} bold={isSelected}>
          {truncateName(agent.name)}
        </Text>
      </Box>

      {/* Runtime column - right aligned */}
      <Box width={10} justifyContent="flex-end">
        <Text color={textColor}>
          {formatRuntime(agent.startTime)}
        </Text>
      </Box>

      {/* Status column */}
      <Box width={18} marginLeft={2}>
        <Text>{statusInfo.emoji} </Text>
        <Text color={statusInfo.color}>{statusInfo.text}</Text>
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => prevProps.agent.status === nextProps.agent.status
         && prevProps.agent.name === nextProps.agent.name
         && prevProps.isSelected === nextProps.isSelected
         && prevProps.isFocused === nextProps.isFocused);

AgentItem.displayName = 'AgentItem';

export default AgentItem;
