# US048: Termination Dialog Implementation

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon user,
I want to confirm agent termination through a modal dialog,
so that I can safely terminate agents without accidental data loss.

## Description
This story implements the termination confirmation dialog in Ink, replacing the existing Blessed confirmation modal. The termination dialog provides a safety mechanism to prevent accidental agent termination, which could result in lost work. The dialog must clearly display which agent will be terminated, provide clear Yes/No options with keyboard shortcuts, and integrate with the AgentManager's termination flow. This is a critical UX component that prevents user frustration from accidental terminations.

## Priority
**HIGH** - Termination confirmation is essential for preventing accidental data loss and maintaining user trust.

## Acceptance Criteria

### AC1: Create Confirmation Modal Component
- Build TerminationDialog component with modal overlay
- Display agent name and ID being terminated
- Show clear warning message about termination
- Center modal in terminal viewport
- Block background interaction during confirmation

### AC2: Implement Yes/No Controls
- Display prominent Yes/No options
- Support keyboard shortcuts (y/n or Enter/Escape)
- Highlight default option (No for safety)
- Allow navigation between options with Tab/arrows
- Show keyboard hints in dialog

### AC3: Display Agent Information
- Show agent name prominently
- Display agent status (running time, current state)
- Include warning about unsaved work if applicable
- Format information clearly and concisely
- Use color coding for emphasis (red for warnings)

### AC4: Handle Termination Flow
- Connect Yes action to AgentManager.terminateAgent()
- Show loading state during termination
- Handle termination errors gracefully
- Close dialog on successful termination
- Return focus to agent list after closing

### AC5: Safety and Accessibility Features
- Default to "No" option for safety
- Require explicit confirmation (no accidental Enter)
- Support screen readers with proper labels
- Test with keyboard-only navigation
- Add escape hatch (Escape always cancels)

## Tasks/Subtasks

- [ ] Create termination dialog component (AC1)
  - [ ] Create src/ui/ink/components/Dialogs/TerminationDialog.tsx
  - [ ] Implement modal overlay structure
  - [ ] Add warning message formatting
  - [ ] Center modal positioning
  - [ ] Block background interaction

- [ ] Add Yes/No controls (AC2)
  - [ ] Create button/option components
  - [ ] Implement keyboard handlers
  - [ ] Add Tab navigation
  - [ ] Highlight selected option
  - [ ] Show keyboard shortcuts

- [ ] Display agent details (AC3)
  - [ ] Format agent name display
  - [ ] Add status information
  - [ ] Include runtime duration
  - [ ] Add warning messages
  - [ ] Apply color coding

- [ ] Connect termination logic (AC4)
  - [ ] Wire to AgentManager.terminateAgent()
  - [ ] Add loading indicator
  - [ ] Handle success/error states
  - [ ] Close on completion
  - [ ] Restore focus properly

- [ ] Add safety features (AC5)
  - [ ] Set default to No
  - [ ] Prevent accidental confirms
  - [ ] Add proper ARIA labels
  - [ ] Test keyboard flow
  - [ ] Ensure Escape works

## Dev Notes

### Dialog Component Structure

```typescript
interface TerminationDialogProps {
  isOpen: boolean;
  agent: Agent | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const TerminationDialog: React.FC<TerminationDialogProps> = ({
  isOpen,
  agent,
  onConfirm,
  onCancel
}) => {
  const [selected, setSelected] = useState<'no' | 'yes'>('no');
  
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    } else if (input === 'y') {
      onConfirm();
    } else if (input === 'n') {
      onCancel();
    }
  });
  
  if (!isOpen || !agent) return null;
  
  return (
    <Box
      borderStyle="single"
      borderColor="red"
      padding={1}
    >
      {/* Dialog content */}
    </Box>
  );
};
```

### Current Termination Dialog Behavior

From existing Napoleon implementation:
- Opens with 't' key from agent list
- Shows agent name in red
- Displays "Are you sure?" message
- Defaults to No option
- Confirms with 'y' or Enter (when Yes selected)
- Cancels with 'n' or Escape

### Safety Considerations

```typescript
// Prevent accidental confirmation
const handleKeyPress = (input: string, key: Key) => {
  // Don't allow Enter to confirm unless Yes is selected
  if (key.return && selected === 'yes') {
    onConfirm();
  } else if (key.return && selected === 'no') {
    onCancel();
  }
};
```

### Agent Information Display

```typescript
const formatAgentInfo = (agent: Agent) => {
  const runtime = Date.now() - agent.startTime;
  const minutes = Math.floor(runtime / 60000);
  
  return {
    name: agent.name,
    status: agent.status,
    runtime: `${minutes} minutes`,
    hasUnsavedWork: agent.isDirty // if available
  };
};
```

### Error Handling

```typescript
const handleTermination = async () => {
  setLoading(true);
  try {
    await agentManager.terminateAgent(agent.id);
    onCancel(); // Close dialog
  } catch (error) {
    setError(`Failed to terminate: ${error.message}`);
    // Keep dialog open on error
  } finally {
    setLoading(false);
  }
};
```

### Visual Design Notes

- Use red border for warning emphasis
- Bold text for agent name
- Warning icon (⚠️) if terminal supports
- Clear visual hierarchy
- Sufficient padding for readability

Example layout:
```
┌─────────────────────────────────────┐
│         Terminate Agent?            │
│                                     │
│  Agent: feature-branch-auth         │
│  Status: Running (15 minutes)       │
│                                     │
│  ⚠️  This will stop the agent and   │
│  end its session immediately.       │
│                                     │
│    [ No ]     [ Yes ]              │
│                                     │
│  Press y/n or Enter to confirm      │
└─────────────────────────────────────┘
```

## Status
**In Progress**

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