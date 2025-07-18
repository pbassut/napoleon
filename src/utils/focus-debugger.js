const logger = require('./logger');

/**
 * Focus debugging and monitoring utilities
 * Tracks focus state changes and provides debugging tools for terminal UI
 */
class FocusDebugger {
  constructor(screen) {
    this.screen = screen;
    this.focusLog = [];
    this.isDebugging = process.env.NAPOLEON_DEBUG_FOCUS === 'true';
  }

  /**
   * Log current focus state with context
   * @param {string} context - Context description for the focus state
   */
  logFocusState(context) {
    if (!this.isDebugging) return;

    const state = {
      timestamp: Date.now(),
      context,
      focused: this.screen.focused ? this.screen.focused.constructor.name : 'none',
      focusedElement: this.screen.focused,
      screen: this.screen.constructor.name,
    };

    this.focusLog.push(state);
    logger.debug('Focus state', state);

    // Keep log size manageable
    if (this.focusLog.length > 50) {
      this.focusLog.shift();
    }
  }

  /**
   * Dump complete focus history for debugging
   */
  dumpFocusHistory() {
    if (this.isDebugging) {
      logger.info('Focus history dump', { history: this.focusLog });
    }
  }

  /**
   * Validate that focus state is consistent with expectations
   * @returns {boolean} True if focus is consistent
   */
  validateFocusConsistency() {
    const currentFocus = this.screen.focused;
    const expectedFocus = this.determineExpectedFocus();

    if (currentFocus !== expectedFocus) {
      logger.warn('Focus inconsistency detected', {
        current: currentFocus ? currentFocus.constructor.name : 'none',
        expected: expectedFocus ? expectedFocus.constructor.name : 'none',
      });
      return false;
    }

    return true;
  }

  /**
   * Determine what element should have focus based on UI state
   * @returns {object} Element that should have focus
   */
  determineExpectedFocus() {
    // Logic to determine what should have focus based on UI state
    // For now, default to screen having focus when no dialogs are active
    return this.screen;
  }

  /**
   * Get recent focus events for debugging
   * @param {number} count - Number of recent events to return
   * @returns {Array} Recent focus events
   */
  getRecentEvents(count = 10) {
    return this.focusLog.slice(-count);
  }

  /**
   * Clear focus log history
   */
  clearHistory() {
    this.focusLog = [];
  }

  /**
   * Enable or disable focus debugging
   * @param {boolean} enabled - Whether to enable debugging
   */
  setDebugging(enabled) {
    this.isDebugging = enabled;
    logger.info('Focus debugging', { enabled });
  }
}

module.exports = FocusDebugger;