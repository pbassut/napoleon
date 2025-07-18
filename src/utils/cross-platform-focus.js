const os = require('os');
const logger = require('./logger');

/**
 * Cross-platform focus management utilities
 * Handles platform-specific focus behavior for terminal UI
 */
class CrossPlatformFocus {
  constructor(screen) {
    this.screen = screen;
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';
    this.isMacOS = this.platform === 'darwin';
    this.isLinux = this.platform === 'linux';
    
    // Platform-specific timing constants
    this.focusDelay = this.getFocusDelay();
    this.retryDelay = this.getRetryDelay();
    this.validationDelay = this.getValidationDelay();
    
    logger.debug('Cross-platform focus initialized', {
      platform: this.platform,
      focusDelay: this.focusDelay,
      retryDelay: this.retryDelay,
    });
  }

  /**
   * Get platform-specific focus delay
   * Different platforms have different timing requirements
   */
  getFocusDelay() {
    if (this.isWindows) {
      // Windows terminals often need more time for focus operations
      return 50;
    } else if (this.isMacOS) {
      // macOS terminals are generally responsive
      return 25;
    } else {
      // Linux terminals vary, use moderate delay
      return 35;
    }
  }

  /**
   * Get platform-specific retry delay
   */
  getRetryDelay() {
    if (this.isWindows) {
      return 75;
    } else if (this.isMacOS) {
      return 50;
    } else {
      return 60;
    }
  }

  /**
   * Get platform-specific validation delay
   */
  getValidationDelay() {
    if (this.isWindows) {
      return 100;
    } else if (this.isMacOS) {
      return 75;
    } else {
      return 85;
    }
  }

  /**
   * Set focus with platform-specific optimizations
   */
  setFocus(element, options = {}) {
    const { retries = 3, immediate = false } = options;
    
    if (!element) {
      logger.warn('Cannot set focus: element is null');
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const attemptFocus = (remainingRetries) => {
        try {
          // Platform-specific focus handling
          if (this.isWindows) {
            // Windows needs explicit focus and render cycle
            element.focus();
            this.screen.render();
          } else if (this.isMacOS) {
            // macOS works well with standard focus
            element.focus();
          } else {
            // Linux needs focus with small delay
            element.focus();
            process.nextTick(() => this.screen.render());
          }

          // Validate focus was set correctly
          setTimeout(() => {
            const focusSuccess = this.screen.focused === element;
            
            if (focusSuccess || remainingRetries <= 0) {
              resolve(focusSuccess);
            } else {
              logger.debug('Focus retry needed', { 
                platform: this.platform,
                remainingRetries: remainingRetries - 1,
              });
              attemptFocus(remainingRetries - 1);
            }
          }, immediate ? 0 : this.validationDelay);

        } catch (error) {
          logger.error('Focus setting failed', { 
            error: error.message,
            platform: this.platform,
          });
          
          if (remainingRetries > 0) {
            setTimeout(() => attemptFocus(remainingRetries - 1), this.retryDelay);
          } else {
            resolve(false);
          }
        }
      };

      if (immediate) {
        attemptFocus(retries);
      } else {
        setTimeout(() => attemptFocus(retries), this.focusDelay);
      }
    });
  }

  /**
   * Handle platform-specific resize events
   */
  setupResizeHandling(onResize) {
    // Enhanced resize handling for cross-platform compatibility
    this.screen.on('resize', () => {
      logger.debug('Terminal resize detected', { platform: this.platform });
      
      // Platform-specific resize handling
      if (this.isWindows) {
        // Windows might need extra time after resize
        setTimeout(() => {
          this.preserveFocusAfterResize();
          if (onResize) onResize();
        }, 100);
      } else {
        // macOS and Linux handle resize more smoothly
        setTimeout(() => {
          this.preserveFocusAfterResize();
          if (onResize) onResize();
        }, 50);
      }
    });
  }

  /**
   * Preserve focus state after terminal resize
   */
  preserveFocusAfterResize() {
    const currentFocus = this.screen.focused;
    
    if (!currentFocus) {
      logger.debug('No focus to preserve after resize');
      return;
    }

    // Brief delay for terminal to stabilize
    setTimeout(() => {
      if (this.screen.focused !== currentFocus) {
        logger.debug('Focus lost during resize, restoring', {
          platform: this.platform,
        });
        this.setFocus(currentFocus, { immediate: true });
      }
    }, this.focusDelay);
  }

  /**
   * Get platform-specific focus validation interval
   */
  getFocusValidationInterval() {
    if (this.isWindows) {
      // Windows terminals benefit from more frequent validation
      return 1500;
    } else if (this.isMacOS) {
      // macOS is stable, less frequent validation needed
      return 2500;
    } else {
      // Linux terminals need moderate validation
      return 2000;
    }
  }

  /**
   * Platform-specific blessed event handling setup
   */
  setupBlessedEventHandling(handlers = {}) {
    const { onFocus, onBlur, onRender } = handlers;

    // Enhanced focus event handling for different platforms
    this.screen.on('element focus', (element) => {
      logger.debug('Element focus event', {
        platform: this.platform,
        element: element.constructor.name,
      });
      
      if (onFocus) {
        // Platform-specific timing for focus events
        if (this.isWindows) {
          // Windows might need deferred execution
          process.nextTick(() => onFocus(element));
        } else {
          onFocus(element);
        }
      }
    });

    this.screen.on('element blur', (element) => {
      logger.debug('Element blur event', {
        platform: this.platform,
        element: element.constructor.name,
      });
      
      if (onBlur) {
        onBlur(element);
      }
    });

    // Platform-aware render event handling
    this.screen.on('render', () => {
      if (onRender) {
        if (this.isWindows) {
          // Windows benefits from delayed render processing
          setTimeout(onRender, 10);
        } else {
          onRender();
        }
      }
    });
  }

  /**
   * Check if terminal environment supports focus properly
   */
  validateTerminalCapabilities() {
    const capabilities = {
      supportsMouseTracking: true,
      supportsFocusEvents: true,
      requiresDelayedFocus: this.isWindows,
      recommendedValidationInterval: this.getFocusValidationInterval(),
    };

    // Check for specific terminal issues
    if (process.env.TERM === 'dumb') {
      capabilities.supportsFocusEvents = false;
      logger.warn('Terminal does not support focus events', { term: process.env.TERM });
    }

    if (this.isWindows && process.env.TERM_PROGRAM === 'cmd') {
      capabilities.requiresDelayedFocus = true;
      logger.debug('Windows cmd detected, using delayed focus strategy');
    }

    logger.debug('Terminal capabilities assessed', {
      platform: this.platform,
      capabilities,
    });

    return capabilities;
  }

  /**
   * Apply platform-specific focus recovery strategy
   */
  recoverFocus(targetElement) {
    const capabilities = this.validateTerminalCapabilities();
    
    if (!capabilities.supportsFocusEvents) {
      logger.warn('Focus recovery not supported in this terminal');
      return Promise.resolve(false);
    }

    // Use appropriate recovery strategy based on platform
    if (this.isWindows) {
      return this.recoverFocusWindows(targetElement);
    } else if (this.isMacOS) {
      return this.recoverFocusMacOS(targetElement);
    } else {
      return this.recoverFocusLinux(targetElement);
    }
  }

  /**
   * Windows-specific focus recovery
   */
  recoverFocusWindows(element) {
    // Windows often needs multiple attempts with render cycles
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 5;

      const attemptRecovery = () => {
        attempts++;
        
        try {
          element.focus();
          this.screen.render();
          
          setTimeout(() => {
            if (this.screen.focused === element) {
              resolve(true);
            } else if (attempts < maxAttempts) {
              attemptRecovery();
            } else {
              // Force focus assignment as last resort
              this.screen.focused = element;
              this.screen.render();
              resolve(true);
            }
          }, 75);
        } catch (error) {
          if (attempts < maxAttempts) {
            setTimeout(attemptRecovery, 100);
          } else {
            resolve(false);
          }
        }
      };

      attemptRecovery();
    });
  }

  /**
   * macOS-specific focus recovery
   */
  recoverFocusMacOS(element) {
    // macOS usually works well with standard approach
    return this.setFocus(element, { retries: 2 });
  }

  /**
   * Linux-specific focus recovery
   */
  recoverFocusLinux(element) {
    // Linux needs focus with process.nextTick for stability
    return new Promise((resolve) => {
      try {
        element.focus();
        
        process.nextTick(() => {
          this.screen.render();
          
          setTimeout(() => {
            const success = this.screen.focused === element;
            if (!success) {
              // Retry once with force
              this.screen.focused = element;
              this.screen.render();
            }
            resolve(true);
          }, 60);
        });
      } catch (error) {
        logger.error('Linux focus recovery failed', { error: error.message });
        resolve(false);
      }
    });
  }
}

module.exports = CrossPlatformFocus;