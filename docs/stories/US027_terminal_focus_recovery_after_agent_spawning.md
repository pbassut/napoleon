# US027: Terminal Focus Recovery After Agent Spawning

## Epic
**Epic 3: Advanced Terminal UI & Process Management**

## Story
As a developer,
I want the terminal UI to maintain keyboard focus after spawning an agent,
so that I can continue using keyboard shortcuts without manually clicking to regain focus.

## Description
This story addresses a critical UX issue where the terminal loses keyboard focus after agent spawning, breaking the keyboard-driven workflow. When a user spawns an agent, the terminal becomes unresponsive to keyboard input, requiring a manual mouse click to regain focus and continue using keyboard shortcuts like 'n' for spawning new agents. This issue disrupts the intended keyboard-centric workflow and creates user frustration.

## Priority
**High** - Critical UX issue affecting keyboard-driven workflow

## Acceptance Criteria

### AC1: Focus Retention During Agent Spawning
- Terminal UI maintains keyboard focus throughout the entire agent spawning process
- No mouse click required to regain keyboard responsiveness after spawning
- All keyboard shortcuts remain functional immediately after agent spawning completes

### AC2: Dialog Focus Management
- Agent spawn dialog properly manages focus transitions between main UI and dialog
- Focus returns to main UI automatically when dialog closes (success or cancel)
- Screen render operations do not interrupt focus state

### AC3: Focus State Validation
- System validates focus state after all spawn dialog operations
- Focus recovery mechanisms trigger automatically if focus is lost
- Debug logging tracks focus transitions for troubleshooting

### AC4: Keyboard Workflow Continuity
- User can spawn multiple agents in sequence using only keyboard navigation
- 'n' key remains responsive immediately after previous agent spawning
- No delay or lag in keyboard responsiveness after spawning operations

### AC5: Cross-Platform Focus Behavior
- Focus management works consistently across macOS, Linux, and Windows terminals
- Blessed framework focus events are handled properly on all platforms
- Terminal resize events do not interfere with focus management

## Technical Requirements

### Focus Management Enhancement
```javascript
// Enhanced focus management for spawn dialog
class AgentSpawnDialog {
  constructor(parent, onSpawn, onCancel) {
    this.parent = parent;
    this.onSpawn = onSpawn;
    this.onCancel = onCancel;
    this.previouslyFocused = null;
    this.focusRestoreTimeout = null;
  }

  show() {
    // Store current focus state
    this.previouslyFocused = this.parent.focused;
    
    this.isVisible = true;
    this.dialog.show();
    
    // Ensure focus is properly set
    this.setFocusWithRetry(this.textbox);
    
    this.parent.render();
  }

  async handleSpawnAgent() {
    try {
      const instructions = this.textbox.getValue().trim();
      
      if (!this.validateInstructions(instructions)) {
        return;
      }

      // Call spawn callback while maintaining focus context
      if (this.onSpawn) {
        await this.onSpawn(instructions);
      }

      // Hide dialog and restore focus
      this.hideWithFocusRestore();
      
    } catch (error) {
      logger.error('Failed to spawn agent from dialog', { error: error.message });
      this.showError(`Failed to spawn agent: ${error.message}`);
    }
  }

  handleCancel() {
    this.hideWithFocusRestore();
    
    if (this.onCancel) {
      this.onCancel();
    }
  }

  hideWithFocusRestore() {
    if (this.dialog) {
      this.isVisible = false;
      this.dialog.hide();
      
      // Restore focus to main UI with retry mechanism
      this.restoreFocusToParent();
      
      this.parent.render();
    }
  }

  restoreFocusToParent() {
    // Clear any existing timeout
    if (this.focusRestoreTimeout) {
      clearTimeout(this.focusRestoreTimeout);
    }

    // Immediate focus restoration
    this.setFocusWithRetry(this.parent);

    // Backup focus restoration after render
    this.focusRestoreTimeout = setTimeout(() => {
      this.ensureParentFocus();
    }, 50);
  }

  setFocusWithRetry(element, retries = 3) {
    if (!element || retries <= 0) return;

    try {
      element.focus();
      
      // Verify focus was set correctly
      setTimeout(() => {
        if (element !== this.parent.focused) {
          this.setFocusWithRetry(element, retries - 1);
        }
      }, 10);
      
    } catch (error) {
      logger.warn('Focus setting failed, retrying', { 
        error: error.message, 
        retries: retries - 1 
      });
      
      setTimeout(() => {
        this.setFocusWithRetry(element, retries - 1);
      }, 20);
    }
  }

  ensureParentFocus() {
    // Validate that parent has focus
    if (this.parent.focused !== this.parent) {
      logger.debug('Parent focus lost, restoring');
      this.parent.focus();
      
      // Force render to ensure focus state is reflected
      setTimeout(() => {
        this.parent.render();
      }, 10);
    }
  }
}
```

### Terminal UI Focus State Management
```javascript
// Enhanced TerminalUI with focus state tracking
class TerminalUI {
  constructor() {
    // ... existing properties
    this.focusHistory = [];
    this.focusValidationInterval = null;
  }

  async initialize() {
    // ... existing initialization
    
    // Start focus validation monitoring
    this.startFocusValidation();
  }

  setupEventHandlers() {
    // ... existing event handlers

    // Enhanced focus monitoring
    this.screen.on('element focus', (element) => {
      this.trackFocusChange(element, 'gained');
    });

    this.screen.on('element blur', (element) => {
      this.trackFocusChange(element, 'lost');
    });

    // Screen render completion handler
    this.screen.on('render', () => {
      this.validateFocusAfterRender();
    });
  }

  trackFocusChange(element, action) {
    const focusEvent = {
      timestamp: Date.now(),
      element: element.constructor.name,
      action,
      focused: this.screen.focused
    };
    
    this.focusHistory.push(focusEvent);
    
    // Keep only recent history
    if (this.focusHistory.length > 20) {
      this.focusHistory.shift();
    }
    
    logger.debug('Focus change tracked', focusEvent);
  }

  validateFocusAfterRender() {
    // Ensure main screen has focus when no dialogs are active
    if (!this.hasActiveDialog() && this.screen.focused !== this.screen) {
      logger.debug('Focus lost after render, restoring to main screen');
      this.restoreMainFocus();
    }
  }

  hasActiveDialog() {
    return (this.spawnDialog && this.spawnDialog.isShown()) ||
           (this.terminationDialog && this.terminationDialog.isShown()) ||
           (this.detailView && this.detailView.isShown()) ||
           this.showingHelp;
  }

  restoreMainFocus() {
    try {
      this.screen.focus();
      
      // Validate focus restoration
      setTimeout(() => {
        if (this.screen.focused !== this.screen) {
          logger.warn('Main focus restoration failed, force focusing');
          this.screen.focused = this.screen;
          this.render();
        }
      }, 25);
      
    } catch (error) {
      logger.error('Failed to restore main focus', { error: error.message });
    }
  }

  startFocusValidation() {
    // Periodic focus validation
    this.focusValidationInterval = setInterval(() => {
      this.validateFocusState();
    }, 2000);
  }

  validateFocusState() {
    if (!this.hasActiveDialog()) {
      // Main UI should have focus
      if (this.screen.focused !== this.screen) {
        logger.debug('Focus drift detected, correcting');
        this.restoreMainFocus();
      }
    }
  }

  async handleSpawnAgent(instructions) {
    try {
      // Store focus state before spawning
      const preFocusState = this.screen.focused;
      
      const session = await this.agentManager.spawnAgent(instructions);
      logger.info('Agent spawned successfully from UI', { agentId: session.id });

      // Update UI
      this.updateAgentsList();

      // Ensure focus is maintained
      this.ensureFocusAfterSpawn(preFocusState);

      // Success feedback
      this.showSpawnSuccess(session);

    } catch (error) {
      logger.error('Failed to spawn agent from UI', { error: error.message });
      this.updateStatus(`Failed to spawn agent: ${error.message}`, { fg: 'red', bold: true });
      
      // Ensure focus is restored even on error
      this.restoreMainFocus();
    }
  }

  ensureFocusAfterSpawn(preFocusState) {
    // Verify focus state hasn't been lost
    if (this.screen.focused !== this.screen) {
      logger.debug('Focus lost during spawn, restoring');
      this.restoreMainFocus();
    }
  }

  showSpawnSuccess(session) {
    const worktreeInfo = session.worktreeName ? ` in worktree ${session.worktreeName}` : '';
    this.footerText.setContent(`Agent ${session.id} spawned successfully${worktreeInfo} | Press 'n' to spawn new agent | 'd' to terminate | '↑↓' to navigate | 'h' for help | 'q' to quit`);
    this.footerText.style.fg = 'green';
    this.render();

    // Reset footer and ensure focus
    this.setTimeout(() => {
      this.footerText.setContent('Press \'n\' to spawn new agent | \'d\' to terminate | \'Enter/i\' for details | \'↑↓\' to navigate | \'h\' for help | \'q\' to quit');
      this.footerText.style.fg = 'cyan';
      this.restoreMainFocus();
      this.render();
    }, 3000);
  }

  quit() {
    // ... existing quit logic
    
    // Stop focus validation
    if (this.focusValidationInterval) {
      clearInterval(this.focusValidationInterval);
      this.focusValidationInterval = null;
    }
    
    // ... rest of existing quit logic
  }
}
```

### Focus Debugging Utilities
```javascript
// Focus debugging and monitoring utilities
class FocusDebugger {
  constructor(screen) {
    this.screen = screen;
    this.focusLog = [];
    this.isDebugging = process.env.NAPOLEON_DEBUG_FOCUS === 'true';
  }

  logFocusState(context) {
    if (!this.isDebugging) return;

    const state = {
      timestamp: Date.now(),
      context,
      focused: this.screen.focused ? this.screen.focused.constructor.name : 'none',
      focusedElement: this.screen.focused,
      screen: this.screen.constructor.name
    };

    this.focusLog.push(state);
    logger.debug('Focus state', state);

    // Keep log size manageable
    if (this.focusLog.length > 50) {
      this.focusLog.shift();
    }
  }

  dumpFocusHistory() {
    if (this.isDebugging) {
      logger.info('Focus history dump', { history: this.focusLog });
    }
  }

  validateFocusConsistency() {
    const currentFocus = this.screen.focused;
    const expectedFocus = this.determineExpectedFocus();

    if (currentFocus !== expectedFocus) {
      logger.warn('Focus inconsistency detected', {
        current: currentFocus ? currentFocus.constructor.name : 'none',
        expected: expectedFocus ? expectedFocus.constructor.name : 'none'
      });
      return false;
    }

    return true;
  }

  determineExpectedFocus() {
    // Logic to determine what should have focus based on UI state
    return this.screen;
  }
}
```

## Dev Notes

### Previous Story Insights
- US012 established basic terminal UI foundation with blessed framework
- US013 implemented agent spawning core functionality 
- US020 enhanced agent detail view with focus management patterns

### Technical Implementation Details
- **Focus Management**: Blessed framework requires explicit focus handling during dialog transitions [Source: architecture/tech-stack-alignment.md#blessed]
- **Screen Rendering**: Blessed screen.render() operations can interrupt focus state requiring restoration [Source: architecture/component-architecture.md#ui-interactions]
- **Cross-Platform**: Terminal focus behavior varies across platforms requiring defensive programming [Source: architecture/tech-stack-alignment.md#compatibility]
- **Event Handling**: Focus events in blessed need careful sequencing with render operations [Source: architecture/coding-standards-and-conventions.md#event-handling]

### File Locations
- Enhanced spawn dialog: `src/ui/components/agent-spawn-dialog.js` [Source: architecture/source-tree-integration.md#ui-components]
- Main terminal UI: `src/ui/index.js` [Source: architecture/source-tree-integration.md#ui-directory]
- Focus debugging utilities: `src/utils/focus-debugger.js` [Source: architecture/source-tree-integration.md#utils-directory]

### Testing Requirements
- Unit tests for focus management methods [Source: architecture/testing-strategy.md#unit-testing]
- Integration tests for complete spawn workflow with focus validation [Source: architecture/testing-strategy.md#integration-testing]
- Cross-platform testing for terminal focus behavior [Source: architecture/testing-strategy.md#cross-platform]
- Focus state debugging tools for development [Source: architecture/coding-standards-and-conventions.md#debugging]

### Technical Constraints
- Blessed framework focus limitations require workarounds [Source: architecture/tech-stack-alignment.md#blessed]
- Terminal UI responsiveness must remain under 100ms [Source: docs/prd.md#non-functional-requirements]
- Memory usage for focus tracking must be minimal [Source: docs/prd.md#non-functional-requirements]
- Cross-platform compatibility with terminal variations [Source: architecture/tech-stack-alignment.md#compatibility]

## Tasks / Subtasks

1. **Implement Focus State Tracking** (AC: 3, 5)
   - Add focus history tracking to TerminalUI class
   - Create focus validation mechanisms for dialog transitions
   - Implement focus debugging utilities for development
   - Add unit tests for focus state management

2. **Enhance Agent Spawn Dialog Focus Management** (AC: 1, 2)
   - Modify AgentSpawnDialog to properly manage focus transitions
   - Implement focus restoration with retry mechanisms
   - Add focus validation after dialog operations
   - Test focus behavior across different spawn scenarios

3. **Implement Focus Recovery Mechanisms** (AC: 1, 4)
   - Add automatic focus restoration after spawn completion
   - Create focus validation after screen render operations
   - Implement periodic focus state validation
   - Add defensive focus recovery for edge cases

4. **Add Cross-Platform Focus Handling** (AC: 5)
   - Test focus behavior on macOS, Linux, and Windows
   - Implement platform-specific focus handling if needed
   - Add focus validation for terminal resize events
   - Create compatibility tests for different terminal types

5. **Testing and Validation** (AC: All)
   - Create integration tests for complete keyboard workflow
   - Test sequential agent spawning with keyboard navigation
   - Validate focus recovery under error conditions
   - Add automated tests for focus consistency

## Definition of Done
- [ ] Terminal maintains keyboard focus throughout agent spawning process
- [ ] No mouse click required to regain keyboard responsiveness after spawning
- [ ] Agent spawn dialog properly manages focus transitions
- [ ] Focus returns to main UI automatically when dialog closes
- [ ] System validates and recovers focus state automatically
- [ ] Keyboard shortcuts remain functional immediately after spawning
- [ ] Sequential agent spawning works with keyboard navigation only
- [ ] Focus management works consistently across all supported platforms
- [ ] Focus debugging tools available for development troubleshooting
- [ ] Integration tests validate complete keyboard workflow continuity

## Notes
- This story addresses a critical UX issue that breaks the keyboard-driven workflow
- Focus management in blessed framework requires careful handling of render cycles
- Cross-platform testing essential due to terminal focus behavior variations
- Defensive programming approach needed for focus recovery edge cases
- Performance impact of focus tracking must be monitored and minimized

## Related Stories
- US012: Basic Terminal UI Foundation (establishes blessed framework patterns)
- US013: Agent Spawning Core Functionality (spawn process being enhanced)
- US020: Enhanced Agent Detail View (similar focus management patterns)
- US024: Enhanced Keyboard Shortcuts and Navigation (overall keyboard workflow)

## Approval Status

**Status:** ✅ Approved - Ready for Implementation

**Priority:** HIGH

**Approved by:** Scrum Master Bob

**Date:** 2025-07-18

**Approval Notes:**
- Critical UX fix for keyboard workflow continuity
- Comprehensive focus management solution with retry mechanisms
- Excellent blessed framework integration with defensive programming
- Strong cross-platform considerations and testing strategy
- Focus debugging utilities provide valuable development support
- Performance-conscious implementation maintains UI responsiveness