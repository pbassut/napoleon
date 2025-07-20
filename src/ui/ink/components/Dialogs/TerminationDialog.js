const React = require('react');
const { Box, Text } = require('ink');

const { useState, useEffect } = React;
const { useInput, useFocus } = require('ink');

const TerminationDialog = ({
  isOpen, agent, onConfirm, onCancel,
}) => {
  const [selectedOption, setSelectedOption] = useState('no');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-focus when dialog opens
  const { isFocused } = useFocus({ autoFocus: isOpen });

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || 'Failed to terminate agent');
      setIsLoading(false);
    }
  };

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedOption('no');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isOpen || isLoading) return;

    // Cancel on Escape
    if (key.escape) {
      onCancel();
      return;
    }

    // Quick shortcuts
    if (input === 'y') {
      handleConfirm();
      return;
    }
    if (input === 'n') {
      onCancel();
      return;
    }

    // Arrow navigation
    if (key.leftArrow || key.rightArrow || key.tab) {
      setSelectedOption((current) => (current === 'no' ? 'yes' : 'no'));
      return;
    }

    // Enter confirms current selection
    if (key.return) {
      if (selectedOption === 'yes') {
        handleConfirm();
      } else {
        onCancel();
      }
    }
  }, { isActive: isOpen && isFocused });

  if (!isOpen || !agent) return null;

  // Calculate runtime
  const getRuntime = () => {
    if (!agent.startTime) return 'Unknown';
    const runtime = Date.now() - new Date(agent.startTime).getTime();
    const minutes = Math.floor(runtime / 60000);
    const seconds = Math.floor((runtime % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return React.createElement(
    Box,
    {
      position: 'absolute',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    React.createElement(
      Box,
      {
        width: 50,
        height: 16,
        borderStyle: 'single',
        borderColor: error ? 'red' : 'yellow',
        flexDirection: 'column',
        paddingX: 2,
        paddingY: 1,
      },
      // Title
      React.createElement(
        Box,
        { justifyContent: 'center', marginBottom: 1 },
        React.createElement(
          Text,
          { bold: true, color: 'red' },
          'Terminate Agent?',
        ),
      ),

      // Agent Info
      React.createElement(
        Box,
        { flexDirection: 'column', marginBottom: 1 },
        React.createElement(
          Text,
          null,
          'Agent: ',
          React.createElement(Text, { bold: true, color: 'cyan' }, agent.name || agent.id),
        ),
        React.createElement(
          Text,
          { dimColor: true },
          `Status: ${agent.status || 'Unknown'} (${getRuntime()})`,
        ),
      ),

      // Warning Message
      React.createElement(
        Box,
        { marginY: 1 },
        React.createElement(
          Text,
          { color: 'yellow' },
          '⚠️  This will stop the agent and end its session immediately.',
        ),
      ),

      // Error Message
      error && React.createElement(
        Box,
        { marginY: 1 },
        React.createElement(
          Text,
          { color: 'red' },
          `Error: ${error}`,
        ),
      ),

      // Loading State
      isLoading && React.createElement(
        Box,
        { marginY: 1, justifyContent: 'center' },
        React.createElement(
          Text,
          { color: 'cyan' },
          'Terminating agent...',
        ),
      ),

      // Buttons
      !isLoading && React.createElement(
        Box,
        { marginTop: 2, justifyContent: 'center', gap: 4 },
        React.createElement(
          Box,
          {
            paddingX: 2,
            borderStyle: selectedOption === 'no' ? 'single' : 'none',
            borderColor: 'green',
          },
          React.createElement(
            Text,
            { color: selectedOption === 'no' ? 'green' : 'gray' },
            '[ No ]',
          ),
        ),
        React.createElement(
          Box,
          {
            paddingX: 2,
            borderStyle: selectedOption === 'yes' ? 'single' : 'none',
            borderColor: 'red',
          },
          React.createElement(
            Text,
            { color: selectedOption === 'yes' ? 'red' : 'gray' },
            '[ Yes ]',
          ),
        ),
      ),

      // Instructions
      !isLoading && React.createElement(
        Box,
        { marginTop: 1, justifyContent: 'center' },
        React.createElement(
          Text,
          { dimColor: true },
          'Press y/n or Enter to confirm',
        ),
      ),
    ),
  );
};

module.exports = { TerminationDialog };
