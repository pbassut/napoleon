const React = require('react');
const {
  Box, Text, useInput, useFocus,
} = require('ink');
const AgentItem = require('./AgentItem.js');

const { useState, useEffect, useMemo } = React;

const AgentList = ({
  agents,
  selectedIndex,
  onSelectionChange,
  height = 10,
}) => {
  const { isFocused } = useFocus();
  const [scrollOffset, setScrollOffset] = useState(0);

  const visibleItems = Math.max(1, height - 2);

  const visibleAgents = useMemo(() => agents.slice(scrollOffset, scrollOffset + visibleItems), [agents, scrollOffset, visibleItems]);

  const adjustScrollOffset = (newSelectedIndex) => {
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
      React.createElement(Text, { color: 'gray' }, `▲ ${scrollOffset} more above`),
    ),

    React.createElement(
      Box,
      {
        key: 'agent-list',
        flexDirection: 'column',
        flexGrow: 1,
      },
      visibleAgents.map((agent, index) => React.createElement(AgentItem, {
        key: agent.id,
        agent,
        isSelected: scrollOffset + index === selectedIndex,
        isFocused,
        index: scrollOffset + index,
      })),
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
        `▼ ${agents.length - scrollOffset - visibleItems} more below`,
      ),
    ),
  ]);
};

module.exports = AgentList;
