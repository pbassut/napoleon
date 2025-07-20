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

const AgentItem: React.FC<AgentItemProps> = memo(({
  agent, isSelected, isFocused, index,
}) => {
  const statusInfo = getStatusInfo(agent.status);
  const textColor = isSelected && isFocused ? 'white' : 'white';

  const truncateName = (name: string, maxLength: number = 30): string => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength - 3)}...`;
  };

  return (
    <Box paddingX={1} width="100%" gap={1}>
      <Text>{statusInfo.emoji}</Text>
      <Text color="gray">{`[${String(index + 1).padStart(2, '0')}]`}</Text>
      <Box flexGrow={1}>
        <Text color={textColor} bold={isSelected}>
          {truncateName(agent.name)}
        </Text>
      </Box>
      <Text color={statusInfo.color}>{statusInfo.text}</Text>
    </Box>
  );
}, (prevProps, nextProps) => prevProps.agent.status === nextProps.agent.status
         && prevProps.agent.name === nextProps.agent.name
         && prevProps.isSelected === nextProps.isSelected
         && prevProps.isFocused === nextProps.isFocused);

AgentItem.displayName = 'AgentItem';

export default AgentItem;