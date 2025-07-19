# Architecture Design

## Component Structure

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

## State Management

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