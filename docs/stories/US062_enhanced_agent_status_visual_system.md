# US062: Enhanced Agent Status Visual System

## Epic
**Epic 8: Napoleon UI Specification Implementation**

## Story
**As a** Napoleon user,
**I want** to see clear, color-coded status indicators with emoji circles for all agent states,
**so that** I can instantly understand each agent's current status and progress.

## Description
The current agent status system needs enhancement to match the UI specification. This story implements the comprehensive visual status system with proper emoji circles, color coding, and status text that provides immediate visual feedback about agent states including spawning progress, running status, errors, and termination states.

## Priority
**MEDIUM** - Improves user experience and visual clarity

## Acceptance Criteria

### AC1: Implement Color-Coded Status Circles
- Display 🟢 green circle for "Running" status
- Display 🟡 yellow circle for transitional states: "Spawning...", "Forking...", "Starting...", "Pending", "Idle"
- Display 🔴 red circle for error states: "Error", "Failed"
- Display ⚪ gray circle for "Terminated" status
- Ensure consistent emoji rendering across terminals

### AC2: Update Status Text Labels
- Use exact status text from specification: "Running", "Spawning...", "Forking...", "Starting...", "Pending", "Idle", "Error", "Failed", "Terminated"
- Ensure status text updates in real-time as agent state changes
- Maintain proper spacing and alignment in agent list view

### AC3: Implement Status Flow Logic
- Support complete status flow: 🟡 Spawning... → 🟡 Forking... → 🟡 Starting... → 🟢 Running → 🟡 Idle
- Handle error transition: Any state → 🔴 Error → ⚪ Terminated
- Ensure smooth transitions between status states

### AC4: Visual Consistency
- Apply status colors to both emoji circles and status text
- Maintain consistent spacing and alignment in agent list display
- Ensure status indicators work properly with selection highlighting
- Test visual appearance across different terminal themes

## Tasks/Subtasks

- [ ] Update Agent Status Constants (AC1, AC2)
  - [ ] Define status constants with emoji circles and text labels
  - [ ] Create status color mapping for consistent theming
  - [ ] Update AgentManager status enumeration if needed
  - [ ] Test emoji rendering across different terminals

- [ ] Enhance AgentItem Component (AC1, AC2, AC4)
  - [ ] Update AgentItem.js to display emoji circles with status text
  - [ ] Implement color-coded status display
  - [ ] Ensure proper spacing and alignment
  - [ ] Handle selection highlighting interaction with status colors

- [ ] Implement Status Flow Logic (AC3)
  - [ ] Update agent spawning process to use new status progression
  - [ ] Implement status transition logic in AgentManager
  - [ ] Add proper error state handling and transitions
  - [ ] Test complete status flow from spawn to termination

- [ ] Visual Testing and Refinement (AC4)
  - [ ] Test status display across different terminal sizes
  - [ ] Verify emoji rendering on various terminal emulators
  - [ ] Test color visibility with different terminal themes
  - [ ] Ensure accessibility and readability

## Dev Notes

### UI Specification Context
[Source: napoleon-ui-specification.md#agent-status-system]

**Status Circle System:**
- 🟢 Green: Running (agent actively processing)
- 🟡 Yellow: Transitional states (Spawning, Forking, Starting, Pending, Idle)
- 🔴 Red: Error states (Error, Failed)
- ⚪ Gray: Terminated (cleanly stopped)

**Status Flow:**
```
🟡 Spawning... → 🟡 Forking... → 🟡 Starting... → 🟢 Running → 🟡 Idle
                                                      ↓
                                               🔴 Error → ⚪ Terminated
```

### Current Implementation Context
[Source: src/ui/ink/components/AgentList/AgentItem.js]
- AgentItem component currently displays basic status text
- Status colors may not be fully implemented per specification
- Need to ensure emoji circles render properly in terminal environment

### Technical Implementation Details

**Status Constants:**
```javascript
const AGENT_STATUS = {
  SPAWNING: { emoji: '🟡', text: 'Spawning...', color: 'yellow' },
  FORKING: { emoji: '🟡', text: 'Forking...', color: 'yellow' },
  STARTING: { emoji: '🟡', text: 'Starting...', color: 'yellow' },
  RUNNING: { emoji: '🟢', text: 'Running', color: 'green' },
  PENDING: { emoji: '🟡', text: 'Pending', color: 'yellow' },
  IDLE: { emoji: '🟡', text: 'Idle', color: 'yellow' },
  ERROR: { emoji: '🔴', text: 'Error', color: 'red' },
  FAILED: { emoji: '🔴', text: 'Failed', color: 'red' },
  TERMINATED: { emoji: '⚪', text: 'Terminated', color: 'gray' }
};
```

**Display Pattern:**
```
│   agent-m9x4p3-memory-leak                            1m 12s   🟡 Pending      │
│   agent-b5c8q7-api-cleanup                              45s    🔴 Error        │
```

### Color System Integration
[Source: napoleon-ui-specification.md#design-system]
- Success: Green (#00FF00)
- Warning: Yellow (#FFFF00) 
- Error: Red (#FF0000)
- Muted: Gray (#808080)

### Terminal Compatibility Considerations
- Test emoji rendering on macOS Terminal, iTerm2, Windows Terminal
- Ensure fallback for terminals that don't support emoji
- Verify color rendering with both light and dark terminal themes
- Consider accessibility for color-blind users

## Testing

### Testing Strategy
[Source: docs/architecture/testing-strategy.md]
- Unit tests for status display logic
- Visual testing across terminal environments
- Integration tests for status transitions
- Accessibility testing for color contrast

### Specific Test Requirements
- Verify emoji circles render correctly in test environment
- Test status transitions through complete agent lifecycle
- Validate color coding matches specification exactly
- Test visual layout with different agent name lengths
- Ensure status updates don't break list alignment

### Manual Testing Checklist
- Create new agent and verify status progression
- Trigger agent error and verify error status display
- Terminate agent and verify terminated status
- Test with multiple agents showing different statuses
- Verify selection highlighting works with status colors

## Status
**Approved**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial enhanced agent status visual system story | Bob (Scrum Master) |
| 2025-07-20 | 1.1 | Status updated to Approved | Bob (Scrum Master) |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_TBD_

### Debug Log References
_TBD_

### Completion Notes
_TBD_

### Files List
_TBD_

## QA Results

_To be completed by QA Agent after implementation_