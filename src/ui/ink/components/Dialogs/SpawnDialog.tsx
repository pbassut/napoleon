import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
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
  const [lines, setLines] = useState<string[]>(['']);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLines(['']);
      setCurrentLineIndex(0);
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

    // Handle Enter for new line
    if (key.return && !key.ctrl) {
      const newLines = [...lines];
      newLines.splice(currentLineIndex + 1, 0, '');
      setLines(newLines);
      setCurrentLineIndex(currentLineIndex + 1);
      return;
    }

    // Handle arrow keys for navigation
    if (key.upArrow && currentLineIndex > 0) {
      setCurrentLineIndex(currentLineIndex - 1);
    } else if (key.downArrow && currentLineIndex < lines.length - 1) {
      setCurrentLineIndex(currentLineIndex + 1);
    }
  });

  const handleSubmit = async () => {
    const prompt = lines.join('\n').trim();
    
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

  const handleLineChange = (value: string) => {
    const newLines = [...lines];
    newLines[currentLineIndex] = value;
    setLines(newLines);
  };

  if (!isOpen) return null;

  return (
    <Box
      position="absolute"
      width="80%"
      height="60%"
      left="10%"
      top="20%"
      borderStyle="single"
      borderColor="blue"
      flexDirection="column"
      paddingX={1}
    >
      {/* Modal overlay background */}
      <Box
        position="absolute"
        width="100%"
        height="100%"
        left={0}
        top={0}
      />

      {/* Header */}
      <Box borderStyle="single" borderColor="green" marginBottom={1}>
        <Text color="white" bold> Spawn New Agent </Text>
      </Box>

      {/* Instructions */}
      <Box marginBottom={1}>
        <Text color="cyan">Enter instructions for the Claude agent:</Text>
        <Text color="gray" dimColor>{'\n'}• Be specific about the task you want the agent to perform</Text>
        <Text color="gray" dimColor>• Include any relevant context or constraints</Text>
        <Text color="gray" dimColor>• Agent will work in isolated git worktree</Text>
      </Box>

      {/* Multi-line text input area */}
      <Box 
        borderStyle="single" 
        borderColor={error ? 'red' : 'gray'}
        flexGrow={1}
        flexDirection="column"
        paddingX={1}
      >
        <Text color="gray" dimColor> Agent Instructions </Text>
        {lines.map((line, index) => (
          <Box key={index}>
            <Text color={index === currentLineIndex ? 'green' : 'white'}>
              {index === currentLineIndex ? '>' : ' '}
            </Text>
            {index === currentLineIndex ? (
              <TextInput
                value={line}
                onChange={handleLineChange}
                placeholder="Type your instructions here..."
              />
            ) : (
              <Text>{line || ' '}</Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Error display */}
      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {/* Loading state */}
      {isLoading && (
        <Box marginTop={1}>
          <Text color="yellow">Creating agent...</Text>
        </Box>
      )}

      {/* Footer with shortcuts */}
      <Box marginTop={1} justifyContent="center">
        <Text color="yellow" bold>
          Ctrl+Enter to spawn | Enter for new line | Escape to cancel
        </Text>
      </Box>
    </Box>
  );
};