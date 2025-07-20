# US051: Spawn Dialog Multi-line Input Enhancement

## Epic
**Epic 7: Blessed to Ink Migration**

## Story
As a Napoleon user,
I want to enter multi-line instructions when spawning new agents,
so that I can provide detailed context, code snippets, and complex prompts without being limited to a single line.

## Description
This story enhances the Ink spawn dialog to support true multi-line text input. Currently, the Ink implementation uses a single-line TextInput component from ink-text-input, which significantly limits the user's ability to provide comprehensive instructions to agents. The Blessed version supported multi-line input with Shift+Enter for new lines and Ctrl+Enter to submit. This enhancement will restore feature parity and improve the user experience by allowing rich, detailed agent instructions including code blocks, lists, and structured prompts.

## Priority
**MEDIUM** - Important for feature parity and user experience, but not blocking core functionality.

## Acceptance Criteria

### AC1: Multi-line Text Input Component
- Create or integrate a true multi-line text input component
- Support natural line breaks with Enter key
- Display visible text area with scrolling for long content
- Show current cursor position within the text
- Maintain focus within the text area

### AC2: Keyboard Navigation
- Enter key creates new line (not submission)
- Ctrl+Enter submits the form
- Arrow keys navigate within text (up/down between lines)
- Home/End keys work within lines
- Ctrl+Home/Ctrl+End navigate to start/end of text

### AC3: Text Editing Features
- Support copy/paste operations
- Allow text selection (if terminal supports)
- Backspace/Delete work across line boundaries
- Tab key inserts spaces (for code indentation)
- Word-wrap for long lines

### AC4: Visual Feedback
- Display line numbers or line count
- Show character count
- Indicate maximum length if applicable
- Highlight syntax for code blocks (optional)
- Clear visual boundaries of text area

### AC5: Integration and Compatibility
- Integrate seamlessly with existing SpawnDialog
- Maintain all current dialog functionality
- Preserve validation and error handling
- Work across all supported terminals
- Handle special characters and Unicode

## Tasks/Subtasks

- [ ] Research multi-line solutions (AC1)
  - [ ] Evaluate ink-textarea if available
  - [ ] Research custom implementation options
  - [ ] Test react-terminal-textarea
  - [ ] Analyze performance implications
  - [ ] Choose implementation approach

- [ ] Implement multi-line component (AC1)
  - [ ] Create MultilineTextInput component
  - [ ] Handle text state management
  - [ ] Implement scrolling logic
  - [ ] Add cursor positioning
  - [ ] Test with long texts

- [ ] Add keyboard handlers (AC2)
  - [ ] Implement Enter for new lines
  - [ ] Add Ctrl+Enter for submission
  - [ ] Handle arrow key navigation
  - [ ] Support Home/End keys
  - [ ] Test all key combinations

- [ ] Implement editing features (AC3)
  - [ ] Add clipboard support
  - [ ] Handle multi-line backspace
  - [ ] Implement tab handling
  - [ ] Add word-wrap logic
  - [ ] Test edge cases

- [ ] Create visual elements (AC4)
  - [ ] Add line/character counters
  - [ ] Design text area borders
  - [ ] Implement scroll indicators
  - [ ] Add focus styling
  - [ ] Test in different themes

- [ ] Integrate with SpawnDialog (AC5)
  - [ ] Replace single-line input
  - [ ] Update submit handling
  - [ ] Maintain validation logic
  - [ ] Test full workflow
  - [ ] Update documentation

## Dev Notes

### Current Implementation Limitation

The current SpawnDialog uses ink-text-input:
```typescript
<TextInput
  value={prompt}
  onChange={setPrompt}
  placeholder="Enter agent instructions..."
/>
```

This only supports single-line input, severely limiting user expression.

### Multi-line Implementation Options

**Option 1: Custom Component**
```typescript
const MultilineTextInput: React.FC<Props> = ({ value, onChange, rows = 5 }) => {
  const lines = value.split('\n');
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorCol, setCursorCol] = useState(0);
  
  useInput((input, key) => {
    if (key.return && !key.ctrl) {
      // Insert newline at cursor
      const newValue = insertAt(value, cursorPos, '\n');
      onChange(newValue);
    } else if (key.ctrl && key.return) {
      onSubmit();
    }
  });
  
  return (
    <Box flexDirection="column" borderStyle="single">
      {lines.slice(scrollTop, scrollTop + rows).map((line, i) => (
        <Text key={i}>
          {i === cursorLine ? insertCursor(line, cursorCol) : line}
        </Text>
      ))}
    </Box>
  );
};
```

**Option 2: Textarea Library**
```typescript
import { Textarea } from 'ink-textarea'; // If available

<Textarea
  value={prompt}
  onChange={setPrompt}
  onSubmit={handleSubmit}
  rows={5}
  placeholder="Enter detailed instructions..."
/>
```

### Cursor Rendering Strategy

```typescript
const insertCursor = (text: string, position: number): string => {
  const before = text.slice(0, position);
  const after = text.slice(position);
  return `${before}${chalk.inverse(' ')}${after}`;
};
```

### State Management

```typescript
interface TextareaState {
  content: string;
  cursorPosition: { line: number; column: number };
  scrollOffset: number;
  selection?: { start: Position; end: Position };
}

const useTextarea = (initialValue: string) => {
  const [state, setState] = useState<TextareaState>({
    content: initialValue,
    cursorPosition: { line: 0, column: 0 },
    scrollOffset: 0
  });
  
  // Handle all text operations
  return {
    ...state,
    insertText,
    deleteText,
    moveCursor,
    // etc.
  };
};
```

### Terminal Compatibility Considerations

- Some terminals don't support certain key combinations
- Mouse selection may not work everywhere
- Clipboard access varies by platform
- Need fallbacks for limited terminals

### Performance Optimization

```typescript
// Virtualize rendering for large texts
const visibleLines = useMemo(() => {
  return lines.slice(scrollOffset, scrollOffset + visibleRows);
}, [lines, scrollOffset, visibleRows]);

// Debounce onChange for performance
const debouncedOnChange = useMemo(
  () => debounce(onChange, 100),
  [onChange]
);
```

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_[Model name]_

### Debug Log References
_[Links to debug logs]_

### Completion Notes
_[Implementation notes]_

### Files List
_[Files created/modified during implementation]_

## QA Results

_To be completed by QA Agent after implementation_