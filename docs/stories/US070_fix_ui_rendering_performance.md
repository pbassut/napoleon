# User Story: Fix UI Rendering Performance (Blinking Issue)

## Story ID
US070

## Title
Fix UI Rendering Performance and Eliminate Periodic Blinking

## Status
Draft

## Story
**As a** Napoleon user,
**I want** the UI to render smoothly without periodic blinking or flickering,
**so that** I can have a stable, professional terminal experience when monitoring my agents

## Acceptance Criteria

1. UI remains stable without any periodic blinking or flickering during normal operation
2. Agent list updates happen smoothly without full-screen refreshes
3. Status updates and runtime counters update without causing visual artifacts
4. Terminal performance remains responsive even with 10+ agents
5. No unnecessary re-renders of static UI components (header, footer, borders)
6. Smooth transitions when agents change status
7. Memory usage remains stable during long-running sessions

## Tasks / Subtasks

- [ ] Investigate root cause of periodic blinking (AC: 1)
  - [ ] Profile render cycles using React DevTools or Ink debugging
  - [ ] Identify components triggering unnecessary re-renders
  - [ ] Check for timer/interval conflicts causing periodic updates
  - [ ] Review useEffect dependencies for infinite loops
  
- [ ] Optimize component re-rendering (AC: 2, 3, 5)
  - [ ] Implement React.memo on static components
  - [ ] Review and optimize useState/useEffect usage
  - [ ] Ensure proper key usage in list rendering
  - [ ] Check for layout thrashing in Box components
  
- [ ] Optimize real-time updates (AC: 3, 6)
  - [ ] Review polling mechanism (currently 500ms per spec)
  - [ ] Implement selective updates for changed data only
  - [ ] Use proper memoization for computed values
  - [ ] Ensure status transitions don't trigger full re-renders
  
- [ ] Performance testing and monitoring (AC: 4, 7)
  - [ ] Test with 10+ agents running simultaneously
  - [ ] Monitor memory usage over extended periods
  - [ ] Profile CPU usage during updates
  - [ ] Verify no memory leaks in event handlers
  
- [ ] Fix identified rendering issues (AC: 1, 2, 3)
  - [ ] Apply performance optimizations
  - [ ] Test fixes in different terminal emulators
  - [ ] Ensure compatibility with terminal resizing
  
- [ ] Write tests for performance-critical paths (AC: 7)
  - [ ] Unit tests for memoized components
  - [ ] Tests for selective update logic
  - [ ] Memory leak detection tests

## Dev Notes

### Previous Story Context
From US069 (Main Dashboard implementation), the following real-time update features were not completed:
- Runtime counter updates every second for running agents
- Status changes reflect immediately without flicker
- Smooth transitions between status states
- No UI blocking during updates

### Technical Implementation Details
[Source: docs/napoleon-ui-specification/9-technical-implementation-notes.md]
- **500ms polling** for agent status updates
- **Auto-scroll behavior** when following logs
- **Efficient re-rendering** for status changes
- **Background updates** without UI blocking

### Component Architecture
[Source: docs/architecture/component-architecture.md]
The UI uses:
- Terminal UI with Ink (React for CLI)
- AgentManager for state management
- Real-time updates from SDK Communication Manager

### Ink UI Structure
[Source: Based on src/ui/ink file structure]
- `App.tsx` - Main application state and layout
- `components/AgentList/AgentList.tsx` - List rendering logic
- `components/AgentList/AgentItem.tsx` - Individual agent rows
- `hooks/useAgentManager.ts` - State management hook

### Common Ink Performance Issues
Based on Ink framework knowledge:
- Unnecessary re-renders from improper hook dependencies
- Layout recalculations from dynamic Box dimensions
- Timer/interval conflicts when multiple update sources exist
- Missing React.memo on frequently rendered components
- Improper key usage causing full list re-renders

### Testing Standards
[Source: docs/architecture/testing-strategy.md]
- Test location: `__tests__/` parallel to source
- Framework: Jest with existing configuration
- Focus on render performance and memory usage

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-20 | 1.0 | Initial story creation | Scrum Master |

## Dev Agent Record

### Agent Model Used
(To be filled by Dev Agent)

### Debug Log References
(To be filled by Dev Agent)

### Completion Notes List
(To be filled by Dev Agent)

### File List
(To be filled by Dev Agent)

## QA Results
(To be filled by QA Agent)