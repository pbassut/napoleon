# Appendix: Code Examples

## Example: Main App Component

```typescript
import React from 'react';
import { render, Box } from 'ink';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { Footer } from './components/Layout/Footer';
import { AppProvider } from './contexts/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const App = () => {
  useKeyboardShortcuts();

  return (
    <AppProvider>
      <Box flexDirection="column" height="100%">
        <Header />
        <MainContent />
        <Footer />
      </Box>
    </AppProvider>
  );
};

render(<App />);
```

## Example: Agent List with Keyboard Navigation

```typescript
import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAgentManager } from '../hooks/useAgentManager';

export const AgentList = () => {
  const { agents, selectedIndex, selectAgent } = useAgentManager();

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      selectAgent(Math.max(0, selectedIndex - 1));
    }
    if (key.downArrow || input === 'j') {
      selectAgent(Math.min(agents.length - 1, selectedIndex + 1));
    }
  });

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="blue">
      {agents.map((agent, index) => (
        <Box key={agent.id} paddingX={1}>
          <Text color={index === selectedIndex ? 'blue' : 'white'}>
            {index === selectedIndex ? '>' : ' '} [{agent.status}] {agent.name}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
```

This migration plan provides a clear path forward with minimal risk and maximum benefit. The phased approach ensures continuous operation while modernizing the codebase.