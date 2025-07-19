# US047: Spawn Dialog Implementation

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon user,
I want to spawn new agents through a modal dialog with multi-line input,
so that I can provide detailed instructions and configuration for new agent sessions.

## Description
This story implements the agent spawn dialog in Ink, replacing the existing Blessed modal. The spawn dialog is a critical interaction point where users create new agents by providing instructions and selecting options. The implementation must support multi-line text input for complex prompts, modal overlay behavior that blocks interaction with the background, keyboard shortcuts for submission and cancellation, and validation before spawning. This directly impacts the user experience of Napoleon's core functionality.

## Priority
**HIGH** - The spawn dialog is essential for creating new agents, which is a primary Napoleon function.

## Acceptance Criteria

### AC1: Create Modal Overlay System
- Implement modal container that overlays the main UI
- Darken or blur background to indicate modal state
- Center modal dialog in terminal viewport
- Block keyboard input to background components
- Support proper focus management within modal

### AC2: Implement Multi-line Text Input
- Create or integrate multi-line text input component
- Support natural text editing (cursor movement, backspace, etc.)
- Allow line breaks with Enter key (Ctrl+Enter to submit)
- Display scrollable text area for long inputs
- Show character/line count indicators

### AC3: Add Modal Controls and Actions
- Implement Submit button/action (Ctrl+Enter)
- Add Cancel button/action (Escape key)
- Show keyboard shortcuts in modal footer
- Validate input before submission (non-empty)
- Clear form state on successful submission

### AC4: Integrate with Agent Spawning
- Connect submit action to AgentManager.spawnAgent()
- Pass formatted prompt to agent creation
- Show loading state during agent creation
- Handle errors with appropriate messaging
- Close modal on successful spawn

### AC5: Polish UX and Accessibility
- Auto-focus text input on modal open
- Restore focus to agent list on close
- Add smooth open/close animations if possible
- Ensure modal is readable in all terminal themes
- Test keyboard navigation flow

## Tasks/Subtasks

- [ ] Create modal system (AC1)
  - [ ] Create src/ui/ink/components/Dialogs/SpawnDialog.tsx
  - [ ] Implement modal overlay container
  - [ ] Add background dimming effect
  - [ ] Set up focus trap logic
  - [ ] Test modal positioning

- [ ] Add text input component (AC2)
  - [ ] Research ink-text-input multiline support
  - [ ] Create custom multiline input if needed
  - [ ] Implement text editing controls
  - [ ] Add scroll support for long text
  - [ ] Display input metrics

- [ ] Implement modal controls (AC3)
  - [ ] Add submit/cancel buttons
  - [ ] Implement keyboard shortcuts
  - [ ] Add input validation
  - [ ] Show shortcut hints
  - [ ] Handle form state

- [ ] Connect to AgentManager (AC4)
  - [ ] Wire submit to spawn method
  - [ ] Format prompt data correctly
  - [ ] Add loading indicator
  - [ ] Handle error responses
  - [ ] Close on success

- [ ] Polish user experience (AC5)
  - [ ] Implement focus management
  - [ ] Add animations if feasible
  - [ ] Test in various terminals
  - [ ] Verify keyboard flow
  - [ ] Document usage

## Dev Notes

### Modal Implementation Strategy

Based on current Blessed modal pattern:
```typescript
interface SpawnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export const SpawnDialog: React.FC<SpawnDialogProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  if (!isOpen) return null;
  
  return (
    <Box
      position="absolute"
      width="80%"
      height="60%"
      left="center"
      top="center"
      borderStyle="single"
      borderColor="blue"
    >
      {/* Modal content */}
    </Box>
  );
};
```

### Multi-line Input Handling

Ink doesn't have built-in multiline support. Options:
1. Use ink-text-input with custom line handling
2. Build custom component with array of lines
3. Use ink-textarea if available and compatible

Example custom approach:
```typescript
const [lines, setLines] = useState<string[]>(['']);
const [cursorLine, setCursorLine] = useState(0);

// Handle line breaks
if (key.return && !key.ctrl) {
  setLines([...lines.slice(0, cursorLine + 1), '', ...lines.slice(cursorLine + 1)]);
  setCursorLine(cursorLine + 1);
}
```

### Focus Management Pattern

Using Ink's useFocusManager:
```typescript
const { focus } = useFocusManager();

useEffect(() => {
  if (isOpen) {
    focus('spawn-input');
  }
}, [isOpen, focus]);
```

### Current Spawn Dialog Behavior to Maintain

From existing Napoleon functionality:
- Opens with 'n' key from agent list
- Closes with Escape key
- Submits with Ctrl+Enter
- Shows instruction text placeholder
- Validates non-empty input
- Auto-focuses input field

### Error States to Handle

```typescript
type SpawnError = 
  | 'EMPTY_PROMPT'
  | 'AGENT_LIMIT_REACHED'
  | 'API_KEY_INVALID'
  | 'NETWORK_ERROR';

const errorMessages = {
  EMPTY_PROMPT: 'Please enter instructions for the agent',
  AGENT_LIMIT_REACHED: 'Maximum number of agents reached',
  // etc.
};
```

### Integration Points

Connect to existing spawn flow:
```typescript
const handleSubmit = async (prompt: string) => {
  setLoading(true);
  try {
    await agentManager.spawnAgent({
      instructions: prompt,
      workingDirectory: process.cwd()
    });
    onClose();
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
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