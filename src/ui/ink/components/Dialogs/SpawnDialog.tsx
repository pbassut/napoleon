import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import { ModalOverlay } from '../Common/ModalOverlay';
import logger from '../../../../utils/logger';

// We'll use a simple text input for now instead of ink-text-input
const SimpleTextInput = ({ value, onChange, placeholder, focus }) => {
  return <Text>{value || placeholder}</Text>;
};

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
      setText('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Memoize useInput options to prevent infinite re-renders
  const inputOptions = useMemo(() => ({ isActive: isOpen && isFocused }), [isOpen, isFocused]);
  
  // Handle keyboard input
  useInput((input: string, key: any) => {
    if (!isOpen || isLoading) return;

    // Log key presses for debugging
    if (key.return) {
      logger.debug('SpawnDialog: Enter key pressed', { shift: key.shift, ctrl: key.ctrl });
    }

    // Handle Escape to close
    if (key.escape) {
      logger.debug('SpawnDialog: Escape pressed, closing dialog');
      onClose();
      return;
    }

    // Handle text input
    if (!key.ctrl && !key.meta && input.length === 1) {
      setText(prev => prev + input);
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      setText(prev => prev.slice(0, -1));
      return;
    }

    // Handle Shift+Enter for new line
    if (key.shift && key.return) {
      logger.debug('SpawnDialog: Shift+Enter pressed, adding new line');
      setText(prev => prev + '\n');
      return;
    }

    // Handle Enter to submit
    if (key.return && !key.shift) {
      logger.debug('SpawnDialog: Enter pressed, submitting', { text: text.trim() });
      handleSubmit();
      return;
    }
  }, inputOptions);

  const handleSubmit = async () => {
    const prompt = text.trim();
    
    if (!prompt) {
      setError('Please enter instructions for the agent');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      logger.debug('SpawnDialog: Submitting prompt:', { prompt });
      await onSubmit(prompt);
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

  // Calculate dimensions
  const lines = text.split('\n');
  const lineCount = lines.length;
  const charCount = text.length;

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
            {" Spawn New Agent "}
          </Text>
        </Box>
        
        <Box marginBottom={1} flexDirection="column">
          <Text color="cyan">Enter instructions for the Claude agent:</Text>
          <Text>{" "}</Text>
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
              <Text color="gray">{" Agent Instructions "}</Text>
            </Box>
            <SimpleTextInput
              value={text}
              onChange={setText}
              placeholder="Type your instructions here..."
              focus={isFocused}
            />
            <Box marginTop={1}>
              <Text color="gray" dimColor>
                {`${lineCount} line${lineCount !== 1 ? 's' : ''}, ${charCount} character${charCount !== 1 ? 's' : ''}`}
              </Text>
            </Box>
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
            Enter to spawn | Shift+Enter for new line | Escape to cancel
          </Text>
        </Box>
      </Box>
    </ModalOverlay>
  );
};

// Enable why-did-you-render for this component
SpawnDialog.whyDidYouRender = true;

export { SpawnDialog };