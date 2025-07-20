# US051: Spawn Dialog Multi-line Input Enhancement

## Epic
**Epic 6: Blessed to Ink Migration**

## Story
As a Napoleon user,
I want to enter multi-line instructions in the spawn dialog with proper text editing capabilities,
So that I can provide complex, formatted prompts to agents without limitations.

## Description
This story enhances the existing SpawnDialog component to support true multi-line text input. Currently, the dialog uses a single-line TextInput component that counts newlines but doesn't actually support multi-line editing. This enhancement will implement proper multi-line text editing with cursor navigation between lines, visual line breaks, scrolling for long content, and proper keyboard shortcuts for line management. This directly improves the user experience when creating agents with detailed instructions.

## Priority
**MEDIUM** - The current single-line input works but limits user expression. Multi-line support is a significant UX improvement.

## Acceptance Criteria

### AC1: Implement True Multi-line Text Editor
- Replace single-line TextInput with multi-line capable component
- Support actual line breaks with Enter key
- Display multiple lines of text visually in the input area
- Maintain cursor position across lines
- Support text wrapping for long lines

### AC2: Add Advanced Text Navigation
- Support arrow keys for moving between lines
- Implement Home/End keys for line navigation
- Add Ctrl+Arrow for word-by-word navigation
- Support Page Up/Down for longer texts
- Maintain proper cursor visibility

### AC3: Implement Scrollable Text Area
- Add vertical scrolling for texts longer than display area
- Show scroll indicators when content overflows
- Maintain smooth scrolling with cursor movement
- Display current line number indicator
- Set reasonable max height (e.g., 10 lines visible)

### AC4: Enhance Text Editing Operations
- Support standard text selection (if possible in terminal)
- Implement cut/copy/paste operations
- Add undo/redo functionality (Ctrl+Z/Ctrl+Y)
- Support indent/outdent with Tab/Shift+Tab
- Preserve text formatting and whitespace

### AC5: Update UI and Keyboard Shortcuts
- Keep Ctrl+Enter for submission
- Use Enter for new lines (as currently indicated)
- Update help text to reflect new capabilities
- Show line/column position indicator
- Add visual feedback for edit operations

## Tasks/Subtasks

- [ ] Research multi-line solutions (AC1)
  - [ ] Evaluate ink-textarea compatibility
  - [ ] Research custom implementation options
  - [ ] Test terminal capability limits
  - [ ] Choose implementation approach
  - [ ] Create proof of concept

- [ ] Build multi-line component (AC1, AC2)
  - [ ] Create MultilineTextInput component
  - [ ] Implement line management logic
  - [ ] Add cursor tracking across lines
  - [ ] Handle line wrapping logic
  - [ ] Test with various text sizes

- [ ] Add scrolling support (AC3)
  - [ ] Implement viewport management
  - [ ] Add scroll position tracking
  - [ ] Create scroll indicators
  - [ ] Handle cursor-follow scrolling
  - [ ] Test overflow scenarios

- [ ] Implement editing features (AC4)
  - [ ] Add selection support (if feasible)
  - [ ] Implement clipboard operations
  - [ ] Add undo/redo stack
  - [ ] Handle special characters
  - [ ] Test edge cases

- [ ] Update SpawnDialog integration (AC5)
  - [ ] Replace TextInput with new component
  - [ ] Update keyboard handlers
  - [ ] Modify UI layout if needed
  - [ ] Update documentation
  - [ ] Test full integration

## Dev Notes

### Technical Challenges

1. **Terminal Limitations:**
   - Not all terminals support advanced text operations
   - Selection might not be possible in some environments
   - Need graceful degradation

2. **Ink Framework Constraints:**
   - Limited built-in multi-line support
   - May need custom rendering logic
   - Performance considerations for large texts

### Implementation Options

**Option 1: Use ink-textarea (if compatible)**
```typescript
import Textarea from 'ink-textarea';

<Textarea
  value={text}
  onChange={setText}
  onSubmit={handleSubmit}
  minHeight={3}
  maxHeight={10}
/>
```

**Option 2: Custom Implementation**
```typescript
interface MultilineState {
  lines: string[];
  cursorLine: number;
  cursorColumn: number;
  scrollOffset: number;
}

const MultilineInput: React.FC = () => {
  const [state, setState] = useState<MultilineState>({
    lines: [''],
    cursorLine: 0,
    cursorColumn: 0,
    scrollOffset: 0
  });
  
  // Custom rendering and input handling
};
```

### Key Behaviors to Maintain

From current SpawnDialog:
- Auto-focus on open
- Clear on submission
- Escape to cancel
- Error state handling
- Character/line counting
- Loading state during submission

### Testing Considerations

```typescript
// Test cases for multi-line input
describe('MultilineTextInput', () => {
  it('should handle line breaks with Enter key');
  it('should navigate between lines with arrow keys');
  it('should scroll when content exceeds viewport');
  it('should maintain cursor position during edits');
  it('should handle paste of multi-line content');
});
```

### Performance Optimization

- Virtualize rendering for very long texts
- Debounce character counting
- Limit syntax highlighting (if added)
- Efficient diff algorithm for updates

## Definition of Done

- [ ] Multi-line text input fully functional
- [ ] All navigation keys working correctly
- [ ] Scrolling smooth and responsive
- [ ] No regression in existing SpawnDialog features
- [ ] Keyboard shortcuts documented and working
- [ ] Tested in multiple terminal emulators
- [ ] Performance acceptable with 100+ lines
- [ ] Unit tests covering new functionality
- [ ] Integration tests passing
- [ ] Code reviewed and approved

## Status
**Ready for Development**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial story creation based on US047 QA findings | QA Agent Quinn |

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