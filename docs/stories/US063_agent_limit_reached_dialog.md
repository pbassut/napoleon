# US063: Agent Limit Reached Dialog Implementation

## Epic
**Epic 8: Napoleon UI Specification Implementation**

## Story
**As a** Napoleon user,
**I want** to see a clear dialog when I try to create an agent but have reached the limit,
**so that** I understand why agent creation failed and know how to proceed.

## Description
When users attempt to spawn a new agent but have reached the maximum agent limit, they need clear feedback explaining the situation and actionable guidance. This story implements a dedicated dialog that shows the current agent count, explains the limit, lists existing agents, and provides clear next steps for the user.

## Priority
**MEDIUM** - Improves user experience and prevents confusion

## Acceptance Criteria

### AC1: Detect Agent Limit Condition
- Check agent count before allowing spawn dialog to open
- Display limit dialog instead of spawn dialog when limit is reached
- Show current agent count and maximum limit (e.g., "3/3")
- Ensure limit check happens on every spawn attempt

### AC2: Design Clean Limit Dialog
- Display centered modal with "Cannot Spawn Agent" title
- Show warning emoji (⚠️) and clear limit message
- List all existing agents by name for user reference
- Include simple "[Esc] Close" instruction
- Match UI specification layout and styling

### AC3: Provide Actionable Information
- Display helpful message: "Delete an existing agent first:"
- List current agent names in readable format
- Make it clear that deletion is required before creating new agents
- Ensure dialog dismisses cleanly without side effects

### AC4: Integration with Existing Flow
- Trigger limit dialog from main agent list when pressing 'n' at limit
- Ensure dialog doesn't interfere with other UI operations
- Return to main agent list cleanly after dismissal
- Maintain existing keyboard navigation patterns

## Tasks/Subtasks

- [ ] Create LimitDialog Component (AC2)
  - [ ] Create new LimitDialog.js component in Dialogs folder
  - [ ] Implement centered modal layout matching UI specification
  - [ ] Add warning emoji and clear messaging
  - [ ] Style dialog to match existing modal patterns

- [ ] Implement Agent Limit Detection (AC1)
  - [ ] Add agent count checking logic to AgentManager or appropriate service
  - [ ] Define maximum agent limit constant (configurable)
  - [ ] Create method to check if spawn should be allowed
  - [ ] Integrate limit check with spawn workflow

- [ ] Add Agent Listing Logic (AC3)
  - [ ] Retrieve current agent list for display in dialog
  - [ ] Format agent names for readable display
  - [ ] Handle empty agent list edge case
  - [ ] Ensure agent names are properly truncated if needed

- [ ] Integrate with Main UI Flow (AC4)
  - [ ] Update main agent list component to show limit dialog
  - [ ] Modify spawn key handler to check limits first
  - [ ] Ensure proper dialog state management
  - [ ] Test integration with existing keyboard shortcuts

- [ ] Dialog Interaction and Testing (AC4)
  - [ ] Implement Escape key handling for dialog dismissal
  - [ ] Test dialog focus and keyboard navigation
  - [ ] Verify dialog doesn't interfere with background UI
  - [ ] Test edge cases and error conditions

## Dev Notes

### UI Specification Context
[Source: napoleon-ui-specification.md#agent-limit-reached-dialog]

**Layout Pattern:**
```
┌─ Cannot Spawn Agent ─┐
│                       │
│  ⚠️  Agent limit reached (3/3)                   
│                       │
│  Delete an existing agent first:                 
│  • agent-a7f2k1-auth-system                     
│  • agent-m9x4p3-memory-leak                     
│  • agent-b5c8q7-api-cleanup                     
│                       │
│  [Esc] Close                                     
└───────────────────────┘
```

**Key Features:**
- Clear warning with current count
- Helpful guidance for next steps
- List of existing agents
- Simple dismiss action

### Current Implementation Context
[Source: src/ui/ink/components/Dialogs/SpawnDialog.js]
- SpawnDialog component exists and follows modal pattern
- Need to create similar LimitDialog component
- Integration point is likely in main App or AgentList component

### Technical Implementation Details

**Component Structure:**
```javascript
const LimitDialog = ({ isOpen, onClose, agents, maxLimit }) => {
  // Display modal when isOpen is true
  // Show current count vs maxLimit
  // List agent names
  // Handle Escape key for dismissal
};
```

**Agent Limit Configuration:**
- Default limit should be configurable (suggest 3-5 agents)
- Could be environment variable or config file setting
- Should be easy to adjust for different deployment scenarios

**Integration Points:**
- Main App component: Manage dialog state
- AgentList component: Trigger limit check on spawn
- AgentManager: Provide agent count and limit checking

### Dialog Styling Consistency
[Source: napoleon-ui-specification.md#design-system]
- Match existing SpawnDialog modal styling
- Use consistent border characters and spacing
- Apply proper color scheme (white text, warning colors)
- Center dialog regardless of terminal size

### Error Handling Considerations
- Handle case where agent list is empty (shouldn't happen at limit)
- Graceful fallback if agent names are very long
- Ensure dialog works with minimum terminal width (80 chars)
- Handle rapid key presses or multiple dialog triggers

## Testing

### Testing Strategy
[Source: docs/architecture/testing-strategy.md]
- Unit tests for limit detection logic
- Component tests for dialog rendering
- Integration tests for full spawn workflow
- Manual testing across terminal environments

### Specific Test Requirements
- Verify dialog appears when agent limit is reached
- Test dialog dismissal with Escape key
- Verify agent list displays correctly in dialog
- Test with different agent name lengths
- Ensure dialog centers properly in various terminal sizes

### Edge Case Testing
- Test behavior with exactly maximum agents
- Test rapid spawn attempts at limit
- Verify dialog doesn't appear when under limit
- Test agent deletion followed by spawn attempt
- Verify proper cleanup when dialog is dismissed

### User Experience Testing
- Verify message clarity and helpfulness
- Test keyboard navigation and accessibility
- Ensure visual consistency with rest of application
- Validate that users understand next steps

## Status
**Approved**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial agent limit reached dialog story | Bob (Scrum Master) |
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