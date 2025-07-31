import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Text, useInput, useFocus,
} from 'ink';
import { ModalOverlay } from '../Common/ModalOverlay';
import { TextEditor } from '../Common/TextEditor/index';
import logger from '../../../../utils/logger';
import { protectBackticks, isInputSafe } from '../../../../utils/backtick-protection';

interface SpawnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}

const BASIC_PRESET = '/BMad:agents:dev Generate a todo list with 20 items and go through them one by one';

const SpawnDialog: React.FC<SpawnDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [text, setText] = useState(BASIC_PRESET);
  const [error, setError] = useState('');

  // Memoize useFocus options to prevent infinite re-renders
  const focusOptions = useMemo(() => ({ autoFocus: isOpen }), [isOpen]);
  const { isFocused } = useFocus(focusOptions);

  // Clear error when modal opens (but keep user's text)
  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  // Handle global escape key to close dialog
  const inputOptions = useMemo(() => ({ isActive: isOpen && isFocused }), [isOpen, isFocused]);

  useInput((input: string, key: { escape?: boolean }) => {
    if (!isOpen) return;

    // Handle Escape to close dialog (global handler)
    if (key.escape) {
      logger.debug('SpawnDialog: Escape pressed, closing dialog');
      onClose();
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

    logger.debug('SpawnDialog: Submitting prompt:', {
      originalPrompt: prompt,
      safePrompt,
      hasBackticks: prompt.includes('`'),
    });

    // Close modal immediately after validation
    setText(BASIC_PRESET); // Reset to preset text
    onClose();

    // Pass prompt to parent without waiting for spawn completion
    try {
      await onSubmit(safePrompt);
      logger.debug('SpawnDialog: onSubmit completed successfully');
    } catch (err: unknown) {
      logger.error('SpawnDialog: Error in onSubmit:', { error: err });
      // Error handling will be done in the parent component now
    }
  };

  return (
    <ModalOverlay isOpen={isOpen}>
      <Box
        width={105}
        height={36}
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
              maxLines={20}
              showCursor={true}
              disabled={false}
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
SpawnDialog.whyDidYouRender = false;

export { SpawnDialog };
