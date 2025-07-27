import React, { useState, useEffect } from 'react';
import {
  Box, Text, useInput, useFocus,
} from 'ink';
import { Agent } from '../../types';
import { ModalOverlay } from '../Common/ModalOverlay';

interface TerminationDialogProps {
  isOpen: boolean;
  agent: Agent | null;
  onConfirm: (deleteWorktree?: boolean) => Promise<void>;
  onCancel: () => void;
}

const TerminationDialog: React.FC<TerminationDialogProps> = ({
  isOpen, agent, onConfirm, onCancel,
}) => {
  const [selectedOption, setSelectedOption] = useState<'terminate' | 'delete' | 'cancel'>('cancel');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-focus when dialog opens
  const { isFocused } = useFocus({ autoFocus: isOpen });

  const handleConfirm = async (deleteWorktree = false) => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm(deleteWorktree);
    } catch (err: unknown) {
      const operation = deleteWorktree ? 'delete' : 'terminate';
      setError(err instanceof Error ? err.message : `Failed to ${operation} agent`);
      setIsLoading(false);
    }
  };

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedOption('cancel');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle keyboard input
  useInput((input: string, key: { escape?: boolean; return?: boolean; leftArrow?: boolean; rightArrow?: boolean; tab?: boolean }) => {
    if (!isOpen || isLoading) return;

    // Cancel on Escape
    if (key.escape) {
      onCancel();
      return;
    }

    // Quick shortcuts
    if (input === 't') {
      handleConfirm(false); // Terminate only
      return;
    }
    if (input === 'd') {
      handleConfirm(true); // Delete with worktree
      return;
    }
    if (input === 'c' || input === 'n') {
      onCancel();
      return;
    }

    // Arrow navigation and tab
    if (key.leftArrow || key.rightArrow || key.tab) {
      setSelectedOption((current) => {
        if (current === 'cancel') return 'terminate';
        if (current === 'terminate') return 'delete';
        return 'cancel';
      });
      return;
    }

    // Enter confirms current selection
    if (key.return) {
      if (selectedOption === 'terminate') {
        handleConfirm(false);
      } else if (selectedOption === 'delete') {
        handleConfirm(true);
      } else {
        onCancel();
      }
    }
  }, { isActive: isOpen && isFocused });

  // Calculate runtime
  const getRuntime = () => {
    if (!agent || !agent.startTime) return 'Unknown';
    const runtime = Date.now() - new Date(agent.startTime).getTime();
    const minutes = Math.floor(runtime / 60000);
    const seconds = Math.floor((runtime % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (!agent) return null;

  return (
    <ModalOverlay isOpen={isOpen}>
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
            Agent Action
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
        <Box marginY={1} flexDirection="column">
          <Text color="yellow">
            ⚠️  Choose an action for this agent:
          </Text>
          <Text dimColor marginTop={1}>
            • Terminate: Stop agent, keep worktree
          </Text>
          <Text dimColor>
            • Delete: Stop agent and remove worktree permanently
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
            <Text color="cyan">
              {selectedOption === 'delete' ? 'Deleting agent and worktree...' : 'Terminating agent...'}
            </Text>
          </Box>
        )}

        {/* Buttons */}
        {!isLoading && (
          <Box marginTop={2} justifyContent="center" gap={2}>
            <Box
              paddingX={1}
              borderStyle={selectedOption === 'cancel' ? 'single' : undefined}
              borderColor="green"
            >
              <Text color={selectedOption === 'cancel' ? 'green' : 'gray'}>
                [ Cancel ]
              </Text>
            </Box>
            <Box
              paddingX={1}
              borderStyle={selectedOption === 'terminate' ? 'single' : undefined}
              borderColor="yellow"
            >
              <Text color={selectedOption === 'terminate' ? 'yellow' : 'gray'}>
                [ Terminate ]
              </Text>
            </Box>
            <Box
              paddingX={1}
              borderStyle={selectedOption === 'delete' ? 'single' : undefined}
              borderColor="red"
            >
              <Text color={selectedOption === 'delete' ? 'red' : 'gray'}>
                [ Delete ]
              </Text>
            </Box>
          </Box>
        )}

        {/* Instructions */}
        {!isLoading && (
          <Box marginTop={1} justifyContent="center">
            <Text dimColor>Press c/t/d or Tab/Enter to select</Text>
          </Box>
        )}
      </Box>
    </ModalOverlay>
  );
};

// Enable why-did-you-render for this component
TerminationDialog.whyDidYouRender = false;

export { TerminationDialog };
