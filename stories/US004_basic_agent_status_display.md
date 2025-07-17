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
- [ ] Agent list displays correctly in main dashboard
- [ ] All required information is shown for each agent
- [ ] Status indicators are clear and intuitive
- [ ] Real-time updates work smoothly
- [ ] Arrow key navigation is functional
- [ ] Selection highlighting works properly
- [ ] Empty state is handled gracefully
- [ ] Performance is acceptable with multiple agents
- [ ] UI is tested across different terminal types
- [ ] Status polling doesn't impact responsiveness

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