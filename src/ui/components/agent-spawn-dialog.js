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
        'Enter detailed instructions for the Claude agent:',
        '',
        '• Be specific about the task you want the agent to perform',
        '• Include any relevant context or constraints',
        '• Minimum 10 characters required',
        '• Agent will work in isolated git worktree in .add-manager-worktrees/',
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
      content: 'Press Ctrl+S to spawn agent | Escape to cancel',
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
    // Handle Ctrl+S to spawn agent
    this.textbox.key(['C-s'], () => {
      this.handleSpawnAgent();
    });

    // Handle Escape to cancel
    this.textbox.key(['escape'], () => {
      this.handleCancel();
    });

    // Handle Enter for new lines (allow multi-line input)
    this.textbox.key(['enter'], () => {
      const currentValue = this.textbox.getValue();
      this.textbox.setValue(`${currentValue}\n`);
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

    this.isVisible = true;
    this.dialog.show();
    this.textbox.focus();
    this.textbox.setValue('');
    
    // Reset footer to default state
    this.footer.setContent('Press Ctrl+S to spawn agent | Escape to cancel');
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

      // Validate instructions
      if (!instructions) {
        this.showError('Please enter instructions for the agent');
        return;
      }

      if (instructions.length < 10) {
        this.showError('Instructions must be at least 10 characters long');
        return;
      }

      // Update footer to show processing
      this.footer.setContent('Creating git worktree and spawning agent...');
      this.footer.style.fg = 'yellow';
      this.parent.render();

      // Call the spawn callback
      if (this.onSpawn) {
        await this.onSpawn(instructions);
      }

      // Hide dialog on success
      this.hide();

      // Return focus to main screen to restore keyboard callbacks
      this.parent.render();
    } catch (error) {
      logger.error('Failed to spawn agent from dialog', { error: error.message });
      this.showError(`Failed to spawn agent: ${error.message}`);
    }
  }

  /**
   * Handle dialog cancellation
   */
  handleCancel() {
    this.hide();

    // Return focus to main screen to restore keyboard callbacks
    this.parent.render();

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
        this.footer.setContent('Press Ctrl+S to spawn agent | Escape to cancel');
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

      this.dialog.destroy();
      this.dialog = null;
      this.textbox = null;
      this.instructionsText = null;
      this.footer = null;
      this.isVisible = false;
    }
  }
}

module.exports = AgentSpawnDialog;
