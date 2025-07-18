const CrossPlatformFocus = require('../../src/utils/cross-platform-focus');
const logger = require('../../src/utils/logger');
const os = require('os');

// Mock logger and os
jest.mock('../../src/utils/logger');
jest.mock('os');

describe('CrossPlatformFocus', () => {
  let mockScreen;
  let crossPlatformFocus;
  let originalPlatform;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Store original platform
    originalPlatform = process.platform;
    
    // Mock screen object
    mockScreen = {
      focus: jest.fn(),
      render: jest.fn(),
      on: jest.fn(),
      focused: null,
      constructor: { name: 'Screen' },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore original platform
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('platform detection and timing', () => {
    it('should initialize correctly on macOS', () => {
      os.platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);

      expect(crossPlatformFocus.platform).toBe('darwin');
      expect(crossPlatformFocus.isMacOS).toBe(true);
      expect(crossPlatformFocus.isWindows).toBe(false);
      expect(crossPlatformFocus.isLinux).toBe(false);
      expect(crossPlatformFocus.focusDelay).toBe(25);
    });

    it('should initialize correctly on Windows', () => {
      os.platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);

      expect(crossPlatformFocus.platform).toBe('win32');
      expect(crossPlatformFocus.isWindows).toBe(true);
      expect(crossPlatformFocus.isMacOS).toBe(false);
      expect(crossPlatformFocus.isLinux).toBe(false);
      expect(crossPlatformFocus.focusDelay).toBe(50);
    });

    it('should initialize correctly on Linux', () => {
      os.platform.mockReturnValue('linux');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);

      expect(crossPlatformFocus.platform).toBe('linux');
      expect(crossPlatformFocus.isLinux).toBe(true);
      expect(crossPlatformFocus.isMacOS).toBe(false);
      expect(crossPlatformFocus.isWindows).toBe(false);
      expect(crossPlatformFocus.focusDelay).toBe(35);
    });

    it('should provide correct validation intervals for different platforms', () => {
      // Windows
      os.platform.mockReturnValue('win32');
      const windowsFocus = new CrossPlatformFocus(mockScreen);
      expect(windowsFocus.getFocusValidationInterval()).toBe(1500);

      // macOS
      os.platform.mockReturnValue('darwin');
      const macosFocus = new CrossPlatformFocus(mockScreen);
      expect(macosFocus.getFocusValidationInterval()).toBe(2500);

      // Linux
      os.platform.mockReturnValue('linux');
      const linuxFocus = new CrossPlatformFocus(mockScreen);
      expect(linuxFocus.getFocusValidationInterval()).toBe(2000);
    });
  });

  describe('setFocus method', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should set focus successfully on first attempt', async () => {
      const mockElement = { focus: jest.fn(), constructor: { name: 'TestElement' } };
      
      // Mock focus setting to simulate success
      mockElement.focus.mockImplementation(() => {
        mockScreen.focused = mockElement;
      });

      const focusPromise = crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      // Advance timers to trigger validation
      jest.advanceTimersByTime(100);
      
      const result = await focusPromise;

      expect(mockElement.focus).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should retry focus setting if initial attempt fails', async () => {
      const mockElement = { focus: jest.fn(), constructor: { name: 'TestElement' } };
      
      // Simulate focus failing first time, succeeding second time
      let focusAttempts = 0;
      mockElement.focus.mockImplementation(() => {
        focusAttempts++;
        if (focusAttempts >= 2) {
          mockScreen.focused = mockElement;
        }
      });

      const focusPromise = crossPlatformFocus.setFocus(mockElement, { retries: 3, immediate: true });
      
      // Advance through validation delays
      jest.advanceTimersByTime(100);
      
      const result = await focusPromise;
      expect(result).toBe(true);
      expect(mockElement.focus).toHaveBeenCalledTimes(2);
    });

    it('should handle null element gracefully', async () => {
      const result = await crossPlatformFocus.setFocus(null);
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Cannot set focus: element is null');
    });

    it('should handle focus errors gracefully', async () => {
      const mockElement = { 
        focus: jest.fn(() => { throw new Error('Focus failed'); }),
        constructor: { name: 'TestElement' },
      };

      const focusPromise = crossPlatformFocus.setFocus(mockElement, { retries: 1, immediate: true });
      jest.advanceTimersByTime(200);
      
      const result = await focusPromise;
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Focus setting failed', expect.any(Object));
    });

    it('should handle elements without focus method', async () => {
      const mockElement = { 
        constructor: { name: 'NoFocusElement' },
        // No focus method
      };

      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Element does not have focus method', {
        elementType: 'NoFocusElement',
        platform: 'darwin',
      });
    });
  });

  describe('resize handling', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should setup resize event handlers', () => {
      const onResize = jest.fn();
      crossPlatformFocus.setupResizeHandling(onResize);

      expect(mockScreen.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should handle resize events with platform-specific timing', () => {
      const onResize = jest.fn();
      crossPlatformFocus.setupResizeHandling(onResize);

      // Get the resize handler
      const resizeHandler = mockScreen.on.mock.calls.find(call => call[0] === 'resize')[1];
      
      resizeHandler();
      
      // Fast-forward through platform-specific delay (50ms for macOS)
      jest.advanceTimersByTime(50);
      
      expect(onResize).toHaveBeenCalled();
    });

    it('should preserve focus after resize', () => {
      const preserveSpy = jest.spyOn(crossPlatformFocus, 'preserveFocusAfterResize');
      crossPlatformFocus.setupResizeHandling();

      const resizeHandler = mockScreen.on.mock.calls.find(call => call[0] === 'resize')[1];
      resizeHandler();
      
      jest.advanceTimersByTime(50);
      
      expect(preserveSpy).toHaveBeenCalled();
    });
  });

  describe('blessed event handling', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should setup blessed event handlers', () => {
      const handlers = {
        onFocus: jest.fn(),
        onBlur: jest.fn(),
        onRender: jest.fn(),
      };

      crossPlatformFocus.setupBlessedEventHandling(handlers);

      expect(mockScreen.on).toHaveBeenCalledWith('element focus', expect.any(Function));
      expect(mockScreen.on).toHaveBeenCalledWith('element blur', expect.any(Function));
      expect(mockScreen.on).toHaveBeenCalledWith('render', expect.any(Function));
    });

    it('should call focus handler on element focus event', () => {
      const onFocus = jest.fn();
      crossPlatformFocus.setupBlessedEventHandling({ onFocus });

      const focusHandler = mockScreen.on.mock.calls.find(call => call[0] === 'element focus')[1];
      const mockElement = { constructor: { name: 'TestElement' } };
      
      focusHandler(mockElement);
      
      expect(onFocus).toHaveBeenCalledWith(mockElement);
    });

    it('should handle Windows platform-specific event timing', () => {
      os.platform.mockReturnValue('win32');
      const windowsFocus = new CrossPlatformFocus(mockScreen);
      
      const onFocus = jest.fn();
      windowsFocus.setupBlessedEventHandling({ onFocus });

      const focusHandler = mockScreen.on.mock.calls.find(call => call[0] === 'element focus')[1];
      const mockElement = { constructor: { name: 'TestElement' } };
      
      focusHandler(mockElement);
      
      // Windows uses process.nextTick, need to flush the callback queue
      jest.runAllTicks();
      
      expect(onFocus).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('terminal capabilities validation', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should validate normal terminal capabilities', () => {
      const capabilities = crossPlatformFocus.validateTerminalCapabilities();

      expect(capabilities.supportsMouseTracking).toBe(true);
      expect(capabilities.supportsFocusEvents).toBe(true);
      expect(capabilities.requiresDelayedFocus).toBe(false);
      expect(capabilities.recommendedValidationInterval).toBe(2500);
    });

    it('should detect dumb terminal', () => {
      process.env.TERM = 'dumb';
      
      const capabilities = crossPlatformFocus.validateTerminalCapabilities();
      
      expect(capabilities.supportsFocusEvents).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Terminal does not support focus events', { term: 'dumb' });
      
      delete process.env.TERM;
    });

    it('should detect Windows cmd terminal', () => {
      os.platform.mockReturnValue('win32');
      process.env.TERM_PROGRAM = 'cmd';
      
      const windowsFocus = new CrossPlatformFocus(mockScreen);
      const capabilities = windowsFocus.validateTerminalCapabilities();
      
      expect(capabilities.requiresDelayedFocus).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith('Windows cmd detected, using delayed focus strategy');
      
      delete process.env.TERM_PROGRAM;
    });
  });

  describe('platform-specific focus recovery', () => {
    it('should use Windows-specific recovery strategy', async () => {
      os.platform.mockReturnValue('win32');
      const windowsFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { focus: jest.fn(), constructor: { name: 'TestElement' } };
      
      // Mock successful focus after attempts
      let attempts = 0;
      mockElement.focus.mockImplementation(() => {
        attempts++;
        if (attempts >= 2) {
          mockScreen.focused = mockElement;
        }
      });

      const recoveryPromise = windowsFocus.recoverFocus(mockElement);
      
      // Advance through Windows-specific timing
      jest.advanceTimersByTime(300);
      
      const result = await recoveryPromise;
      expect(result).toBe(true);
      expect(mockScreen.render).toHaveBeenCalled();
    });

    it('should use macOS-specific recovery strategy', async () => {
      os.platform.mockReturnValue('darwin');
      const macosFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { focus: jest.fn(), constructor: { name: 'TestElement' } };
      
      // Mock focus to simulate success
      mockElement.focus.mockImplementation(() => {
        mockScreen.focused = mockElement;
      });
      
      const recoveryPromise = macosFocus.recoverFocus(mockElement);
      
      // Advance timers for macOS timing
      jest.advanceTimersByTime(100);
      
      const result = await recoveryPromise;
      expect(result).toBe(true);
    });

    it('should use Linux-specific recovery strategy', async () => {
      os.platform.mockReturnValue('linux');
      const linuxFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { focus: jest.fn(), constructor: { name: 'TestElement' } };
      
      const recoveryPromise = linuxFocus.recoverFocus(mockElement);
      
      // Fast-forward through Linux timing
      jest.advanceTimersByTime(100);
      
      const result = await recoveryPromise;
      expect(result).toBe(true);
      expect(mockElement.focus).toHaveBeenCalled();
    });

    it('should handle recovery failures gracefully', async () => {
      os.platform.mockReturnValue('linux');
      const linuxFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { 
        focus: jest.fn(() => { throw new Error('Focus failed'); }),
        constructor: { name: 'TestElement' },
      };
      
      const recoveryPromise = linuxFocus.recoverFocus(mockElement);
      jest.advanceTimersByTime(100);
      
      const result = await recoveryPromise;
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Linux focus recovery failed', expect.any(Object));
    });
  });

  describe('preserve focus after resize', () => {
    beforeEach(() => {
      os.platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should preserve current focus after resize', () => {
      const mockElement = { constructor: { name: 'TestElement' } };
      mockScreen.focused = mockElement;
      
      const setFocusSpy = jest.spyOn(crossPlatformFocus, 'setFocus');
      
      crossPlatformFocus.preserveFocusAfterResize();
      
      // Fast-forward through focus delay
      jest.advanceTimersByTime(30);
      
      // Focus should be preserved, so setFocus should not be called
      expect(setFocusSpy).not.toHaveBeenCalled();
    });

    it('should restore focus when lost during resize', () => {
      const mockElement = { constructor: { name: 'TestElement' } };
      mockScreen.focused = mockElement;
      
      const setFocusSpy = jest.spyOn(crossPlatformFocus, 'setFocus');
      
      crossPlatformFocus.preserveFocusAfterResize();
      
      // Simulate focus loss
      mockScreen.focused = null;
      
      // Fast-forward through focus delay
      jest.advanceTimersByTime(30);
      
      expect(setFocusSpy).toHaveBeenCalledWith(mockElement, { immediate: true });
    });

    it('should handle no current focus gracefully', () => {
      mockScreen.focused = null;
      
      expect(() => crossPlatformFocus.preserveFocusAfterResize()).not.toThrow();
      expect(logger.debug).toHaveBeenCalledWith('No focus to preserve after resize');
    });
  });
});