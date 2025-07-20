# US030: Agent Spawn Dialog Input Duplication Bug

## Epic
**Epic 3: Advanced Terminal UI & Process Management**

## Story
As a developer,
I want the agent spawn dialog to handle input correctly on repeated uses,
so that keystrokes don't get duplicated causing double input and creating multiple unintended agents.

## Description
This story addresses a critical input handling bug in the agent spawn dialog that occurs when the modal is used multiple times in a session. The bug manifests as:

1. **Current Broken Behavior**: On second and subsequent modal uses, keystrokes get duplicated
2. **User Impact**: Typing "hello" results in "hheelllloo" appearing in the input field
3. **Critical Consequence**: Users accidentally create multiple agents due to duplicated input
4. **Root Cause**: Event listeners are being attached multiple times without proper cleanup

This creates a severe usability issue where the dialog becomes increasingly unusable with each use, potentially leading to resource exhaustion and unintended agent creation.

## Priority
**Critical** - Data integrity and resource management bug

## Acceptance Criteria

### AC1: Clean Input on Each Modal Use
- First modal use has normal, single-character input behavior
- Second modal use has identical input behavior to first use
- Subsequent modal uses continue to work correctly
- No character duplication regardless of how many times modal is used

### AC2: Proper Event Listener Management
- Event listeners are attached only once per modal instance
- Previous event listeners are removed before attaching new ones
- Modal cleanup removes all attached event listeners
- No memory leaks from accumulated event listeners

### AC3: Input Field Reset and Cleanup
- Input field is properly cleared when modal opens
- Previous input values don't affect new modal sessions
- Cursor position is reset to beginning of input field
- Input field state is completely reset between uses

### AC4: Prevention of Duplicate Agent Creation
- Users cannot accidentally create multiple agents due to input duplication
- Input validation works correctly regardless of modal use count
- Spawn action triggers only once per user intention
- Clear feedback prevents user confusion about agent creation

## Technical Requirements

### Event Listener Management
```javascript
// Proper event listener cleanup and attachment
class AgentSpawnDialog {
  constructor(parent, onSpawn, onCancel) {
    this.parent = parent;
    this.onSpawn = onSpawn;
    this.onCancel = onCancel;
    this.dialog = null;
    this.textbox = null;
    this.eventListenersAttached = false; // Track listener state
    this.activeEventHandlers = new Map(); // Track active handlers
  }

  setupEventHandlers() {
    // Prevent multiple event listener attachment
    if (this.eventListenersAttached) {
      logger.debug('Event listeners already attached, skipping setup');
      return;
    }

    // Clean up any existing handlers first
    this.removeEventHandlers();

    try {
      // Create handler functions with proper binding
      const enterHandler = this.handleEnterKey.bind(this);
      const shiftEnterHandler = this.handleShiftEnterKey.bind(this);
      const escapeHandler = this.handleEscapeKey.bind(this);

      // Store handlers for cleanup
      this.activeEventHandlers.set('enter', enterHandler);
      this.activeEventHandlers.set('S-enter', shiftEnterHandler);
      this.activeEventHandlers.set('escape', escapeHandler);

      // Attach event listeners
      this.textbox.key(['enter'], enterHandler);
      this.textbox.key(['S-enter'], shiftEnterHandler);
      this.textbox.key(['escape'], escapeHandler);

      this.eventListenersAttached = true;
      logger.debug('Event handlers attached successfully');

    } catch (error) {
      logger.error('Failed to setup event handlers', {
        error: error.message,
        hasTextbox: !!this.textbox
      });
    }
  }

  removeEventHandlers() {
    if (!this.textbox || !this.eventListenersAttached) {
      return;
    }

    try {
      // Remove all stored event handlers
      this.activeEventHandlers.forEach((handler, key) => {
        this.textbox.removeKey(key, handler);
      });

      // Clear handler storage
      this.activeEventHandlers.clear();
      this.eventListenersAttached = false;

      logger.debug('Event handlers removed successfully');

    } catch (error) {
      logger.error('Failed to remove event handlers', {
        error: error.message
      });
      // Force reset state even if removal fails
      this.activeEventHandlers.clear();
      this.eventListenersAttached = false;
    }
  }
}
```

### Input Field Reset and Cleanup
```javascript
// Comprehensive input field reset
resetInputField() {
  if (!this.textbox) {
    return;
  }

  try {
    // Clear any existing value
    this.textbox.setValue('');
    
    // Reset cursor position
    this.textbox.cursor.x = 0;
    this.textbox.cursor.y = 0;
    
    // Clear any input history or state
    if (this.textbox.clearValue) {
      this.textbox.clearValue();
    }
    
    // Reset any internal blessed state
    if (this.textbox._done) {
      this.textbox._done = false;
    }
    
    // Force render to update display
    this.textbox.render();
    
    logger.debug('Input field reset successfully');

  } catch (error) {
    logger.error('Failed to reset input field', {
      error: error.message
    });
  }
}

// Enhanced show method with proper reset
show() {
  if (this.isVisible) {
    logger.debug('Dialog already visible, focusing textbox');
    this.focusTextbox();
    return;
  }

  try {
    // Reset input field completely
    this.resetInputField();
    
    // Remove any existing event handlers
    this.removeEventHandlers();
    
    // Show dialog
    this.dialog.show();
    this.isVisible = true;
    
    // Setup fresh event handlers
    this.setupEventHandlers();
    
    // Focus textbox with clean state
    this.focusTextbox();
    
    // Render parent to ensure display
    if (this.parent && typeof this.parent.render === 'function') {
      this.parent.render();
    }

    logger.debug('Agent spawn dialog shown successfully');

  } catch (error) {
    logger.error('Failed to show agent spawn dialog', {
      error: error.message,
      stack: error.stack
    });
  }
}
```

### Modal Lifecycle Management
```javascript
// Enhanced hide method with complete cleanup
hide() {
  if (!this.isVisible || !this.dialog) {
    return;
  }

  try {
    // Remove all event handlers
    this.removeEventHandlers();
    
    // Clear any active timers
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();

    // Clear focus restore timeout
    if (this.focusRestoreTimeout) {
      clearTimeout(this.focusRestoreTimeout);
      this.focusRestoreTimeout = null;
    }

    // Reset input field state
    this.resetInputField();

    // Hide the dialog
    this.dialog.hide();
    this.isVisible = false;

    // Trigger parent render
    if (this.parent && typeof this.parent.render === 'function') {
      this.parent.render();
    }

    logger.debug('Agent spawn dialog hidden with complete cleanup');

  } catch (error) {
    logger.error('Error hiding agent spawn dialog', {
      error: error.message,
      stack: error.stack
    });
    // Ensure cleanup even if hide fails
    this.isVisible = false;
    this.eventListenersAttached = false;
    this.activeEventHandlers.clear();
  }
}

// Proper dialog destruction
destroy() {
  try {
    // Remove all event handlers
    this.removeEventHandlers();
    
    // Clear all timers
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();
    
    if (this.focusRestoreTimeout) {
      clearTimeout(this.focusRestoreTimeout);
      this.focusRestoreTimeout = null;
    }

    // Destroy blessed elements
    if (this.dialog) {
      this.dialog.destroy();
      this.dialog = null;
    }
    
    this.textbox = null;
    this.instructionsText = null;
    this.isVisible = false;
    this.eventListenersAttached = false;
    this.activeEventHandlers.clear();

    logger.debug('Agent spawn dialog destroyed successfully');

  } catch (error) {
    logger.error('Error destroying agent spawn dialog', {
      error: error.message
    });
  }
}
```

### Event Handler Implementation
```javascript
// Individual event handlers with proper this binding
handleEnterKey() {
  if (!this.isShiftPressed) {
    this.handleSpawnAgent();
  } else {
    // Allow multi-line input with Shift+Enter
    const currentValue = this.textbox.getValue();
    this.textbox.setValue(`${currentValue}\n`);
  }
}

handleShiftEnterKey() {
  const currentValue = this.textbox.getValue();
  this.textbox.setValue(`${currentValue}\n`);
}

handleEscapeKey() {
  this.handleCancel();
}

// Enhanced spawn handler with duplication prevention
handleSpawnAgent() {
  // Prevent multiple simultaneous spawn attempts
  if (this.isSpawning) {
    logger.debug('Agent spawn already in progress, ignoring duplicate request');
    return;
  }

  try {
    this.isSpawning = true;
    
    const instructions = this.textbox.getValue().trim();
    if (!this.validateInstructions(instructions)) {
      this.isSpawning = false;
      return;
    }

    // Hide modal immediately (per US029)
    this.hide();
    
    // Restore focus
    this.restoreFocusToParent();

    // Start agent creation
    this.onSpawn(instructions);

  } catch (error) {
    logger.error('Agent spawn failed', {
      error: error.message
    });
    this.showError(`Failed to spawn agent: ${error.message}`);
  } finally {
    // Reset spawn flag after delay to prevent rapid-fire clicks
    setTimeout(() => {
      this.isSpawning = false;
    }, 1000);
  }
}
```

## Dev Notes

### Root Cause Analysis
- Event listeners are being attached multiple times without removal
- Blessed framework doesn't automatically clean up event handlers
- Modal reuse without proper cleanup accumulates event handlers
- Each use doubles the number of event listeners, causing input duplication

### Previous Story Connections
- US028 added new keyboard shortcuts but may have introduced event handler issues
- US027 focused on focus recovery but didn't address event listener lifecycle
- US029 addresses modal close timing but doesn't fix input duplication

### Technical Implementation Details
- **Event Listener Management**: Blessed framework requires manual event listener cleanup [Source: architecture/tech-stack-alignment.md#blessed]
- **Modal Lifecycle**: Proper show/hide cycles must include complete state reset [Source: architecture/component-architecture.md#ui-lifecycle]
- **Memory Management**: Accumulated event handlers can cause memory leaks [Source: architecture/coding-standards-and-conventions.md#memory-management]
- **Input Validation**: Duplication prevention must work with validation logic [Source: US028]

### File Locations
- Main implementation: `src/ui/components/agent-spawn-dialog.js` [Source: architecture/source-tree-integration.md#ui-components]
- Testing: `__tests__/agent-spawn-dialog.test.js` [Source: architecture/testing-strategy.md#test-structure]

### Testing Requirements
- Unit tests for event listener attachment and removal [Source: architecture/testing-strategy.md#unit-testing]
- Input behavior testing across multiple modal uses [Source: architecture/testing-strategy.md#ui-testing]
- Memory leak detection for event handler accumulation [Source: architecture/testing-strategy.md#performance-testing]
- Integration tests for modal lifecycle management [Source: architecture/testing-strategy.md#integration-testing]

### Technical Constraints
- Blessed framework event system requires careful management [Source: architecture/tech-stack-alignment.md#blessed]
- Event handler cleanup must not break other UI functionality [Source: architecture/component-architecture.md#ui-interactions]
- Modal reuse must maintain performance characteristics [Source: docs/prd.md#non-functional-requirements]
- Input behavior must remain consistent across platform differences [Source: architecture/tech-stack-alignment.md#compatibility]

## Tasks / Subtasks

1. **Implement Event Listener Management** (AC: 2)
   - [ ] Add event listener attachment/removal tracking
   - [ ] Create removeEventHandlers method for cleanup
   - [ ] Implement proper handler storage and cleanup
   - [ ] Test event listener lifecycle across modal uses

2. **Enhanced Modal Lifecycle Methods** (AC: 1, 3)
   - [ ] Update show() method to reset input field and event handlers
   - [ ] Update hide() method to clean up all event handlers
   - [ ] Add proper destroy() method for complete cleanup
   - [ ] Test modal lifecycle with repeated show/hide cycles

3. **Input Field Reset Implementation** (AC: 3)
   - [ ] Create comprehensive input field reset method
   - [ ] Clear input value, cursor position, and internal state
   - [ ] Reset any blessed-specific input state
   - [ ] Test input field reset across different input scenarios

4. **Duplication Prevention Mechanisms** (AC: 4)
   - [ ] Add spawn action debouncing to prevent rapid-fire creation
   - [ ] Implement proper spawn state tracking
   - [ ] Ensure input validation works with cleaned input
   - [ ] Test prevention of accidental multiple agent creation

5. **Enhanced Event Handlers** (AC: 1, 2)
   - [ ] Create individual event handler methods with proper binding
   - [ ] Implement handler storage for selective removal
   - [ ] Add error handling for event handler operations
   - [ ] Test event handlers work correctly across modal reuse

6. **Testing and Validation** (All ACs)
   - [ ] Create unit tests for event listener management
   - [ ] Test input behavior across multiple modal uses
   - [ ] Memory leak testing for event handler accumulation
   - [ ] Integration tests for complete modal lifecycle
   - [ ] Cross-platform input behavior validation

## Definition of Done
- [ ] Input field behaves identically on first and subsequent modal uses
- [ ] No character duplication regardless of modal use count
- [ ] Event listeners are properly managed with attachment and removal
- [ ] Input field is completely reset between modal sessions
- [ ] Users cannot accidentally create multiple agents due to input issues
- [ ] Unit tests cover event listener lifecycle and input behavior
- [ ] Integration tests validate modal reuse scenarios
- [ ] Memory usage remains stable across multiple modal uses

## Notes
- Critical bug affecting data integrity and user experience
- Event listener management is crucial for UI component reuse
- Input duplication can lead to resource exhaustion and user confusion
- Proper cleanup prevents memory leaks and performance degradation
- Must work seamlessly with keyboard shortcuts from US028

## Related Stories
- US028: Spawn Dialog UX Improvements (keyboard shortcuts that may be affected)
- US029: Agent Spawn Dialog Modal Close Bug (related modal lifecycle issues)
- US027: Terminal Focus Recovery After Agent Spawning (focus management integration)
- US013: Agent Spawning Core Functionality (core spawning logic)

## Approval Status

**Status:** ❌ Closed - Won't Do

**Priority:** CRITICAL

**Created:** 2025-07-18

**Closed Date:** 2025-07-20

**Closed by:** Scrum Master Bob

**Reason:** Resolved with Ink migration - input handling works correctly in new UI implementation (US047)

**Bug Classification:** Data Integrity - Input Handling

**Impact:** High - Affects modal reusability and can cause accidental agent creation

**Effort Estimate:** Medium - Requires event listener architecture changes and comprehensive testing

## Dev Agent Record

**Agent Model Used**: Sonnet 4

**Bug Analysis**:
- Keystrokes get duplicated on second and subsequent modal uses
- Event listeners accumulate without proper cleanup
- Users accidentally create multiple agents due to input duplication
- Root cause is blessed framework event handler management

**File List**:
- src/ui/components/agent-spawn-dialog.js (primary fix location)
- __tests__/agent-spawn-dialog.test.js (test updates)

**Change Log**:
- 2025-07-18: Bug story created for input duplication issue
- 2025-07-18: Identified root cause as event listener accumulation
- 2025-07-18: Defined solution approach with proper event handler lifecycle management