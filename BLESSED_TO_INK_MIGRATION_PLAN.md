# Blessed to Ink Migration Plan

## Executive Summary

This document outlines a comprehensive migration strategy from Blessed to Ink for the Napoleon terminal UI. The migration will modernize the codebase by leveraging React's component model while maintaining all current functionality.

### Key Benefits

- **Modern React Architecture**: Leverage React hooks, state management, and component composition
- **Better Developer Experience**: Familiar React patterns, better TypeScript support
- **Improved Maintainability**: Cleaner component structure, easier testing
- **Active Ecosystem**: Ink is actively maintained with regular updates
- **Better Performance**: React's efficient rendering and diff algorithm

### Migration Scope

- 4 core UI files to migrate
- ~2,000 lines of Blessed code
- Estimated timeline: 4-6 weeks
- Risk level: Medium (with phased approach)

## Component Mapping

### Core Components

| Blessed Component  | Ink Equivalent                               | Migration Notes                                        |
| ------------------ | -------------------------------------------- | ------------------------------------------------------ |
| `blessed.screen`   | `<App>` with `render()`                      | Top-level component with Ink's render function         |
| `blessed.box`      | `<Box>`                                      | Direct equivalent with flexbox layout                  |
| `blessed.text`     | `<Text>`                                     | Simple text rendering with style props                 |
| `blessed.list`     | `<SelectInput>` or custom `<Box>` + `<Text>` | Requires custom implementation for full feature parity |
| `blessed.textarea` | `<TextInput>` with multiline                 | May need custom wrapper for exact behavior             |
| `blessed.textbox`  | `<TextInput>`                                | Direct equivalent for single-line input                |

### Layout & Styling

| Blessed Feature          | Ink Approach          | Implementation Details                              |
| ------------------------ | --------------------- | --------------------------------------------------- |
| Absolute positioning     | Flexbox layout        | Use `flexDirection`, `justifyContent`, `alignItems` |
| Border styles            | `borderStyle` prop    | Supports 'single', 'double', 'round', etc.          |
| Colors                   | `color` prop          | Uses chalk under the hood                           |
| Width/Height percentages | Native support        | Works with percentage strings                       |
| Focus management         | `useFocus` hook       | Programmatic focus control                          |
| Shadow effects           | Custom implementation | May need gradient or creative styling               |

## Architecture Design

### Component Structure

```
src/ui/
├── App.tsx                 # Main App component (replaces index.js)
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── MainContent.tsx
│   ├── AgentList/
│   │   ├── AgentList.tsx
│   │   └── AgentItem.tsx
│   ├── Dialogs/
│   │   ├── SpawnDialog.tsx
│   │   ├── TerminationDialog.tsx
│   │   └── DetailView.tsx
│   └── Common/
│       ├── HelpOverlay.tsx
│       └── SearchInput.tsx
├── hooks/
│   ├── useAgentManager.ts
│   ├── useFocusManager.ts
│   └── useKeyboardShortcuts.ts
├── contexts/
│   └── AppContext.tsx
└── utils/
    ├── terminal.ts
    └── focus.ts
```

### State Management

```typescript
// AppContext.tsx
interface AppState {
  agents: Agent[];
  selectedAgentIndex: number;
  showingHelp: boolean;
  activeDialog: 'spawn' | 'termination' | 'detail' | null;
  searchQuery: string;
}

// Using React Context + useReducer for global state
const AppContext = createContext<AppContextType>();
```

## Migration Phases

### Phase 1: Foundation (Week 1-2)

1. **Setup Ink Environment**
   - Install Ink and dependencies
   - Configure TypeScript for Ink
   - Create basic App structure
   - Setup build process

2. **Core Layout Components**
   - Implement Header component
   - Implement Footer component
   - Create basic MainContent container
   - Test basic rendering

### Phase 2: Agent List (Week 2-3)

1. **List Implementation**
   - Create custom scrollable list component
   - Implement keyboard navigation
   - Add agent status indicators
   - Port animation logic

2. **Agent Manager Integration**
   - Hook up to existing AgentManager
   - Implement real-time updates
   - Add error handling

### Phase 3: Dialogs (Week 3-4)

1. **Spawn Dialog**
   - Create modal overlay system
   - Implement multi-line input
   - Add validation and submission

2. **Termination Dialog**
   - Port confirmation dialog
   - Add agent selection
   - Implement cancellation

3. **Detail View**
   - Create log viewer component
   - Implement search functionality
   - Add real-time log updates

### Phase 4: Polish & Testing (Week 4-5)

1. **Terminal Compatibility**
   - Test across different terminals
   - Fix rendering issues
   - Optimize performance

2. **Feature Parity**
   - Ensure all keyboard shortcuts work
   - Verify all animations
   - Test edge cases

### Phase 5: Cutover (Week 5-6)

1. **Parallel Testing**
   - Run both UIs side by side
   - Compare functionality
   - Fix discrepancies

2. **Migration**
   - Update entry points
   - Remove Blessed dependencies
   - Update documentation

## Technical Challenges & Solutions

### 1. List Component

**Challenge**: Ink doesn't have a built-in list component like Blessed's `list`
**Solution**: Build custom scrollable list using `<Box>` and `<Text>` with:

```typescript
const AgentList = ({ agents, selectedIndex }) => {
  const { isFocused } = useFocus();

  return (
    <Box flexDirection="column">
      {agents.slice(scrollOffset, scrollOffset + visibleItems).map((agent, i) => (
        <AgentItem
          key={agent.id}
          agent={agent}
          isSelected={i + scrollOffset === selectedIndex}
          isFocused={isFocused}
        />
      ))}
    </Box>
  );
};
```

### 2. Focus Management

**Challenge**: Different focus paradigm between Blessed and Ink
**Solution**: Create custom focus manager using Ink's `useFocusManager`:

```typescript
const useFocusManager = () => {
  const { focus } = useFocusManager();
  const [focusHistory, setFocusHistory] = useState([]);

  const pushFocus = (id) => {
    setFocusHistory((prev) => [...prev, id]);
    focus(id);
  };

  const popFocus = () => {
    const history = [...focusHistory];
    history.pop();
    const previous = history[history.length - 1];
    if (previous) focus(previous);
    setFocusHistory(history);
  };

  return { pushFocus, popFocus };
};
```

### 3. Terminal Detection

**Challenge**: Blessed's terminal compatibility layer
**Solution**: Use Ink's built-in terminal handling with custom enhancements:

```typescript
const useTerminalCompat = () => {
  const [terminalInfo] = useState(() => ({
    isXterm: process.env.TERM?.includes('xterm'),
    isMacOS: process.platform === 'darwin',
    isCI: !!process.env.CI,
    supportsColor: process.stdout.hasColors?.() ?? true,
  }));

  return terminalInfo;
};
```

### 4. Real-time Updates

**Challenge**: Efficient re-rendering without flicker
**Solution**: Use React's memo and careful state management:

```typescript
const AgentItem = memo(({ agent, isSelected, isFocused }) => {
  // Component only re-renders when props change
  return (
    <Box>
      <Text color={isSelected && isFocused ? 'blue' : 'white'}>
        {agent.name} - {agent.status}
      </Text>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return prevProps.agent.status === nextProps.agent.status &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isFocused === nextProps.isFocused;
});
```

## Testing Strategy

### 1. Unit Tests

- Test individual components in isolation
- Mock Ink's render function
- Test state management logic
- Verify keyboard handlers

### 2. Integration Tests

- Test component interactions
- Verify agent manager integration
- Test dialog flows
- Validate focus management

### 3. E2E Tests

- Use ink-testing-library
- Test complete user flows
- Verify terminal compatibility
- Performance testing

## Risk Mitigation

### 1. Feature Branch Development

- Develop in `feature/ink-migration` branch
- Keep Blessed UI operational during development
- Regular rebasing from main

### 2. Incremental Migration

- Build Ink UI alongside Blessed
- Use feature flag to switch between UIs
- Gradual rollout to users

### 3. Rollback Plan

- Keep Blessed code for 2 release cycles
- Environment variable to force Blessed UI
- Quick revert capability

## Performance Considerations

### 1. Rendering Optimization

```typescript
// Use React.memo for expensive components
const LogViewer = memo(({ logs }) => {
  return (
    <Box>
      {logs.map(log => <Text key={log.id}>{log.message}</Text>)}
    </Box>
  );
});

// Debounce rapid updates
const useDebounced = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
```

### 2. Memory Management

- Limit log history in detail view
- Implement virtual scrolling for large lists
- Clear timers and intervals on unmount

## Success Criteria

1. **Feature Parity**: All current features work identically
2. **Performance**: No noticeable lag or flicker
3. **Compatibility**: Works on all supported terminals
4. **Developer Experience**: Easier to maintain and extend
5. **User Experience**: Seamless transition for users

## Timeline Summary

| Phase               | Duration | Key Deliverables                      |
| ------------------- | -------- | ------------------------------------- |
| Phase 1: Foundation | 2 weeks  | Basic Ink setup, core layout          |
| Phase 2: Agent List | 1 week   | Functional agent list with navigation |
| Phase 3: Dialogs    | 1 week   | All dialogs ported and functional     |
| Phase 4: Polish     | 1 week   | Bug fixes, optimizations              |
| Phase 5: Cutover    | 1 week   | Final migration and cleanup           |

**Total Duration**: 6 weeks (with buffer)

## Next Steps

1. **Approval**: Review and approve migration plan
2. **Team Assignment**: Allocate developer resources
3. **Environment Setup**: Create feature branch and development environment
4. **Kickoff**: Begin Phase 1 implementation

## Appendix: Code Examples

### Example: Main App Component

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

### Example: Agent List with Keyboard Navigation

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
