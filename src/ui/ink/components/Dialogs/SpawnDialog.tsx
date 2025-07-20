import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useFocus } from 'ink';

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

    // Handle Escape to close
    if (key.escape) {
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

    // Handle enter for new line
    if (key.return && !key.ctrl) {
      setText(prev => prev + '\n');
      return;
    }

    // Handle Ctrl+Enter to submit
    if (key.ctrl && key.return) {
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
      await onSubmit(prompt);
      onClose();
    } catch (err: any) {
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
    <Box
      position="absolute"
      width="100%"
      height="100%"
      display={isOpen ? 'flex' : 'none'}
    >
      <Box
        width={70}
        height={18}
        borderStyle="single"
        borderColor="green"
        flexDirection="column"
        paddingX={1}
        alignSelf="center"
        justifyContent="center"
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
            Ctrl+Enter to spawn | Enter for new line | Escape to cancel
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export { SpawnDialog };