# US004: Basic Agent Status Display

## Epic
**Epic 1: Foundation & Core Infrastructure**

## Story
As a developer,
I want to see the status of all active agents at a glance,
so that I can monitor their progress and health.

## Description
This story implements the core agent status display functionality in the main dashboard, providing users with real-time visibility into all active agent sessions. It creates the foundation for agent monitoring and management through clear visual indicators and status information.

## Priority
**High** - Essential for agent monitoring and management

## Acceptance Criteria

### AC1: Agent List Display
- Main dashboard displays list of active agents with basic info
- List is properly formatted and easy to read
- Handles empty state gracefully

### AC2: Agent Information Display
- Each agent shows: name/ID, status (running/idle/error), runtime duration
- Information is updated in real-time
- Consistent formatting across all agents

### AC3: Status Indicators
- Status indicators use clear visual symbols (● for running, ○ for idle, ✗ for error)
- Color coding for different states (if terminal supports it)
- Fallback symbols for terminals without color support

### AC4: Real-time Updates
- Agent list updates in real-time as status changes
- Updates don't interfere with user interaction
- Efficient refresh mechanism

### AC5: Agent Navigation
- User can navigate between agents using arrow keys
- Navigation wraps around (top/bottom)
- Keyboard navigation is responsive

### AC6: Selection Highlighting
- Selected agent is highlighted clearly in the interface
- Highlight persists during navigation
- Visual distinction between selected and unselected agents

### AC7: Empty State
- Empty state message displays when no agents are active
- Clear messaging: "No active agents - Press 'n' to spawn new agent"
- Proper layout maintenance in empty state

## Technical Requirements

### Status Management
```javascript
// Agent status types
const AgentStatus = {
  SPAWNING: 'spawning',
  RUNNING: 'running',
  IDLE: 'idle',
  ERROR: 'error',
  TERMINATING: 'terminating'
};
```

### UI Layout
```
Agent List Display:
┌─────────────────────────────────────────────────────────────┐
│ ADD Manager v1.0.0                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ● agent-001    [running]      Runtime: 05:23               │
│ ○ agent-002    [idle]         Runtime: 12:45               │
│ ✗ agent-003    [error]        Runtime: 02:15               │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Press 'n' to spawn new agent | 'h' for help | 'q' to quit │
└─────────────────────────────────────────────────────────────┘
```

### Status Polling
- Implement efficient status polling mechanism
- Check process status every 1-2 seconds
- Batch status updates for multiple agents

## Definition of Done
- [x] Agent list displays correctly in main dashboard
- [x] All required information is shown for each agent
- [x] Status indicators are clear and intuitive
- [x] Real-time updates work smoothly
- [x] Arrow key navigation is functional
- [x] Selection highlighting works properly
- [x] Empty state is handled gracefully
- [x] Performance is acceptable with multiple agents
- [x] UI is tested across different terminal types
- [x] Status polling doesn't impact responsiveness

## Notes
- This story provides the foundation for all agent monitoring
- Focus on clear, at-a-glance status information
- Ensure good performance with efficient update mechanisms
- Consider terminal capabilities and fallback options
- Test with various agent states and transitions

## Related Stories
- US002: Basic Terminal UI Foundation (prerequisite)
- US003: Agent Spawning Core Functionality (prerequisite)
- US005: Basic Agent Termination (works with this)
- US010: Enhanced Agent Detail View (extends this)
- US011: Advanced Process Monitoring (extends this)

---

## Dev Agent Record

### Status
**Ready for Review**

### Tasks
- [x] Implement AgentStatus enum with all required statuses
- [x] Add status polling mechanism (1.5 second intervals)
- [x] Update UI to display agent list with proper formatting
- [x] Add keyboard navigation (arrow keys + vi-style)
- [x] Implement selection highlighting
- [x] Add empty state handling
- [x] Add runtime tracking and HH:MM format display
- [x] Add status icons (● running, ○ idle, ✗ error, ◐ spawning, ◯ terminating)
- [x] Add color coding for different statuses
- [x] Test with multiple agents and state transitions
- [x] Update tests to match new UI format

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References
- Agent list display implemented in src/ui/index.js:523-578
- Status polling mechanism in src/ui/index.js:450-457
- AgentStatus enum in src/core/agent-manager.js:10-16
- Runtime tracking in src/core/agent-manager.js:553-569

### Completion Notes
- All acceptance criteria successfully implemented
- Real-time status updates working with 1.5s polling
- Navigation with arrow keys and vi-style (j/k) implemented
- Selection highlighting with blue background and ">" indicator
- Empty state shows clear message: "No active agents - Press 'n' to spawn new agent"
- Status icons and color coding working across terminal types
- Runtime display in HH:MM format as specified
- UI layout matches technical requirements exactly
- Tests updated to match new functionality

### File List
- src/ui/index.js (updated with agent list display, navigation, polling)
- src/core/agent-manager.js (updated with status enum, runtime tracking)
- __tests__/ui-extended.test.js (updated tests to match new UI)

### Change Log
- Added AgentStatus enum with all required states
- Implemented status polling mechanism every 1.5 seconds
- Added keyboard navigation with arrow keys and vi-style keys
- Implemented selection highlighting with visual indicators
- Added empty state handling with clear messaging
- Added runtime tracking and HH:MM format display
- Added status icons and color coding for different states
- Updated UI layout to match technical requirements
- Updated tests to validate new functionality