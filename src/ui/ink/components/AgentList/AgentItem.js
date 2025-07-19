const React = require('react');
const { Box, Text } = require('ink');

const { memo } = React;

const statusSymbols = {
  running: { symbol: '●', color: 'green' },
  pending: { symbol: '◌', color: 'yellow' },
  error: { symbol: '×', color: 'red' },
  terminated: { symbol: '○', color: 'gray' },
  success: { symbol: '✓', color: 'green' },
};

const AgentItem = memo(({
  agent, isSelected, isFocused, index,
}) => {
  const statusInfo = statusSymbols[agent.status] || { symbol: '?', color: 'gray' };

  const backgroundColor = isSelected && isFocused ? 'blue' : undefined;
  const textColor = isSelected && isFocused ? 'white' : 'white';

  const truncateName = (name, maxLength = 30) => {
    if (name.length <= maxLength) return name;
    return `${name.substring(0, maxLength - 3)}...`;
  };

  return React.createElement(
    Box,
    {
      paddingX: 1,
      backgroundColor,
    },
    React.createElement(Box, {
      width: '100%',
      gap: 1,
    }, [
      React.createElement(Text, {
        key: 'status',
        color: statusInfo.color,
      }, statusInfo.symbol),

      React.createElement(Text, {
        key: 'index',
        color: 'gray',
      }, `[${String(index + 1).padStart(2, '0')}]`),

      React.createElement(
        Box,
        {
          key: 'name',
          flexGrow: 1,
        },
        React.createElement(Text, {
          color: textColor,
          bold: isSelected,
        }, truncateName(agent.name)),
      ),

      React.createElement(Text, {
        key: 'status-text',
        color: statusInfo.color,
      }, agent.status.toUpperCase()),
    ]),
  );
}, (prevProps, nextProps) => prevProps.agent.status === nextProps.agent.status
         && prevProps.agent.name === nextProps.agent.name
         && prevProps.isSelected === nextProps.isSelected
         && prevProps.isFocused === nextProps.isFocused);

AgentItem.displayName = 'AgentItem';

module.exports = AgentItem;
