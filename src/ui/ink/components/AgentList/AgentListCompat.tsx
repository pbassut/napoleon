import React from 'react';
import { getBoxChar, getStatusSymbol, detectCapabilities } from '../../utils/terminal-capabilities';
import { normalizeKey, matchesBinding } from '../../utils/input-normalizer';
import { Box, Text, useInput, useFocus } from 'ink';
import { Agent } from '../../types';

const { useState, useEffect, useMemo } = React;

interface AgentListCompatProps {
  agents: Agent[];
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
  height?: number;
}

interface StatusSymbol {
  symbol: string;
  color: string;
}

interface StatusSymbols {
  [key: string]: StatusSymbol;
}

/**
 * Terminal-compatible version of AgentList
 * Uses capability detection and fallbacks
 */
const AgentListCompat: React.FC<AgentListCompatProps> = ({
  agents,
  selectedIndex,
  onSelectionChange,
  height = 10,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [capabilities] = useState(() => detectCapabilities());

  const visibleItems = Math.max(1, height - 2);
  const visibleAgents = useMemo(
    () => agents.slice(scrollOffset, scrollOffset + visibleItems),
    [agents, scrollOffset, visibleItems],
  );

  const adjustScrollOffset = (newSelectedIndex: number) => {
    if (newSelectedIndex < scrollOffset) {
      setScrollOffset(newSelectedIndex);
    } else if (newSelectedIndex >= scrollOffset + visibleItems) {
      setScrollOffset(newSelectedIndex - visibleItems + 1);
    }
  };

  useEffect(() => {
    adjustScrollOffset(selectedIndex);
  }, [selectedIndex, visibleItems]);

  // Status symbols based on capabilities
  const statusSymbols: StatusSymbols = {
    running: { symbol: getStatusSymbol('running', capabilities), color: 'green' },
    pending: { symbol: getStatusSymbol('pending', capabilities), color: 'yellow' },
    error: { symbol: getStatusSymbol('error', capabilities), color: 'red' },
    terminated: { symbol: getStatusSymbol('terminated', capabilities), color: 'gray' },
    success: { symbol: getStatusSymbol('success', capabilities), color: 'green' },
  };

  const AgentListContent: React.FC = () => {
    const { isFocused } = useFocus();

    useInput((input: string, key: any) => {
      if (!isFocused) return;

      const normalizedKey = normalizeKey(input, key);

      if (matchesBinding(normalizedKey, 'up')) {
        const newIndex = Math.max(0, selectedIndex - 1);
        onSelectionChange(newIndex);
        adjustScrollOffset(newIndex);
      } else if (matchesBinding(normalizedKey, 'down')) {
        const newIndex = Math.min(agents.length - 1, selectedIndex + 1);
        onSelectionChange(newIndex);
        adjustScrollOffset(newIndex);
      }
    }, { isActive: isFocused });

    if (agents.length === 0) {
      return (
        <Box
          flexDirection="column"
          height={height}
          borderStyle="single"
          borderColor="gray"
        >
          <Box
            paddingX={1}
            paddingY={1}
            justifyContent="center"
            alignItems="center"
          >
            <Text color="gray">No agents running</Text>
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
        borderStyle="single"
        borderColor={isFocused ? 'cyan' : 'gray'}
      >
        {showScrollIndicators && hasMoreAbove && (
          <Box paddingX={1}>
            <Text color="gray">
              {`${getStatusSymbol('arrowUp', capabilities)} ${scrollOffset} more above`}
            </Text>
          </Box>
        )}

        <Box flexDirection="column" flexGrow={1}>
          {visibleAgents.map((agent, index) => {
            const isSelected = scrollOffset + index === selectedIndex;
            const statusInfo = statusSymbols[agent.status] || { symbol: '?', color: 'gray' };

            return (
              <Box
                key={agent.id}
                paddingX={1}
                backgroundColor={isSelected && isFocused ? 'blue' : undefined}
              >
                <Box width="100%" gap={1}>
                  <Text color={statusInfo.color}>{statusInfo.symbol}</Text>
                  <Text color="gray">
                    {`[${String(scrollOffset + index + 1).padStart(2, '0')}]`}
                  </Text>
                  <Box flexGrow={1}>
                    <Text
                      color={isSelected && isFocused ? 'white' : 'white'}
                      bold={isSelected}
                    >
                      {agent.name.length > 30 ? `${agent.name.substring(0, 27)}...` : agent.name}
                    </Text>
                  </Box>
                  <Text color={statusInfo.color}>{agent.status.toUpperCase()}</Text>
                </Box>
              </Box>
            );
          })}
        </Box>

        {showScrollIndicators && hasMoreBelow && (
          <Box paddingX={1}>
            <Text color="gray">
              {`${getStatusSymbol('arrowDown', capabilities)} ${agents.length - scrollOffset - visibleItems} more below`}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  return <AgentListContent />;
};

export default AgentListCompat;
export { AgentListCompat };