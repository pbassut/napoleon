const blessed = require('blessed');
const logger = require('../../../utils/logger');

/**
 * Agent Termination Confirmation Dialog Component
 * Handles the interactive agent termination confirmation interface
 */
class AgentTerminationDialog {
  constructor(parent, onConfirm, onCancel) {
    this.parent = parent;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.dialog = null;
    this.agentInfo = null;
    this.confirmButton = null;
    this.cancelButton = null;
    this.isVisible = false;
    this.activeTimers = new Set(); // Track active timers for cleanup
    this.selectedButton = 0; // 0 = cancel, 1 = confirm (default to cancel for safety)
  }

  /**
   * Create the termination dialog
   */
  create() {
    if (this.dialog) {
      return this.dialog;
    }

    // Main dialog container
    this.dialog = blessed.box({
      parent: this.parent,
      label: ' Terminate Agent ',
      top: 'center',
      left: 'center',
      width: 60,
      height: 12,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'red',
        },
      },
      hidden: true,
      shadow: true,
    });

    // Agent information display
    this.agentInfo = blessed.text({
      parent: this.dialog,
      top: 1,
      left: 2,
      width: '100%-4',
      height: 6,
      content: '',
      style: {
        fg: 'white',
      },
    });

    // Button container
    const buttonContainer = blessed.box({
      parent: this.dialog,
      top: 8,
      left: 2,
      width: '100%-4',
      height: 2,
      style: {
        fg: 'white',
      },
    });

    // Cancel button (default selection)
    this.cancelButton = blessed.box({
      parent: buttonContainer,
      top: 0,
      left: 2,
      width: 20,
      height: 2,
      content: ' [N] No, cancel ',
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'green', // Default selection
        },
      },
    });

    // Confirm button
    this.confirmButton = blessed.box({
      parent: buttonContainer,
      top: 0,
      right: 2,
      width: 20,
      height: 2,
      content: ' [Y] Yes, terminate ',
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'gray',
        },
      },
    });

    // Set up event handlers
    this.setupEventHandlers();

    return this.dialog;
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Handle Y key to confirm termination
    this.dialog.key(['y', 'Y'], () => {
      this.handleConfirm();
    });

    // Handle N key to cancel
    this.dialog.key(['n', 'N'], () => {
      this.handleCancel();
    });

    // Handle Escape to cancel
    this.dialog.key(['escape'], () => {
      this.handleCancel();
    });

    // Handle Enter to select current button
    this.dialog.key(['enter'], () => {
      if (this.selectedButton === 1) {
        this.handleConfirm();
      } else {
        this.handleCancel();
      }
    });

    // Handle Tab and arrow keys for button navigation
    this.dialog.key(['tab', 'right'], () => {
      this.selectedButton = (this.selectedButton + 1) % 2;
      this.updateButtonSelection();
    });

    this.dialog.key(['S-tab', 'left'], () => {
      this.selectedButton = (this.selectedButton - 1 + 2) % 2;
      this.updateButtonSelection();
    });

    // Focus handling
    this.dialog.on('focus', () => {
      this.dialog.style.border.fg = 'red';
      this.parent.render();
    });

    this.dialog.on('blur', () => {
      this.dialog.style.border.fg = 'gray';
      this.parent.render();
    });
  }

  /**
   * Update button selection visual indicators
   */
  updateButtonSelection() {
    if (this.selectedButton === 0) {
      // Cancel button selected
      this.cancelButton.style.border.fg = 'green';
      this.confirmButton.style.border.fg = 'gray';
    } else {
      // Confirm button selected
      this.cancelButton.style.border.fg = 'gray';
      this.confirmButton.style.border.fg = 'red';
    }
    this.parent.render();
  }

  /**
   * Show the dialog with agent information
   */
  show(agent) {
    if (!this.dialog) {
      this.create();
    }

    // Reset to default selection (cancel)
    this.selectedButton = 0;
    this.updateButtonSelection();

    // Format agent runtime
    const runtime = this.formatRuntime(agent.createdAt);

    // Update agent information display
    const sessionId = agent.sessionId || agent.id;
    const agentText = [
      '',
      `Are you sure you want to terminate ${agent.name || agent.id}?`,
      '',
      `Status: ${agent.status}`,
      `Runtime: ${runtime}`,
      `Session ID: ${sessionId}`,
      '',
    ].join('\n');

    this.agentInfo.setContent(agentText);

    this.isVisible = true;
    this.dialog.show();
    this.dialog.focus();
    this.parent.render();

    logger.debug('Agent termination dialog shown', { agentId: agent.id });
  }

  /**
   * Hide the dialog
   */
  hide() {
    if (this.dialog) {
      this.isVisible = false;
      this.dialog.hide();
      this.parent.render();
      logger.debug('Agent termination dialog hidden');
    }
  }

  /**
   * Handle termination confirmation
   */
  async handleConfirm() {
    try {
      logger.debug('Agent termination confirmed');

      // Hide dialog immediately
      this.hide();

      // Call the confirm callback
      if (this.onConfirm) {
        await this.onConfirm();
      }

      // Return focus to main screen to restore keyboard callbacks
      this.parent.render();
    } catch (error) {
      logger.error('Failed to handle termination confirmation', { error: error.message });
      this.showError(`Failed to terminate agent: ${error.message}`);
    }
  }

  /**
   * Handle dialog cancellation
   */
  handleCancel() {
    logger.debug('Agent termination cancelled');
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
    // Update agent info to show error
    this.agentInfo.setContent(`Error: ${message}\n\nPress Escape to cancel`);
    this.agentInfo.style.fg = 'red';
    this.parent.render();

    // Reset after 3 seconds
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      if (this.isVisible) {
        this.agentInfo.style.fg = 'white';
        this.parent.render();
      }
    }, 3000);
    this.activeTimers.add(timerId);
  }

  /**
   * Format runtime duration
   */
  formatRuntime(createdAt) {
    if (!createdAt) return 'Unknown';

    const now = new Date();
    const created = new Date(createdAt);

    // Check if created date is invalid
    if (isNaN(created.getTime())) return 'Unknown';

    const diffMs = now - created;

    if (diffMs < 0) return 'Unknown';

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
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
      this.agentInfo = null;
      this.confirmButton = null;
      this.cancelButton = null;
      this.isVisible = false;
    }
  }
}

module.exports = AgentTerminationDialog;
