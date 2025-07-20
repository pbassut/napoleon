# US064: Enhanced Detail View with Follow Mode

## Epic
**Epic 8: Napoleon UI Specification Implementation**

## Story
**As a** Napoleon user,
**I want** an enhanced agent detail view with auto-scroll follow mode and better log formatting,
**so that** I can effectively monitor agent progress and easily track real-time updates.

## Description
The current agent detail view needs enhancement to match the UI specification with improved header display, color-coded log content, follow mode functionality, and better scroll indicators. This provides users with a professional log viewing experience that clearly shows agent context and allows both manual control and automatic following of new log entries.

## Priority
**MEDIUM** - Improves debugging and monitoring experience

## Acceptance Criteria

### AC1: Enhanced Header Display
- Show back indicator (❮) to indicate this is a sub-view
- Display full agent ID, live status with emoji circle, and runtime
- Use format: "❮ agent-id                              🟢 Status     runtime"
- Ensure header updates in real-time as agent status changes
- Add visual separator between header and log content

### AC2: Color-Coded Log Content
- Apply color coding: 🔴 ERROR (red), 🟢 SUCCESS (green), 🟡 System messages (yellow), ⚪ Default (white)
- Remove line numbers from log display for cleaner appearance
- Show only timestamps in format [HH:MM:SS] for each log entry
- Ensure proper text wrapping for long log lines
- Maintain readable contrast across different terminal themes

### AC3: Follow Mode Implementation
- Implement auto-scroll follow mode (default: ON)
- Show footer indicator: "[f] follow: ON" or "[f] follow: OFF"
- Auto-scroll to bottom when follow mode is ON and new logs arrive
- Allow manual scrolling to disable follow mode automatically
- Re-enable follow mode when user scrolls to bottom or presses 'f'

### AC4: Scroll Indicators and Navigation
- Show "↓ More below ↓" when content extends below view
- Implement enhanced keyboard navigation: ↑/↓ for line scroll, Page Up/Down for page scroll
- Add 'G' to go to bottom (enable follow), 'g' to go to top (disable follow)
- Show current scroll position context when not at bottom
- Ensure smooth scrolling performance with large log files

## Tasks/Subtasks

- [ ] Enhance DetailView Header (AC1)
  - [ ] Update DetailView.js header to show back indicator ❮
  - [ ] Display agent ID, live status with emoji, and runtime
  - [ ] Implement real-time status updates in header
  - [ ] Add visual separator line between header and content
  - [ ] Ensure proper alignment and spacing

- [ ] Implement Color-Coded Log Display (AC2)
  - [ ] Create log content parsing for color coding
  - [ ] Apply red color for ERROR messages
  - [ ] Apply green color for SUCCESS messages  
  - [ ] Apply yellow color for system messages
  - [ ] Use white/default color for regular content
  - [ ] Format timestamps without line numbers

- [ ] Develop Follow Mode Logic (AC3)
  - [ ] Implement follow mode state management
  - [ ] Create auto-scroll to bottom functionality
  - [ ] Add logic to disable follow on manual scroll
  - [ ] Implement 'f' key toggle for follow mode
  - [ ] Show follow status in footer
  - [ ] Auto-enable follow when scrolling to bottom

- [ ] Enhanced Scroll Navigation (AC4)
  - [ ] Implement line-by-line scrolling with ↑/↓ keys
  - [ ] Add page scrolling with Page Up/Page Down
  - [ ] Create 'G' key handler for go-to-bottom
  - [ ] Create 'g' key handler for go-to-top
  - [ ] Add scroll indicators when content extends beyond view
  - [ ] Optimize scroll performance for large logs

- [ ] Footer Enhancement and Integration (AC3, AC4)
  - [ ] Update footer to show follow mode status
  - [ ] Maintain existing navigation controls: [q] back, [↑↓] scroll
  - [ ] Add new controls: [f] follow, [G] bottom, [g] top
  - [ ] Ensure footer updates reflect current mode state
  - [ ] Test all keyboard shortcuts work correctly

## Dev Notes

### UI Specification Context
[Source: napoleon-ui-specification.md#agent-detail-view]

**Header Pattern:**
```
│ ❮ agent-a7f2k1-auth-system                              🟢 Running     2m 34s   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
```

**Log Content Pattern:**
```
│ [14:23:45] Starting authentication system implementation...                    │
│ [14:25:23] ERROR: Missing bcrypt dependency in package.json                    │
│ [14:25:45] SUCCESS: Added bcrypt@5.1.0 to dependencies                        │
```

**Footer Pattern:**
```
│ [q] back  [/] search  [f] follow: ON  [↑↓] scroll  🔍 Search: "auth" 3/7       │
```

### Current Implementation Context
[Source: src/ui/ink/components/DetailView/DetailView.js]
- DetailView component exists for agent log viewing
- May need enhancement for follow mode and color coding
- Integration with AgentManager for real-time status updates

### Technical Implementation Details

**Follow Mode State:**
```javascript
const [followMode, setFollowMode] = useState(true);
const [isAtBottom, setIsAtBottom] = useState(true);

// Auto-scroll when follow mode is on and new logs arrive
useEffect(() => {
  if (followMode && newLogsReceived) {
    scrollToBottom();
  }
}, [followMode, logs]);
```

**Color Coding Logic:**
```javascript
const getLogColor = (logLine) => {
  if (logLine.includes('ERROR:')) return 'red';
  if (logLine.includes('SUCCESS:')) return 'green';
  if (logLine.includes('[System]')) return 'yellow';
  return 'white';
};
```

**Keyboard Navigation:**
- ↑/k: Scroll up one line
- ↓/j: Scroll down one line  
- Page Up: Scroll up one page
- Page Down: Scroll down one page
- G: Go to bottom + enable follow
- g: Go to top + disable follow
- f: Toggle follow mode
- q/Esc: Return to agent list

### Real-time Updates Integration
[Source: napoleon-ui-specification.md#real-time-updates]
- 500ms polling for agent status updates
- Auto-scroll behavior when following logs
- Efficient re-rendering for status changes
- Background updates without UI blocking

### Performance Considerations
- Virtual scrolling for large log files
- Efficient log parsing and color application
- Minimal re-renders when logs update
- Bounded log storage to prevent memory issues

## Testing

### Testing Strategy
[Source: docs/architecture/testing-strategy.md]
- Unit tests for follow mode logic
- Component tests for header and log display
- Integration tests for real-time updates
- Performance tests with large log files

### Specific Test Requirements
- Verify follow mode auto-scroll functionality
- Test color coding applies correctly to different log types
- Validate header shows live agent status updates
- Test all keyboard navigation shortcuts
- Ensure scroll indicators appear when needed

### User Experience Testing
- Test follow mode with rapid log updates
- Verify manual scroll disables follow mode
- Test 'f' key toggle responsiveness
- Validate color coding improves log readability
- Ensure smooth scrolling performance

### Edge Case Testing
- Test with very long log lines
- Test with empty log files
- Test rapid agent status changes in header
- Test follow mode with agent that stops logging
- Verify memory usage with large log files

## Status
**Approved**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial enhanced detail view with follow mode story | Bob (Scrum Master) |
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