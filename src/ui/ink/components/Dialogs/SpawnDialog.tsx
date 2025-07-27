import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Text, useInput, useFocus,
} from 'ink';
import { ModalOverlay } from '../Common/ModalOverlay';
import { TextEditor } from '../Common/TextEditor';
import logger from '../../../../utils/logger.js';
import { protectBackticks, isInputSafe } from '../../../../utils/backtick-protection.js';

interface SpawnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}

const SpawnDialog: React.FC<SpawnDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Memoize useFocus options to prevent infinite re-renders
  const focusOptions = useMemo(() => ({ autoFocus: isOpen }), [isOpen]);
  const { isFocused } = useFocus(focusOptions);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      logger.debug('SpawnDialog: Dialog opened, resetting state');

      setText('/BMad:agents:dev ');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle global escape key to close dialog
  const inputOptions = useMemo(() => ({ isActive: isOpen && isFocused }), [isOpen, isFocused]);
  
  useInput((input: string, key: any) => {
    if (!isOpen || isLoading) return;

    // Handle Escape to close dialog (global handler)
    if (key.escape) {
      logger.debug('SpawnDialog: Escape pressed, closing dialog');
      onClose();
      return;
    }
  }, inputOptions);

  const handleSubmit = async () => {
    const prompt = text.trim();

    if (!prompt) {
      setError('Please enter instructions for the agent');
      return;
    }

    // Validate input safety
    if (!isInputSafe(prompt)) {
      setError('Invalid input provided');
      return;
    }

    // Protect backticks from command substitution while preserving formatting
    const safePrompt = protectBackticks(prompt);

    setError('');
    setIsLoading(true);

    try {
      logger.debug('SpawnDialog: Submitting prompt:', {
        originalPrompt: prompt,
        safePrompt,
        hasBackticks: prompt.includes('`'),
      });
      await onSubmit(safePrompt);
      logger.debug('SpawnDialog: onSubmit completed successfully');
      setIsLoading(false);
      setText(''); // Clear text after successful submission
      // Don't close here - let the parent handle closing after successful spawn
    } catch (err: any) {
      logger.error('SpawnDialog: Error in onSubmit:', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
      setIsLoading(false);
    }
  };

  return (
    <ModalOverlay isOpen={isOpen}>
      <Box
        width={70}
        height={18}
        borderStyle="single"
        borderColor="green"
        flexDirection="column"
        paddingX={1}
      >
        <Box marginBottom={1}>
          <Text color="white" bold>
            {' Spawn New Agent '}
          </Text>
        </Box>

        <Box marginBottom={1} flexDirection="column">
          <Text color="cyan">Enter instructions for the Claude agent:</Text>
          <Text>{' '}</Text>
          <Text color="gray">• Be specific about the task you want the agent to perform</Text>
          <Text color="gray">• Include any relevant context or constraints</Text>
          <Text color="gray">• Agent will work in isolated git worktree</Text>
        </Box>

        <Box
          borderStyle="single"
          borderColor={error ? 'red' : (isFocused ? 'green' : 'gray')}
          flexGrow={1}
          paddingX={1}
          marginBottom={1}
        >
          <Box flexDirection="column" width="100%">
            <Box marginBottom={1}>
              <Text color="gray">{' Agent Instructions '}</Text>
            </Box>
            <TextEditor
              value={text}
              onChange={setText}
              placeholder="Type your instructions here..."
              autoFocus={isFocused}
              multiline={true}
              showCursor={true}
              disabled={isLoading}
              onSubmit={handleSubmit}
              showPositionIndicator={false}
            />
          </Box>
        </Box>

        {error && (
          <Box>
            <Text color="red">{`Error: ${error}`}</Text>
          </Box>
        )}

        {isLoading && (
          <Box>
            <Text color="yellow">Creating agent...</Text>
          </Box>
        )}

        <Box justifyContent="center">
          <Text color="yellow" bold>
            [Enter] Spawn [Shift+Enter] New line [Ctrl+A] Select All [Esc] Cancel
          </Text>
        </Box>
      </Box>
    </ModalOverlay>
  );
};

// Enable why-did-you-render for this component
SpawnDialog.whyDidYouRender = true;

export { SpawnDialog };
