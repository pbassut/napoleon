# US049: Detail View Implementation

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon user,
I want to view detailed logs and output from a selected agent,
so that I can monitor agent progress, debug issues, and search through agent activity.

## Description
This story implements the agent detail view in Ink, replacing the existing Blessed log viewer. The detail view is crucial for monitoring agent activity, debugging problems, and understanding what agents are doing. It must display real-time streaming logs from agents, support searching within logs, handle large log volumes efficiently, and provide smooth scrolling. This view is accessed by pressing Enter on a selected agent and is one of the most frequently used features for active agent monitoring.

## Priority
**HIGH** - The detail view is essential for monitoring agent activity and debugging, which are core Napoleon use cases.

## Acceptance Criteria

### AC1: Create Log Viewer Component
- Build DetailView component that fills the main content area
- Display agent name and status in header section
- Show streaming log content in scrollable area
- Support smooth scrolling with keyboard controls
- Handle logs with thousands of lines efficiently

### AC2: Implement Real-time Log Updates
- Connect to agent's log stream via AgentManager
- Append new log entries as they arrive
- Auto-scroll to bottom for new content (toggleable)
- Maintain scroll position when not auto-scrolling
- Handle rapid log updates without UI lag

### AC3: Add Search Functionality
- Implement search mode triggered by '/' key
- Show search input field at bottom of view
- Highlight search matches in log content
- Navigate between matches with n/N keys
- Display match count and current position

### AC4: Implement Navigation Controls
- Scroll with arrow keys or j/k
- Page up/down with PgUp/PgDn or Ctrl+U/D
- Jump to top/bottom with Home/End or gg/G
- Exit detail view with 'q' or Escape
- Show keyboard shortcuts in footer

### AC5: Performance Optimization
- Virtual scrolling for large logs (only render visible lines)
- Efficient search indexing for fast queries
- Debounce rapid updates to prevent flicker
- Limit memory usage with log rotation
- Handle logs with 10,000+ lines smoothly

## Tasks/Subtasks

- [ ] Create detail view component (AC1)
  - [ ] Create src/ui/ink/components/Dialogs/DetailView.tsx
  - [ ] Implement header with agent info
  - [ ] Add scrollable log container
  - [ ] Set up keyboard handlers
  - [ ] Test with sample log data

- [ ] Connect log streaming (AC2)
  - [ ] Hook up to AgentManager log stream
  - [ ] Implement log entry buffering
  - [ ] Add auto-scroll logic
  - [ ] Handle scroll position state
  - [ ] Test with rapid updates

- [ ] Add search feature (AC3)
  - [ ] Create search input component
  - [ ] Implement search indexing
  - [ ] Add match highlighting
  - [ ] Implement match navigation
  - [ ] Show search statistics

- [ ] Implement navigation (AC4)
  - [ ] Add keyboard scroll handlers
  - [ ] Implement page navigation
  - [ ] Add home/end jumps
  - [ ] Handle exit actions
  - [ ] Update footer with shortcuts

- [ ] Optimize performance (AC5)
  - [ ] Implement virtual scrolling
  - [ ] Add log rotation logic
  - [ ] Profile with large logs
  - [ ] Optimize render cycles
  - [ ] Test memory usage

## Dev Notes

### Log Viewer Architecture

```typescript
interface DetailViewProps {
  agent: Agent;
  onClose: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ agent, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Virtual scrolling calculation
  const visibleLogs = useMemo(() => {
    const height = process.stdout.rows - 4; // Header + footer
    return logs.slice(scrollOffset, scrollOffset + height);
  }, [logs, scrollOffset]);
  
  return (
    <Box flexDirection="column" height="100%">
      <DetailHeader agent={agent} />
      <LogContent logs={visibleLogs} highlight={searchQuery} />
      {searchQuery && <SearchBar query={searchQuery} />}
    </Box>
  );
};
```

### Log Streaming Integration

```typescript
useEffect(() => {
  const logStream = agentManager.getLogStream(agent.id);
  
  const handleLogEntry = (entry: LogEntry) => {
    setLogs(prev => {
      const newLogs = [...prev, entry];
      // Limit to last 10,000 lines
      if (newLogs.length > 10000) {
        return newLogs.slice(-10000);
      }
      return newLogs;
    });
    
    if (autoScroll) {
      setScrollOffset(logs.length - visibleHeight);
    }
  };
  
  logStream.on('data', handleLogEntry);
  
  return () => {
    logStream.off('data', handleLogEntry);
  };
}, [agent.id, autoScroll]);
```

### Search Implementation

```typescript
const searchInLogs = (query: string) => {
  const matches: SearchMatch[] = [];
  
  logs.forEach((log, index) => {
    const text = log.message.toLowerCase();
    const searchLower = query.toLowerCase();
    let pos = 0;
    
    while ((pos = text.indexOf(searchLower, pos)) !== -1) {
      matches.push({ lineIndex: index, charIndex: pos });
      pos += searchLower.length;
    }
  });
  
  return matches;
};
```

### Virtual Scrolling Strategy

Only render visible lines for performance:
```typescript
const VirtualLogList = ({ logs, height, scrollOffset }) => {
  const startIndex = scrollOffset;
  const endIndex = Math.min(startIndex + height, logs.length);
  
  return (
    <Box flexDirection="column">
      {logs.slice(startIndex, endIndex).map((log, i) => (
        <LogLine 
          key={startIndex + i} 
          log={log} 
          lineNumber={startIndex + i + 1}
        />
      ))}
    </Box>
  );
};
```

### Keyboard Navigation

```typescript
useInput((input, key) => {
  if (input === 'q' || key.escape) {
    onClose();
  } else if (input === '/') {
    setSearchMode(true);
  } else if (key.upArrow || input === 'k') {
    setScrollOffset(Math.max(0, scrollOffset - 1));
    setAutoScroll(false);
  } else if (key.downArrow || input === 'j') {
    setScrollOffset(Math.min(logs.length - height, scrollOffset + 1));
    setAutoScroll(false);
  } else if (input === 'G') {
    setScrollOffset(logs.length - height);
    setAutoScroll(true);
  }
  // ... more keys
});
```

### Performance Considerations

From the migration plan:
1. Use React.memo for log line components
2. Debounce rapid updates with requestAnimationFrame
3. Implement log rotation to limit memory
4. Use binary search for search navigation
5. Profile with 10,000+ line logs

### Current Detail View Features to Maintain

- Opens with Enter key on selected agent
- Shows agent name in header
- Displays real-time logs
- Supports searching with '/'
- Exits with 'q' or Escape
- Auto-scrolls by default
- Shows line numbers (optional)

## Status
**Done**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-19 | 1.0 | Initial story creation | Scrum Master Bob |
| 2025-07-19 | 1.1 | Story approved | Scrum Master Bob |
| 2025-07-20 | 1.2 | Story completed - all ACs met | Dev Agent |
## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
claude-opus-4-20250514

### Debug Log References
- Session: 2025-07-20
- Successfully implemented scrollable detail view with real-time log streaming

### Completion Notes
- Implemented both TypeScript and JavaScript versions for ESM/CommonJS compatibility
- Created DetailView component with virtual scrolling for handling large logs (10,000+ lines)
- Implemented comprehensive search functionality with highlighting and navigation
- Added multiple keyboard navigation options (arrows, j/k, PgUp/PgDn, G/gg, /, n/N)
- Connected to real agent logs via useAgentLogs hook and AgentLogManager
- Integrated DetailView into main App with state management
- All acceptance criteria met

### Files List
- src/ui/ink/components/DetailView/index.ts (created)
- src/ui/ink/components/DetailView/index.js (created)
- src/ui/ink/components/DetailView/DetailView.js (created)
- src/ui/ink/hooks/useAgentLogs.ts (created)
- src/ui/ink/hooks/useAgentLogs.js (created)
- src/ui/ink/App.js (modified)
- src/ui/ink/startWithManager.js (modified)

## QA Results

_To be completed by QA Agent after implementation_