const React = require('react');
const { useState, useEffect, useRef } = React;

const SpawnDialogInner = ({ isOpen, onClose, onSubmit, Box, Text, useInput, useFocus, TextInput }) => {
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

  return React.createElement(React.Fragment, null,
    React.createElement(Box, {
      position: "absolute",
      width: "100%",
      height: "100%",
      display: isOpen ? 'flex' : 'none'
    },
      React.createElement(Box, {
        width: 70,
        height: 18,
        borderStyle: "single",
        borderColor: "green",
        flexDirection: "column",
        paddingX: 1,
        marginLeft: "auto",
        marginRight: "auto",
        marginTop: "auto",
        marginBottom: "auto"
      },
        React.createElement(Box, { marginBottom: 1 },
          React.createElement(Text, { color: "white", bold: true }, " Spawn New Agent ")
        ),
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
          React.createElement(Text, { color: "cyan" }, "Enter instructions for the Claude agent:"),
          React.createElement(Text, null, " "),
          React.createElement(Text, { color: "gray" }, "• Be specific about the task you want the agent to perform"),
          React.createElement(Text, { color: "gray" }, "• Include any relevant context or constraints"),
          React.createElement(Text, { color: "gray" }, "• Agent will work in isolated git worktree")
        ),
        React.createElement(Box, {
          borderStyle: "single",
          borderColor: error ? 'red' : (isFocused ? 'green' : 'gray'),
          flexGrow: 1,
          paddingX: 1,
          marginBottom: 1
        },
          React.createElement(Box, { flexDirection: "column", width: "100%" },
            React.createElement(Box, { marginBottom: 1 },
              React.createElement(Text, { color: "gray" }, " Agent Instructions ")
            ),
            React.createElement(TextInput, {
              value: text,
              onChange: setText,
              placeholder: "Type your instructions here...",
              focus: isFocused
            }),
            React.createElement(Box, { marginTop: 1 },
              React.createElement(Text, { color: "gray", dimColor: true },
                `${lineCount} line${lineCount !== 1 ? 's' : ''}, ${charCount} character${charCount !== 1 ? 's' : ''}`
              )
            )
          )
        ),
        error && React.createElement(Box, null,
          React.createElement(Text, { color: "red" }, `Error: ${error}`)
        ),
        isLoading && React.createElement(Box, null,
          React.createElement(Text, { color: "yellow" }, "Creating agent...")
        ),
        React.createElement(Box, { justifyContent: "center" },
          React.createElement(Text, { color: "yellow", bold: true },
            "Ctrl+Enter to spawn | Enter for new line | Escape to cancel"
          )
        )
      )
    )
  );
};

// Module-level component cache to avoid re-loading on every instance
let componentCache = null;
let isLoadingComponents = false;

const SpawnDialog = ({ isOpen, onClose, onSubmit }) => {
  const [components, setComponents] = useState(componentCache);
  const mountedRef = useRef(true);

  useEffect(() => {
    // If components are already cached, use them immediately
    if (componentCache && !components) {
      setComponents(componentCache);
      return;
    }

    // If not already loading and no cache, start loading
    if (!isLoadingComponents && !componentCache) {
      isLoadingComponents = true;
      
      Promise.all([
        import('ink'),
        import('ink-text-input')
      ]).then(([ink, textInput]) => {
        const loadedComponents = {
          ...ink,
          TextInput: textInput.default || textInput
        };
        
        // Cache for future instances
        componentCache = loadedComponents;
        
        // Update this instance if still mounted
        if (mountedRef.current) {
          setComponents(loadedComponents);
        }
        
        isLoadingComponents = false;
      }).catch(() => {
        isLoadingComponents = false;
        if (mountedRef.current) {
          setComponents({}); // Empty object to indicate loading failed
        }
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [components]);

  if (!isOpen) {
    return null;
  }

  // If components not ready, return null (no flashing)
  if (!components || !components.Box) {
    return null;
  }

  const { Box, Text, useInput, useFocus } = components;

  return React.createElement(SpawnDialogInner, {
    isOpen, onClose, onSubmit, Box, Text, useInput, useFocus, TextInput: components.TextInput
  });
};

module.exports = { SpawnDialog };