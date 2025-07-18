# US028: Spawn Dialog UX Improvements

## Epic
**Epic 3: Advanced Terminal UI & Process Management**

## Story
As a developer,
I want an improved agent spawn dialog with intuitive keyboard shortcuts and flexible prompt validation,
so that I can efficiently spawn agents with a natural user experience.

## Description
This story addresses two important UX improvements in the agent spawn dialog:

1. **Keyboard Shortcut Improvement**: Replace the non-intuitive Ctrl+S shortcut with Enter for agent spawning, providing a more natural interaction pattern
2. **Prompt Validation Flexibility**: Remove the arbitrary 10-character minimum requirement to allow simple messages like "hi" or brief commands

These improvements will make Napoleon more intuitive and user-friendly by following standard UI conventions.

## Priority
**High** - Significant UX improvements for better user experience

## Acceptance Criteria

### AC1: Intuitive Keyboard Shortcuts
- Enter key spawns agents instead of Ctrl+S
- Shift+Enter allows multi-line input for complex instructions
- Escape key cancels dialog (unchanged)
- Footer text updated to reflect new keyboard shortcuts
- Existing Ctrl+S shortcut removed completely

### AC2: Flexible Prompt Validation
- Remove 10-character minimum requirement for agent instructions
- Allow simple prompts like "hi", "test", or single-word commands
- Empty prompt validation remains (cannot be blank)
- Whitespace-only prompts are rejected
- Instructions text updated to remove minimum character reference

### AC3: User Experience Consistency
- Dialog behavior follows standard UI conventions
- Keyboard shortcuts align with user expectations
- Clear feedback for all user interactions
- Consistent behavior across all dialog operations
- No user interaction required to recover from focus errors
- Dialog maintains responsiveness under all error conditions

## Technical Requirements

### Enhanced Keyboard Handling
```javascript
// Updated keyboard shortcuts for spawn dialog
setupEventHandlers() {
  // Handle Enter to spawn agent (primary action)
  this.textbox.key(['enter'], () => {
    // Only spawn if not holding Shift for multi-line
    if (!this.isShiftPressed) {
      this.handleSpawnAgent();
    } else {
      // Allow multi-line input with Shift+Enter
      const currentValue = this.textbox.getValue();
      this.textbox.setValue(`${currentValue}\n`);
    }
  });

  // Handle Shift+Enter for multi-line input
  this.textbox.key(['S-enter'], () => {
    const currentValue = this.textbox.getValue();
    this.textbox.setValue(`${currentValue}\n`);
  });

  // Remove Ctrl+S shortcut completely
  // this.textbox.key(['C-s'], () => { ... }); // REMOVED

  // Handle Escape to cancel (unchanged)
  this.textbox.key(['escape'], () => {
    this.handleCancel();
  });

  // Track shift key state for Enter handling
  this.textbox.on('keypress', (ch, key) => {
    this.isShiftPressed = key && key.shift;
  });
}
```

### Simplified Validation Logic
```javascript
// Updated validation without character minimum
validateInstructions(instructions) {
  // Check for empty or whitespace-only input
  if (!instructions || instructions.trim().length === 0) {
    this.showError('Please enter instructions for the agent');
    return false;
  }

  // Remove minimum character requirement
  // No additional validation needed - allow any non-empty input
  return true;
}
```

### Defensive Focus Management
```javascript
// Enhanced focus management with crash prevention
setFocusWithRetry(element, retries = 3) {
  if (!element || retries <= 0) {
    logger.debug('Focus retry exhausted or invalid element');
    return false;
  }

  try {
    // Comprehensive element validation
    if (!this.isValidFocusableElement(element)) {
      logger.warn('Element is not focusable', {
        elementType: element ? element.constructor.name : 'null',
        hasFocusMethod: element && typeof element.focus === 'function',
        isScreenElement: element && element.screen !== undefined
      });
      return false;
    }

    // Safe focus call with error handling
    element.focus();
    
    // Verify focus was set correctly
    const verifyTimer = setTimeout(() => {
      if (this.isValidParent() && element !== this.parent.focused) {
        this.setFocusWithRetry(element, retries - 1);
      }
    }, 10);

    return true;

  } catch (error) {
    logger.error('Focus setting failed', {
      error: error.message,
      elementType: element ? element.constructor.name : 'null',
      retries: retries - 1,
      stack: error.stack
    });

    // Retry with exponential backoff
    setTimeout(() => {
      this.setFocusWithRetry(element, retries - 1);
    }, Math.pow(2, 4 - retries) * 10);

    return false;
  }
}

// Element validation helper
isValidFocusableElement(element) {
  return element && 
         typeof element === 'object' && 
         typeof element.focus === 'function' &&
         !element.destroyed &&
         element.screen;
}

// Parent validation helper
isValidParent() {
  return this.parent && 
         typeof this.parent === 'object' &&
         !this.parent.destroyed &&
         this.parent.screen;
}

// Enhanced parent focus restoration
restoreFocusToParent() {
  try {
    // Clear any existing timeout
    if (this.focusRestoreTimeout) {
      clearTimeout(this.focusRestoreTimeout);
      this.focusRestoreTimeout = null;
    }

    // Validate parent before attempting focus
    if (!this.isValidParent()) {
      logger.warn('Parent is invalid for focus restoration', {
        hasParent: !!this.parent,
        parentType: this.parent ? this.parent.constructor.name : 'null'
      });
      return;
    }

    // Immediate focus restoration with validation
    const focusSuccess = this.setFocusWithRetry(this.parent);
    
    if (!focusSuccess) {
      // Fallback: set focused property directly for blessed screen
      if (this.parent.screen && this.parent === this.parent.screen) {
        this.parent.focused = this.parent;
        logger.debug('Used direct focus assignment fallback');
      }
    }

    // Backup focus restoration after render
    this.focusRestoreTimeout = setTimeout(() => {
      this.ensureParentFocus();
    }, 50);

  } catch (error) {
    logger.error('Critical error in focus restoration', {
      error: error.message,
      stack: error.stack
    });
    // Do not re-throw - prevent crashes
  }
}

// Safe parent focus validation
ensureParentFocus() {
  try {
    if (!this.isValidParent()) {
      return;
    }

    // Check current focus state
    if (this.parent.focused !== this.parent) {
      logger.debug('Parent focus lost, attempting restoration');

      // Try standard focus method first
      if (typeof this.parent.focus === 'function') {
        this.parent.focus();
      } else if (this.parent.screen) {
        // Fallback for blessed screen objects
        this.parent.focused = this.parent;
      } else {
        logger.warn('Unable to restore parent focus - no valid method available');
        return;
      }

      // Force render to reflect focus state
      setTimeout(() => {
        if (this.isValidParent()) {
          this.parent.render();
        }
      }, 10);
    }

  } catch (error) {
    logger.error('Error in parent focus validation', {
      error: error.message
    });
    // Do not re-throw - prevent crashes
  }
}
```

### Updated UI Text and Instructions
```javascript
// Updated instructions text
this.instructionsText = blessed.text({
  parent: this.dialog,
  top: 1,
  left: 2,
  width: '100%-4',
  height: 5,
  content: [
    'Enter instructions for the Claude agent:',
    '',
    '• Be specific about the task you want the agent to perform',
    '• Include any relevant context or constraints',
    '• Any non-empty instruction is valid (no minimum length)',
    '• Agent will work in isolated git worktree in .napoleon-worktrees/',
  ].join('\n'),
  style: {
    fg: 'cyan',
  },
});

// Updated footer text
this.footer = blessed.text({
  parent: this.dialog,
  top: 15,
  left: 2,
  width: '100%-4',
  height: 1,
  content: 'Press Enter to spawn agent | Shift+Enter for new line | Escape to cancel',
  style: {
    fg: 'yellow',
    bold: true,
  },
  align: 'center',
});
```

## Dev Notes

### Previous Story Insights
- US027 implemented focus recovery mechanisms but didn't address the specific fatal crash scenario
- US013 established core agent spawning functionality that this story enhances
- US012 created the blessed framework foundation that requires careful focus handling

### Technical Implementation Details
- **Keyboard Events**: Blessed framework key handling requires careful event management to distinguish Enter vs Shift+Enter [Source: architecture/tech-stack-alignment.md#blessed]
- **Focus Management**: Blessed elements have inconsistent focus method availability requiring defensive programming [Source: architecture/component-architecture.md#ui-interactions]  
- **Error Prevention**: Terminal UI crashes can lose all user work, requiring comprehensive error handling [Source: architecture/coding-standards-and-conventions.md#error-handling]
- **UI Responsiveness**: Changes must maintain sub-100ms response times for keyboard interactions [Source: docs/prd.md#non-functional-requirements]

### File Locations
- Main implementation: `src/ui/components/agent-spawn-dialog.js` [Source: architecture/source-tree-integration.md#ui-components]
- UI integration: `src/ui/index.js` [Source: architecture/source-tree-integration.md#ui-directory]
- Error handling utilities: `src/utils/logger.js` [Source: architecture/source-tree-integration.md#utils-directory]

### Testing Requirements
- Unit tests for keyboard event handling and validation changes [Source: architecture/testing-strategy.md#unit-testing]
- Focus management error condition testing [Source: architecture/testing-strategy.md#integration-testing]
- Crash prevention testing with invalid focus scenarios [Source: architecture/testing-strategy.md#regression-testing]
- Cross-platform keyboard behavior validation [Source: architecture/testing-strategy.md#cross-platform]

### Technical Constraints
- Blessed framework focus limitations require workarounds [Source: architecture/tech-stack-alignment.md#blessed]
- Keyboard event handling varies by terminal type [Source: architecture/tech-stack-alignment.md#compatibility]
- Error handling must not impact UI performance [Source: docs/prd.md#non-functional-requirements]
- Focus recovery must work with existing UI patterns [Source: architecture/component-architecture.md#ui-interactions]

## Tasks / Subtasks

1. **Update Keyboard Shortcut Handling** (AC: 1)
   - Replace Ctrl+S with Enter for agent spawning
   - Implement Shift+Enter for multi-line input
   - Update footer text to reflect new shortcuts
   - Remove all references to Ctrl+S shortcut
   - Add unit tests for new keyboard event handling

2. **Simplify Prompt Validation** (AC: 2)
   - Remove 10-character minimum requirement from validation
   - Update instructions text to remove character limit reference
   - Maintain empty/whitespace-only validation
   - Test with various short prompt scenarios
   - Update error messages for new validation rules

3. **Implement Defensive Focus Management** (AC: 3, 4)
   - Add comprehensive element validation before focus calls
   - Implement safe focus restoration with multiple fallbacks
   - Add proper error handling for all focus operations
   - Create helper methods for focus validation
   - Prevent application crashes during focus failures

4. **Enhanced Error Handling and Logging** (AC: 4)
   - Add detailed error logging for focus-related failures
   - Implement non-blocking error recovery mechanisms
   - Create user-friendly error messages
   - Add debugging information for development
   - Test error conditions don't crash application

5. **Testing and Validation** (AC: 5, All)
   - Create unit tests for all keyboard shortcut changes
   - Test focus management under error conditions
   - Validate crash prevention with invalid focus scenarios
   - Test cross-platform keyboard behavior
   - Integration tests for complete spawn workflow

## Definition of Done
- [ ] Enter key spawns agents (Ctrl+S completely removed)
- [ ] Shift+Enter creates new lines for multi-line input
- [ ] 10-character minimum validation requirement removed
- [ ] Simple prompts like "hi" and "test" are accepted
- [ ] Footer text updated to show Enter/Shift+Enter/Escape shortcuts
- [ ] Instructions text updated to remove character minimum reference
- [ ] All keyboard shortcuts work consistently across dialog states
- [ ] Unit tests cover keyboard event changes and validation updates
- [ ] Integration tests validate new keyboard behavior and flexible validation

## Notes
- Keyboard shortcut changes follow standard UI conventions (Enter to submit)
- Flexible validation improves user experience for simple commands
- These changes make Napoleon more intuitive and user-friendly
- Validation changes remove unnecessary UX friction
- Enter key is more intuitive than Ctrl+S for form submission

## Related Stories
- US027: Terminal Focus Recovery After Agent Spawning (related focus management)
- US013: Agent Spawning Core Functionality (core functionality being enhanced)
- US012: Basic Terminal UI Foundation (blessed framework patterns)
- US024: Enhanced Keyboard Shortcuts and Navigation (overall keyboard experience)

## Approval Status

**Status:** Draft - Ready for Review

**Priority:** HIGH

**Created:** 2025-07-18

**Story Notes:**
- Important UX improvements for better user experience
- Addresses two specific user-reported issues in spawn dialog
- Enhanced keyboard interaction patterns following UI conventions
- Flexible validation removes unnecessary user friction
- Focus crash issue has been resolved separately