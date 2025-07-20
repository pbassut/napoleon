# User Story: Main Dashboard (Agent List View)

## Story ID
US069

## Title
Implement Main Dashboard with Agent List View

## Description
As a Napoleon user, I want to see a clean, full-screen dashboard displaying all my active agents with their real-time status, runtime, and navigation controls, so that I can efficiently manage multiple AI agents from a single terminal interface.

## Acceptance Criteria

### Layout & Display
- [ ] Full-screen terminal layout that utilizes entire available space
- [ ] Three-column structure displays: Agent name, Runtime, Status
- [ ] Agent names follow format: `agent-{6char}-{worktree}`
- [ ] Header shows "Napoleon" title centered
- [ ] Footer displays navigation controls: `[n]ew agent  [d]elete  [Enter] inspect  [q]uit     🔍 [/] search  [f] follow`
- [ ] Clean borders using box-drawing characters

### Agent List Functionality
- [ ] Display all agents in a scrollable list
- [ ] Show selection indicator (`❯`) for currently selected agent
- [ ] Selected row highlights with cyan/blue color
- [ ] Support for 10+ agents with virtual scrolling
- [ ] Maintain consistent spacing between columns
- [ ] Empty state shows helpful message when no agents exist

### Real-time Updates
- [ ] Runtime counter updates every second for running agents
- [ ] Status changes reflect immediately without flicker
- [ ] Smooth transitions between status states
- [ ] No UI blocking during updates

### Navigation Controls
- [ ] Arrow keys (↑/↓) move selection up/down
- [ ] Vim bindings (k/j) also move selection up/down
- [ ] Enter or 'i' opens agent detail view
- [ ] 'n' key opens spawn dialog
- [ ] 'd' key triggers delete confirmation
- [ ] 'q' key exits application
- [ ] '/' key activates search (future feature - show as disabled)
- [ ] 'f' key toggles follow mode (future feature - show as disabled)

### Status Display System
- [ ] 🟢 Green circle + "Running" for active agents
- [ ] 🟡 Yellow circle for transitional states:
  - "Spawning..." when creating
  - "Forking..." when setting up worktree
  - "Starting..." when connecting
  - "Pending" when awaiting instructions
  - "Idle" when task completed
- [ ] 🔴 Red circle for error states:
  - "Error" for recoverable errors
  - "Failed" for unrecoverable failures
- [ ] ⚪ Gray circle + "Terminated" for stopped agents

### Responsive Behavior
- [ ] Minimum terminal width: 80 characters
- [ ] Content adjusts to terminal size changes
- [ ] Column widths scale proportionally
- [ ] Truncate long agent names with ellipsis
- [ ] Show scroll indicators when content exceeds view

## Technical Requirements

### Component Structure
```
src/ui/ink/components/
├── Layout/
│   ├── Header.tsx         # Title and branding
│   └── Footer.tsx         # Navigation controls
├── AgentList/
│   ├── AgentList.tsx      # Main container component
│   ├── AgentItem.tsx      # Individual agent row
│   └── index.tsx          # Public exports
```

### State Management
- Track selected agent index
- Maintain scroll offset for virtual scrolling
- Handle keyboard input focus
- Update agent data from AgentManager

### Performance Considerations
- Use React.memo for AgentItem to prevent unnecessary re-renders
- Implement virtual scrolling for large agent lists
- Debounce status updates to prevent flicker
- Use useMemo for derived calculations

### Integration Points
- Connect to useAgentManager hook for agent data
- Emit events for navigation actions (spawn, delete, inspect)
- Handle terminal resize events
- Respect theme/color configuration

## Implementation Hints

1. **Start with AgentList component**:
   - Import existing AgentItem (already implemented)
   - Focus on layout and scrolling logic
   - Use Ink's Box and Text components

2. **Virtual Scrolling**:
   - Calculate visible items based on terminal height
   - Track scroll offset in state
   - Slice agents array for visible subset

3. **Keyboard Navigation**:
   - Use Ink's useInput hook
   - Check if component is focused before handling input
   - Implement both arrow and vim bindings

4. **Status Updates**:
   - Agent data comes from props (managed by parent)
   - Let AgentItem handle individual rendering
   - Focus on list management and navigation

5. **Column Alignment**:
   - Use fixed widths for consistent alignment
   - Agent name: flexible width
   - Runtime: 8 characters
   - Status: 15 characters

## Dependencies
- Existing AgentItem component (src/ui/ink/components/AgentList/AgentItem.tsx)
- useAgentManager hook for agent data
- Ink framework (Box, Text, useInput, useFocus)
- Agent type definitions from src/ui/ink/types

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Component renders without errors
- [ ] Keyboard navigation works smoothly
- [ ] Virtual scrolling handles 50+ agents
- [ ] No visual glitches during updates
- [ ] Code follows existing patterns
- [ ] TypeScript types properly defined
- [ ] Manual testing confirms all features work

## Notes
- The search (/) and follow (f) features are marked for future implementation - they should appear in the footer but show a "Coming soon" message when activated
- Focus on getting the core list view working first before adding advanced features
- The AgentItem component already exists and handles individual agent rendering
- This is the primary view users will interact with, so polish and performance are critical

## Dev Agent Record

### Developer Status: In Progress

### Debug Log References
- Starting implementation of US069

### Completion Notes
- [ ] Implementation started

### File List
- [x] src/ui/ink/components/Layout/Header.tsx - Implemented Napoleon header
- [x] src/ui/ink/components/Layout/Footer.tsx - Implemented navigation footer  
- [x] src/ui/ink/components/AgentList/AgentItem.tsx - Enhanced with runtime and three-column layout
- [x] src/ui/ink/components/AgentList/AgentList.tsx - Added column headers and full-screen layout
- [x] src/ui/ink/components/AgentList/AgentItem.test.tsx - Added runtime formatting tests
- [x] src/ui/ink/App.tsx - Removed duplicate empty state handling

### Change Log
- Initial dev agent record created