import React from 'react';
import { Box, Text } from 'ink';
import { Agent } from '../../types';

const { memo } = React;

interface StatusSymbol {
  symbol: string;
  color: string;
}

interface StatusSymbols {
  [key: string]: StatusSymbol;
}

const statusSymbols: StatusSymbols = {
  running: { symbol: '●', color: 'green' },
  pending: { symbol: '◌', color: 'yellow' },
  error: { symbol: '×', color: 'red' },
  terminated: { symbol: '○', color: 'gray' },
  success: { symbol: '✓', color: 'green' },
};

interface AgentItemProps {
  agent: Agent;
  isSelected: boolean;
  isFocused: boolean;
  index: number;
}

const AgentItem: React.FC<AgentItemProps> = memo(({
  agent, isSelected, isFocused, index,
}) => {
  const statusInfo = statusSymbols[agent.status] || { symbol: '?', color: 'gray' };

  const backgroundColor = isSelected && isFocused ? 'blue' : undefined;
  const textColor = isSelected && isFocused ? 'white' : 'white';

  const truncateName = (name: string, maxLength: number = 30): string => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength - 3)}...`;
  };

  return (
    <Box paddingX={1} backgroundColor={backgroundColor}>
      <Box width="100%" gap={1}>
        <Text color={statusInfo.color}>{statusInfo.symbol}</Text>
        <Text color="gray">{`[${String(index + 1).padStart(2, '0')}]`}</Text>
        <Box flexGrow={1}>
          <Text color={textColor} bold={isSelected}>
            {truncateName(agent.name)}
          </Text>
        </Box>
        <Text color={statusInfo.color}>{agent.status.toUpperCase()}</Text>
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => prevProps.agent.status === nextProps.agent.status
         && prevProps.agent.name === nextProps.agent.name
         && prevProps.isSelected === nextProps.isSelected
         && prevProps.isFocused === nextProps.isFocused);

AgentItem.displayName = 'AgentItem';

export default AgentItem;