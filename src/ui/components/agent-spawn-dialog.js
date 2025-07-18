const blessed = require('blessed');
const logger = require('../../utils/logger');

/**
 * Agent Spawn Dialog Component
 * Handles the interactive agent spawning interface
 */
class AgentSpawnDialog {
  constructor(parent, onSpawn, onCancel) {
    this.parent = parent;
    this.onSpawn = onSpawn;
    this.onCancel = onCancel;
    this.dialog = null;
    this.textbox = null;
    this.instructionsText = null;
    this.isVisible = false;
    this.activeTimers = new Set(); // Track active timers for cleanup

    // Focus management properties
    this.previouslyFocused = null;
    this.focusRestoreTimeout = null;
  }

  /**
   * Create the spawn dialog
   */
  create() {
    if (this.dialog) {
      return this.dialog;
    }

    // Main dialog container
    this.dialog = blessed.box({
      parent: this.parent,
      label: ' Spawn New Agent ',
      top: 'center',
      left: 'center',
      width: 70,
      height: 18,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'green',
        },
      },
      hidden: true,
      shadow: true,
    });

    // Instructions text
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

    // Text input box
    this.textbox = blessed.textarea({
      parent: this.dialog,
      label: ' Agent Instructions ',
      top: 7,
      left: 2,
      width: '100%-4',
      height: 7,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'gray',
        },
        focus: {
          border: {
            fg: 'green',
          },
        },
      },
      inputOnFocus: true,
      mouse: true,
      keys: true,
      vi: false,
      scrollable: true,
      alwaysScroll: true,
    });

    // Footer with keyboard shortcuts
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

    // Set up event handlers
    this.setupEventHandlers();

    return this.dialog;
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Track shift key state for Enter handling
    this.isShiftPressed = false;

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

    // Handle Escape to cancel
    this.textbox.key(['escape'], () => {
      this.handleCancel();
    });

    // Track shift key state for Enter handling
    this.textbox.on('keypress', (ch, key) => {
      this.isShiftPressed = key && key.shift;
    });

    // Handle Tab for indentation
    this.textbox.key(['tab'], () => {
      const currentValue = this.textbox.getValue();
      this.textbox.setValue(`${currentValue}  `);
    });

    // Focus handling
    this.textbox.on('focus', () => {
      this.textbox.style.border.fg = 'green';
      this.parent.render();
    });

    this.textbox.on('blur', () => {
      this.textbox.style.border.fg = 'gray';
      this.parent.render();
    });

    // Handle text changes for validation
    this.textbox.on('submit', () => {
      this.handleSpawnAgent();
    });
  }

  /**
   * Show the dialog
   */
  show() {
    if (!this.dialog) {
      this.create();
    }

    // Store current focus state
    this.previouslyFocused = this.parent.focused;

    this.isVisible = true;
    this.dialog.show();

    // Ensure focus is properly set with retry mechanism
    this.setFocusWithRetry(this.textbox);
    this.textbox.setValue('');

    // Reset footer to default state
    this.footer.setContent('Press Enter to spawn agent | Shift+Enter for new line | Escape to cancel');
    this.footer.style.fg = 'yellow';

    this.parent.render();

    logger.debug('Agent spawn dialog shown');
  }

  /**
   * Hide the dialog
   */
  hide() {
    if (this.dialog) {
      this.isVisible = false;
      this.dialog.hide();
      this.parent.render();
      logger.debug('Agent spawn dialog hidden');
    }
  }

  /**
   * Handle agent spawning
   */
  async handleSpawnAgent() {
    try {
      const instructions = this.textbox.getValue().trim();

      if (!this.validateInstructions(instructions)) {
        return;
      }

      // Update footer to show processing
      this.footer.setContent('Creating git worktree and spawning agent... (Press Escape to cancel)');
      this.footer.style.fg = 'yellow';
      this.parent.render();

      // Set up cancellation mechanism during spawn
      let spawnCancelled = false;
      const escapeHandler = () => {
        spawnCancelled = true;
        this.showError('Agent spawning cancelled by user');
        this.hideWithFocusRestore();
      };

      // Temporarily override escape key to allow cancellation during spawn
      this.textbox.removeAllListeners('keypress');
      this.textbox.on('keypress', (ch, key) => {
        if (key && key.name === 'escape') {
          escapeHandler();
        }
      });

      // Call spawn callback with timeout and cancellation handling
      if (this.onSpawn && !spawnCancelled) {
        // Add timeout wrapper to prevent indefinite blocking
        const spawnPromise = this.onSpawn(instructions);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Spawn operation timed out after 30 seconds')), 30000);
        });

        // Race between spawn completion and timeout
        await Promise.race([spawnPromise, timeoutPromise]);
      }

      // Only hide dialog if operation wasn't cancelled
      if (!spawnCancelled) {
        this.hideWithFocusRestore();
      }
    } catch (error) {
      logger.error('Failed to spawn agent from dialog', { error: error.message });
      this.showError(`Failed to spawn agent: ${error.message}`);

      // Ensure modal doesn't stay stuck on error
      setTimeout(() => {
        if (this.isVisible) {
          this.footer.setContent('Press Escape to cancel');
          this.footer.style.fg = 'red';
          this.parent.render();
        }
      }, 3000);
    } finally {
      // Always restore original event handlers
      this.setupEventHandlers();
    }
  }

  /**
   * Handle dialog cancellation
   */
  handleCancel() {
    this.hideWithFocusRestore();

    if (this.onCancel) {
      this.onCancel();
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.footer.setContent(`Error: ${message} | Press Escape to cancel`);
    this.footer.style.fg = 'red';
    this.parent.render();

    // Reset footer after 3 seconds
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      if (this.isVisible) {
        this.footer.setContent('Press Enter to spawn agent | Shift+Enter for new line | Escape to cancel');
        this.footer.style.fg = 'yellow';
        this.parent.render();
      }
    }, 3000);
    this.activeTimers.add(timerId);
  }

  /**
   * Get current instructions
   */
  getInstructions() {
    return this.textbox ? this.textbox.getValue().trim() : '';
  }

  /**
   * Set instructions text
   */
  setInstructions(text) {
    if (this.textbox) {
      this.textbox.setValue(text);
      this.parent.render();
    }
  }

  /**
   * Clear instructions
   */
  clearInstructions() {
    if (this.textbox) {
      this.textbox.setValue('');
      this.parent.render();
    }
  }

  /**
   * Check if dialog is visible
   */
  isShown() {
    return this.isVisible;
  }

  /**
   * Destroy the dialog
   */
  destroy() {
    if (this.dialog) {
      // Clean up all active timers
      this.activeTimers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      this.activeTimers.clear();

      // Clear focus restore timeout
      if (this.focusRestoreTimeout) {
        clearTimeout(this.focusRestoreTimeout);
        this.focusRestoreTimeout = null;
      }

      this.dialog.destroy();
      this.dialog = null;
      this.textbox = null;
      this.instructionsText = null;
      this.footer = null;
      this.isVisible = false;
    }
  }

  /**
   * Validate instructions with error display
   */
  validateInstructions(instructions) {
    // Check for empty or whitespace-only input
    if (!instructions || instructions.trim().length === 0) {
      this.showError('Please enter instructions for the agent');
      return false;
    }

    // Remove minimum character requirement - allow any non-empty input
    return true;
  }

  /**
   * Hide dialog with focus restoration
   */
  hideWithFocusRestore() {
    if (this.dialog) {
      this.isVisible = false;
      this.dialog.hide();

      // Restore focus to main UI with retry mechanism
      this.restoreFocusToParent();

      this.parent.render();
    }
  }

  /**
   * Enhanced parent focus restoration with multiple fallbacks
   */
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
          parentType: this.parent ? this.parent.constructor.name : 'null',
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
        stack: error.stack,
      });
      // Do not re-throw - prevent crashes
    }
  }

  /**
   * Set focus with retry mechanism and comprehensive validation
   */
  setFocusWithRetry(element, retries = 3) {
    if (!element || retries <= 0) {
      logger.debug('Focus retry exhausted or invalid element');
      return false;
    }

    try {
      // Comprehensive element validation
      if (!AgentSpawnDialog.isValidFocusableElement(element)) {
        logger.warn('Element is not focusable', {
          elementType: element ? element.constructor.name : 'null',
          hasFocusMethod: element && typeof element.focus === 'function',
          isScreenElement: element && element.screen !== undefined,
        });
        return false;
      }

      // Safe focus call with error handling
      element.focus();

      // Verify focus was set correctly
      setTimeout(() => {
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
        stack: error.stack,
      });

      // Retry with exponential backoff
      setTimeout(() => {
        this.setFocusWithRetry(element, retries - 1);
      }, (2 ** (4 - retries)) * 10);

      return false;
    }
  }

  /**
   * Element validation helper
   */
  static isValidFocusableElement(element) {
    return !!(element
           && typeof element === 'object'
           && typeof element.focus === 'function'
           && !element.destroyed
           && element.screen);
  }

  /**
   * Parent validation helper
   */
  isValidParent() {
    return !!(this.parent
           && typeof this.parent === 'object'
           && !this.parent.destroyed
           && this.parent.screen);
  }

  /**
   * Ensure parent has focus with comprehensive validation
   */
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
        error: error.message,
      });
      // Do not re-throw - prevent crashes
    }
  }
}

module.exports = AgentSpawnDialog;
