import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';
import TextInput from 'ink-text-input';

interface SpawnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export const SpawnDialog: React.FC<SpawnDialogProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isFocused } = useFocus({ autoFocus: isOpen });

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setText('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isOpen || isLoading) return;

    // Handle Escape to close
    if (key.escape) {
      onClose();
      return;
    }

    // Handle Ctrl+Enter to submit
    if (key.ctrl && key.return) {
      handleSubmit();
      return;
    }
  });

  const handleSubmit = async () => {
    const prompt = text.trim();
    
    if (!prompt) {
      setError('Please enter instructions for the agent');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      await onSubmit(prompt);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Calculate dimensions
  const lines = text.split('\n');
  const lineCount = lines.length;
  const charCount = text.length;

  return (
    <>
      {/* Modal backdrop */}
      <Box
        position="absolute"
        width="100%"
        height="100%"
        display={isOpen ? 'flex' : 'none'}
      >
        {/* Modal container */}
        <Box
          width={70}
          height={18}
          borderStyle="single"
          borderColor="green"
          flexDirection="column"
          paddingX={1}
          marginLeft="auto"
          marginRight="auto"
          marginTop="auto"
          marginBottom="auto"
        >
          {/* Header */}
          <Box marginBottom={1}>
            <Text color="white" bold> Spawn New Agent </Text>
          </Box>

          {/* Instructions */}
          <Box marginBottom={1} flexDirection="column">
            <Text color="cyan">Enter instructions for the Claude agent:</Text>
            <Text> </Text>
            <Text color="gray">• Be specific about the task you want the agent to perform</Text>
            <Text color="gray">• Include any relevant context or constraints</Text>
            <Text color="gray">• Agent will work in isolated git worktree</Text>
          </Box>

          {/* Text input area */}
          <Box 
            borderStyle="single" 
            borderColor={error ? 'red' : (isFocused ? 'green' : 'gray')}
            flexGrow={1}
            paddingX={1}
            marginBottom={1}
          >
            <Box flexDirection="column" width="100%">
              <Box marginBottom={1}>
                <Text color="gray"> Agent Instructions </Text>
              </Box>
              <TextInput
                value={text}
                onChange={setText}
                placeholder="Type your instructions here..."
                focus={isFocused}
              />
              <Box marginTop={1}>
                <Text color="gray" dimColor>
                  {lineCount} line{lineCount !== 1 ? 's' : ''}, {charCount} character{charCount !== 1 ? 's' : ''}
                </Text>
              </Box>
            </Box>
          </Box>

          {/* Error display */}
          {error && (
            <Box>
              <Text color="red">Error: {error}</Text>
            </Box>
          )}

          {/* Loading state */}
          {isLoading && (
            <Box>
              <Text color="yellow">Creating agent...</Text>
            </Box>
          )}

          {/* Footer with shortcuts */}
          <Box justifyContent="center">
            <Text color="yellow" bold>
              Ctrl+Enter to spawn | Enter for new line | Escape to cancel
            </Text>
          </Box>
        </Box>
      </Box>
    </>
  );
};