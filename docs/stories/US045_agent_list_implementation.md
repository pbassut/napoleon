# US045: Agent List Implementation

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon user,
I want to see a scrollable list of all active agents with keyboard navigation,
so that I can monitor agent status and select agents for detailed viewing or termination.

## Description
This story implements the core agent list component in Ink, replacing the existing Blessed list widget. The agent list is the primary interface element in Napoleon, displaying all active agents with their status, name, and visual indicators. This implementation must support keyboard navigation (arrow keys or j/k), scrolling for long lists, real-time status updates, and selection highlighting. The component will serve as the foundation for agent interaction features in subsequent stories.

## Priority
**HIGH** - The agent list is the central UI component that users interact with most frequently.

## Acceptance Criteria

### AC1: Create Custom Scrollable List Component
- Build AgentList component using Ink's Box and Text primitives
- Support vertical scrolling when agent count exceeds visible area
- Calculate visible window based on terminal height minus header/footer
- Implement smooth scrolling with proper offset calculation
- Handle edge cases (empty list, single item, terminal resize)

### AC2: Implement Keyboard Navigation
- Support UP/DOWN arrow keys for navigation
- Support j/k keys as vim-style alternatives
- Highlight currently selected agent with color/style
- Ensure selection stays visible during scrolling (auto-scroll)
- Wrap selection at list boundaries (optional based on UX preference)

### AC3: Display Agent Information
- Show agent name (truncated if needed for width)
- Display agent status with color coding
- Include status indicators (● for running, ◌ for pending, etc.)
- Show agent index or ID for reference
- Maintain consistent formatting and alignment

### AC4: Add Visual Status Indicators
- Use colored dots/symbols for agent states:
  - Green (●) for running/active
  - Yellow (◌) for pending/starting  
  - Red (×) for error/failed
  - Gray (○) for terminated
- Animate status changes with subtle transitions
- Ensure symbols work across different terminals

### AC5: Performance and Real-time Updates
- Component re-renders efficiently with React.memo
- Only affected items update when status changes
- Handle rapid status updates without flicker
- Support lists with 50+ agents without lag
- Maintain 60fps scrolling performance

## Tasks/Subtasks

- [ ] Create base AgentList component (AC1)
  - [ ] Create src/ui/ink/components/AgentList/AgentList.tsx
  - [ ] Implement scroll offset calculation
  - [ ] Add terminal height detection
  - [ ] Handle window sizing logic
  - [ ] Test with various list sizes

- [ ] Add keyboard navigation (AC2)
  - [ ] Implement useInput hook for key handling
  - [ ] Add selection state management
  - [ ] Implement up/down arrow navigation
  - [ ] Add j/k vim navigation
  - [ ] Auto-scroll to keep selection visible

- [ ] Create AgentItem component (AC3)
  - [ ] Create src/ui/ink/components/AgentList/AgentItem.tsx
  - [ ] Format agent name with truncation
  - [ ] Add status text display
  - [ ] Implement selection highlighting
  - [ ] Ensure consistent spacing

- [ ] Implement status indicators (AC4)
  - [ ] Define status symbol mapping
  - [ ] Add color coding for statuses
  - [ ] Test symbol rendering in terminals
  - [ ] Add status change animations
  - [ ] Document symbol choices

- [ ] Optimize performance (AC5)
  - [ ] Implement React.memo for AgentItem
  - [ ] Add custom comparison function
  - [ ] Test with 50+ agents
  - [ ] Profile and optimize renders
  - [ ] Add performance metrics

## Dev Notes

### Implementation Strategy

From the technical challenges section of the migration plan:
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

### Keyboard Navigation Pattern

Using Ink's useInput hook:
```typescript
useInput((input, key) => {
  if (key.upArrow || input === 'k') {
    selectAgent(Math.max(0, selectedIndex - 1));
  }
  if (key.downArrow || input === 'j') {
    selectAgent(Math.min(agents.length - 1, selectedIndex + 1));
  }
});
```

### Status Mapping

Based on current Napoleon agent states:
- `running`: Green ● (active agent)
- `pending`: Yellow ◌ (starting up)
- `error`: Red × (failed state)
- `terminated`: Gray ○ (stopped)
- `success`: Green ✓ (completed)

### Performance Optimization

From the performance considerations section:
```typescript
const AgentItem = memo(({ agent, isSelected, isFocused }) => {
  return (
    <Box>
      <Text color={isSelected && isFocused ? 'blue' : 'white'}>
        {agent.name} - {agent.status}
      </Text>
    </Box>
  );
}, (prevProps, nextProps) => {
  return prevProps.agent.status === nextProps.agent.status &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.isFocused === nextProps.isFocused;
});
```

### Terminal Compatibility Notes

- Test status symbols in: iTerm2, Terminal.app, Hyper, WSL
- Fallback to ASCII characters if Unicode fails
- Consider TERM environment variable
- Minimum terminal width: 80 characters

### Mock Data for Testing

```typescript
const mockAgents = [
  { id: '1', name: 'feature-branch-agent', status: 'running' },
  { id: '2', name: 'bugfix-auth-agent', status: 'pending' },
  { id: '3', name: 'refactor-ui-agent', status: 'error' },
  // ... generate 50+ for performance testing
];
```

## Status
**Approved**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-19 | 1.0 | Initial story creation | Scrum Master Bob |
| 2025-07-19 | 1.1 | Story approved | Scrum Master Bob |
## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_[Model name and version]_

### Debug Log References
_[Links to debug logs]_

### Completion Notes
_[Implementation notes]_

### Files List
_[Files created/modified during implementation]_

## QA Results

_To be completed by QA Agent after implementation_