import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useInput, Key } from 'ink';

import { Agent } from '../AgentList';

interface TerminationDialogProps {
  isOpen: boolean;
  agent: Agent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TerminationDialog: React.FC<TerminationDialogProps> = ({
  isOpen,
  agent,
  onConfirm,
  onCancel
}) => {
  const [selected, setSelected] = useState<'no' | 'yes'>('no');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    if (loading) return;

    if (key.escape) {
      onCancel();
    } else if (input === 'y') {
      handleConfirm();
    } else if (input === 'n') {
      onCancel();
    } else if (key.tab || key.rightArrow || key.leftArrow) {
      setSelected(selected === 'no' ? 'yes' : 'no');
    } else if (key.return) {
      if (selected === 'yes') {
        handleConfirm();
      } else {
        onCancel();
      }
    }
  });

  const handleConfirm = () => {
    setLoading(true);
    setError(null);
    onConfirm();
  };

  if (!isOpen || !agent) return null;

  const formatRuntime = (startTime?: Date) => {
    if (!startTime) return 'Unknown';
    const runtime = Date.now() - startTime.getTime();
    const minutes = Math.floor(runtime / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${minutes}m`;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="red"
      padding={1}
      marginTop={1}
      marginBottom={1}
      marginLeft={2}
      marginRight={2}
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="red">Terminate Agent?</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>Agent: <Text bold color="yellow">{agent.name}</Text></Text>
        <Text>Status: <Text color="cyan">{agent.status}</Text></Text>
        <Text>Runtime: <Text>{formatRuntime(agent.startTime)}</Text></Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="red">⚠️  This will stop the agent and end its session immediately.</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {loading ? (
        <Box justifyContent="center">
          <Text color="yellow">Terminating...</Text>
        </Box>
      ) : (
        <>
          <Box gap={4} justifyContent="center" marginBottom={1}>
            <Box
              borderStyle={selected === 'no' ? 'bold' : 'single'}
              borderColor={selected === 'no' ? 'green' : 'gray'}
              paddingX={2}
            >
              <Text color={selected === 'no' ? 'green' : 'gray'}>No</Text>
            </Box>
            <Box
              borderStyle={selected === 'yes' ? 'bold' : 'single'}
              borderColor={selected === 'yes' ? 'red' : 'gray'}
              paddingX={2}
            >
              <Text color={selected === 'yes' ? 'red' : 'gray'}>Yes</Text>
            </Box>
          </Box>

          <Box justifyContent="center">
            <Text dimColor>Press y/n or Enter to confirm</Text>
          </Box>
        </>
      )}
    </Box>
  );
};