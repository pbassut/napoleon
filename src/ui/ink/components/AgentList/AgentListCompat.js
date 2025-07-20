const React = require('react');
const { getBoxChar, getStatusSymbol, detectCapabilities } = require('../../utils/terminal-capabilities');
const { normalizeKey, matchesBinding } = require('../../utils/input-normalizer');

const { useState, useEffect, useMemo } = React;

/**
 * Terminal-compatible version of AgentList
 * Uses capability detection and fallbacks
 */
const AgentListCompat = ({
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

  const adjustScrollOffset = (newSelectedIndex) => {
    if (newSelectedIndex < scrollOffset) {
      setScrollOffset(newSelectedIndex);
    } else if (newSelectedIndex >= scrollOffset + visibleItems) {
      setScrollOffset(newSelectedIndex - visibleItems + 1);
    }
  };

  useEffect(() => {
    adjustScrollOffset(selectedIndex);
  }, [selectedIndex, visibleItems]);

  // Import Ink components dynamically
  const [Box, setText] = useState(null);
  const [Text, setTextComponent] = useState(null);
  const [useInput, setUseInput] = useState(null);
  const [useFocus, setUseFocus] = useState(null);

  useEffect(() => {
    // Dynamic import for ESM modules
    import('ink').then((ink) => {
      setText(() => ink.Box);
      setTextComponent(() => ink.Text);
      setUseInput(() => ink.useInput);
      setUseFocus(() => ink.useFocus);
    });
  }, []);

  if (!Box || !Text || !useInput || !useFocus) {
    return null;
  }

  // Status symbols based on capabilities
  const statusSymbols = {
    running: { symbol: getStatusSymbol('running', capabilities), color: 'green' },
    pending: { symbol: getStatusSymbol('pending', capabilities), color: 'yellow' },
    error: { symbol: getStatusSymbol('error', capabilities), color: 'red' },
    terminated: { symbol: getStatusSymbol('terminated', capabilities), color: 'gray' },
    success: { symbol: getStatusSymbol('success', capabilities), color: 'green' },
  };

  const AgentListContent = () => {
    const { isFocused } = useFocus();

    useInput((input, key) => {
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
      return React.createElement(
        Box,
        {
          flexDirection: 'column',
          height,
          borderStyle: 'single',
          borderColor: 'gray',
        },
        React.createElement(
          Box,
          {
            paddingX: 1,
            paddingY: 1,
            justifyContent: 'center',
            alignItems: 'center',
          },
          React.createElement(Text, { color: 'gray' }, 'No agents running'),
        ),
      );
    }

    const showScrollIndicators = agents.length > visibleItems;
    const hasMoreAbove = scrollOffset > 0;
    const hasMoreBelow = scrollOffset + visibleItems < agents.length;

    // Box characters based on capabilities
    const chars = {
      tl: getBoxChar('topLeft', capabilities),
      tr: getBoxChar('topRight', capabilities),
      bl: getBoxChar('bottomLeft', capabilities),
      br: getBoxChar('bottomRight', capabilities),
      h: getBoxChar('horizontal', capabilities),
      v: getBoxChar('vertical', capabilities),
    };

    return React.createElement(Box, {
      flexDirection: 'column',
      height,
      borderStyle: 'single',
      borderColor: isFocused ? 'cyan' : 'gray',
    }, [
      showScrollIndicators && hasMoreAbove && React.createElement(
        Box,
        {
          key: 'scroll-up',
          paddingX: 1,
        },
        React.createElement(
          Text,
          { color: 'gray' },
          `${getStatusSymbol('arrowUp', capabilities)} ${scrollOffset} more above`,
        ),
      ),

      React.createElement(
        Box,
        {
          key: 'agent-list',
          flexDirection: 'column',
          flexGrow: 1,
        },
        visibleAgents.map((agent, index) => {
          const isSelected = scrollOffset + index === selectedIndex;
          const statusInfo = statusSymbols[agent.status] || { symbol: '?', color: 'gray' };

          return React.createElement(
            Box,
            {
              key: agent.id,
              paddingX: 1,
              backgroundColor: isSelected && isFocused ? 'blue' : undefined,
            },
            React.createElement(Box, { width: '100%', gap: 1 }, [
              React.createElement(
                Text,
                { key: 'status', color: statusInfo.color },
                statusInfo.symbol,
              ),
              React.createElement(
                Text,
                { key: 'index', color: 'gray' },
                `[${String(scrollOffset + index + 1).padStart(2, '0')}]`,
              ),
              React.createElement(
                Box,
                { key: 'name', flexGrow: 1 },
                React.createElement(
                  Text,
                  {
                    color: isSelected && isFocused ? 'white' : 'white',
                    bold: isSelected,
                  },
                  agent.name.length > 30 ? `${agent.name.substring(0, 27)}...` : agent.name,
                ),
              ),
              React.createElement(
                Text,
                { key: 'status-text', color: statusInfo.color },
                agent.status.toUpperCase(),
              ),
            ]),
          );
        }),
      ),

      showScrollIndicators && hasMoreBelow && React.createElement(
        Box,
        {
          key: 'scroll-down',
          paddingX: 1,
        },
        React.createElement(
          Text,
          { color: 'gray' },
          `${getStatusSymbol('arrowDown', capabilities)} ${agents.length - scrollOffset - visibleItems} more below`,
        ),
      ),
    ]);
  };

  return React.createElement(AgentListContent);
};

module.exports = { AgentListCompat };
