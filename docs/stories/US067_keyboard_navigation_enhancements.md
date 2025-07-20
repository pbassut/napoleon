# US067: Keyboard Navigation Enhancements

## Epic
**Epic 8: Napoleon UI Specification Implementation**

## Story
**As a** Napoleon power user,
**I want** comprehensive keyboard shortcuts including Vim bindings,
**so that** I can navigate the interface efficiently without reaching for the mouse.

## Description
Enhance the keyboard navigation system to include Vim-style bindings (j/k for navigation), page-based scrolling (Page Up/Down), and quick navigation shortcuts (G/g for bottom/top). This provides a more efficient navigation experience for power users familiar with terminal applications.

## Priority
**MEDIUM** - Improves power user efficiency

## Acceptance Criteria

### AC1: Vim-Style Navigation
- `j` moves selection/scroll down (in addition to arrow down)
- `k` moves selection/scroll up (in addition to arrow up)
- Vim bindings work in both agent list and detail view
- Original arrow keys continue to work

### AC2: Page-Based Scrolling (Detail View)
- `Page Up` scrolls up one page of logs
- `Page Down` scrolls down one page of logs
- Page size equals terminal height minus UI chrome
- Maintain scroll position indicator

### AC3: Quick Navigation Shortcuts (Detail View)
- `G` (shift+g) jumps to bottom and enables auto-scroll
- `g` jumps to top and disables auto-scroll
- Visual feedback when auto-scroll is toggled
- Scroll position updates immediately

### AC4: Universal Shortcuts
- `Esc` consistently returns to previous view or cancels operation
- `Enter` consistently confirms selection or action
- `q` returns to previous view (in addition to Esc)
- Shortcuts work regardless of component focus

### AC5: Help System
- `?` displays keyboard shortcuts overlay
- Overlay shows all available shortcuts for current view
- `Esc` or `?` closes help overlay
- Help organized by category (Navigation, Actions, etc.)

## Tasks/Subtasks

- [ ] Implement Vim Bindings (AC1)
  - [ ] Extend useInput hook to handle j/k keys
  - [ ] Add vim binding support to AgentList navigation
  - [ ] Add vim binding support to DetailView scrolling
  - [ ] Ensure compatibility with existing arrow key handlers

- [ ] Add Page-Based Scrolling (AC2)
  - [ ] Calculate page size based on terminal dimensions
  - [ ] Implement Page Up scrolling logic
  - [ ] Implement Page Down scrolling logic
  - [ ] Update scroll position indicators

- [ ] Create Quick Navigation (AC3)
  - [ ] Implement jump to bottom with auto-scroll enable
  - [ ] Implement jump to top with auto-scroll disable
  - [ ] Add visual feedback for auto-scroll state
  - [ ] Handle edge cases for empty logs

- [ ] Standardize Universal Shortcuts (AC4)
  - [ ] Create central keyboard handler utility
  - [ ] Implement consistent Esc behavior across components
  - [ ] Add q as alternative to Esc in sub-views
  - [ ] Ensure Enter works consistently

- [ ] Build Help Overlay System (AC5)
  - [ ] Create HelpOverlay component
  - [ ] Define help content for each view
  - [ ] Implement help toggle with ? key
  - [ ] Style help overlay for readability

- [ ] Testing and Documentation
  - [ ] Unit tests for keyboard handlers
  - [ ] Integration tests for navigation flows
  - [ ] Create keyboard shortcut documentation
  - [ ] Test across different terminal emulators

## Dev Notes

### UI Specification Context
[Source: docs/napoleon-ui-specification/8-accessibility-usability.md#keyboard-navigation]
[Source: docs/napoleon-ui-specification/3-agent-detail-view-log-viewer.md#navigation-controls]

The specification emphasizes keyboard-first interaction with support for both standard and power user (Vim) bindings.

### Implementation Architecture

**Keyboard Handling Structure:**
```
src/ui/ink/
├── hooks/
│   ├── useKeyboardNavigation.ts  # Central keyboard handling
│   ├── useVimBindings.ts         # Vim-specific handlers
│   └── useShortcuts.ts           # Shortcut registration
├── components/
│   ├── HelpOverlay/
│   │   ├── HelpOverlay.tsx       # Help display component
│   │   └── shortcuts.ts          # Shortcut definitions
│   └── KeyboardHandler.tsx       # Global keyboard handler
```

### Keyboard Handler Design

**Central Handler Pattern:**
```typescript
interface KeyboardShortcut {
  key: string;
  modifiers?: string[];
  description: string;
  handler: () => void;
  context: 'global' | 'agentList' | 'detailView';
}

const shortcuts: KeyboardShortcut[] = [
  {
    key: 'j',
    description: 'Move down',
    handler: () => navigateDown(),
    context: 'global'
  },
  // ... more shortcuts
];
```

### Vim Bindings Implementation

**Key Mapping:**
```typescript
const vimBindings = {
  'j': 'down',
  'k': 'up',
  'h': 'left',
  'l': 'right',
  'g': 'top',
  'G': 'bottom',
  '/': 'search',
  'n': 'next',
  'N': 'previous'
};
```

### Page Scrolling Calculation

**Dynamic Page Size:**
```typescript
const calculatePageSize = () => {
  const terminalHeight = process.stdout.rows;
  const uiChromeHeight = 6; // Header + footer
  return Math.max(1, terminalHeight - uiChromeHeight);
};
```

### Help Overlay Design

**Layout Structure:**
```
┌─────────────────────── Keyboard Shortcuts ───────────────────────┐
│                                                                   │
│  Navigation                    Actions                            │
│  ─────────────────────────    ─────────────────────────         │
│  ↑/k    Move up               n       New agent                  │
│  ↓/j    Move down             d       Delete agent               │
│  Enter  Select/Inspect        q/Esc   Back/Quit                  │
│  g      Jump to top           /       Search                     │
│  G      Jump to bottom        ?       Toggle help                │
│                                                                   │
│  Detail View                                                      │
│  ─────────────────────────                                       │
│  Page Up    Scroll page up                                       │
│  Page Down  Scroll page down                                     │
│  f          Toggle follow mode                                   │
│                                                                   │
│                         [Esc] Close Help                          │
└───────────────────────────────────────────────────────────────────┘
```

### Auto-scroll Integration

**G/g Behavior:**
- `G`: Jump to bottom + set followMode = true
- `g`: Jump to top + set followMode = false
- Update follow mode indicator in UI
- Trigger immediate scroll position update

### Event Priority

**Handler Order:**
1. Text input fields (highest priority)
2. Modal/dialog handlers
3. View-specific shortcuts
4. Global shortcuts
5. Vim bindings (lowest priority)

## Testing

### Testing Strategy
- Unit tests for keyboard event handling
- Integration tests for navigation flows
- Manual testing with different keyboard layouts
- Accessibility testing with screen readers

### Test Cases
1. All Vim bindings trigger correct actions
2. Page scrolling calculates correct size
3. G/g properly toggle auto-scroll
4. Help overlay displays and dismisses correctly
5. Shortcuts don't conflict with text input
6. Universal shortcuts work in all contexts

## Status
**Draft**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial keyboard navigation enhancements story | Bob (Scrum Master) |

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