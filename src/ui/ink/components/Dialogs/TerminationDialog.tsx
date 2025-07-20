import React, { useState, useEffect } from 'react';
const { Box, Text, useInput, useFocus } = require('ink');
import { Agent } from '../../types';

interface TerminationDialogProps {
  isOpen: boolean;
  agent: Agent | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const TerminationDialog: React.FC<TerminationDialogProps> = ({
  isOpen, agent, onConfirm, onCancel,
}) => {
  const [selectedOption, setSelectedOption] = useState<'yes' | 'no'>('no');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-focus when dialog opens
  const { isFocused } = useFocus({ autoFocus: isOpen });

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
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
  useInput((input: string, key: any) => {
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

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        width={50}
        height={16}
        borderStyle="single"
        borderColor={error ? 'red' : 'yellow'}
        flexDirection="column"
        paddingX={2}
        paddingY={1}
      >
        {/* Title */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="red">
            Terminate Agent?
          </Text>
        </Box>

        {/* Agent Info */}
        <Box flexDirection="column" marginBottom={1}>
          <Text>
            Agent: <Text bold color="cyan">{agent.name || agent.id}</Text>
          </Text>
          <Text dimColor>
            {`Status: ${agent.status || 'Unknown'} (${getRuntime()})`}
          </Text>
        </Box>

        {/* Warning Message */}
        <Box marginY={1}>
          <Text color="yellow">
            ⚠️  This will stop the agent and end its session immediately.
          </Text>
        </Box>

        {/* Error Message */}
        {error && (
          <Box marginY={1}>
            <Text color="red">{`Error: ${error}`}</Text>
          </Box>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box marginY={1} justifyContent="center">
            <Text color="cyan">Terminating agent...</Text>
          </Box>
        )}

        {/* Buttons */}
        {!isLoading && (
          <Box marginTop={2} justifyContent="center" gap={4}>
            <Box
              paddingX={2}
              borderStyle={selectedOption === 'no' ? 'single' : 'none'}
              borderColor="green"
            >
              <Text color={selectedOption === 'no' ? 'green' : 'gray'}>
                [ No ]
              </Text>
            </Box>
            <Box
              paddingX={2}
              borderStyle={selectedOption === 'yes' ? 'single' : 'none'}
              borderColor="red"
            >
              <Text color={selectedOption === 'yes' ? 'red' : 'gray'}>
                [ Yes ]
              </Text>
            </Box>
          </Box>
        )}

        {/* Instructions */}
        {!isLoading && (
          <Box marginTop={1} justifyContent="center">
            <Text dimColor>Press y/n or Enter to confirm</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export { TerminationDialog };