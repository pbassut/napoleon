// Mock dependencies before importing
jest.mock('os', () => ({
  platform: jest.fn(() => 'linux')
}));
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

const CrossPlatformFocus = require('../../src/utils/cross-platform-focus');
const os = require('os');
const logger = require('../../src/utils/logger');

describe('CrossPlatformFocus', () => {
  let mockScreen;
  let crossPlatformFocus;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockScreen = {
      focused: null,
      render: jest.fn(),
      program: {
        showCursor: jest.fn(),
        hideCursor: jest.fn(),
      },
      children: [],
      append: jest.fn(),
      focus: jest.fn(),
    };

    // Default to Linux for most tests
    require('os').platform.mockReturnValue('linux');
  });

  describe('Constructor and Platform Detection', () => {
    it('should initialize with screen reference and detect Linux platform', () => {
      require('os').platform.mockReturnValue('linux');
      
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.screen).toBe(mockScreen);
      expect(crossPlatformFocus.platform).toBe('linux');
      expect(crossPlatformFocus.isLinux).toBe(true);
      expect(crossPlatformFocus.isWindows).toBe(false);
      expect(crossPlatformFocus.isMacOS).toBe(false);
    });

    it('should detect Windows platform correctly', () => {
      require('os').platform.mockReturnValue('win32');
      
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.platform).toBe('win32');
      expect(crossPlatformFocus.isWindows).toBe(true);
      expect(crossPlatformFocus.isLinux).toBe(false);
      expect(crossPlatformFocus.isMacOS).toBe(false);
    });

    it('should detect macOS platform correctly', () => {
      require('os').platform.mockReturnValue('darwin');
      
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.platform).toBe('darwin');
      expect(crossPlatformFocus.isMacOS).toBe(true);
      expect(crossPlatformFocus.isWindows).toBe(false);
      expect(crossPlatformFocus.isLinux).toBe(false);
    });
  });

  describe('Platform-Specific Timing', () => {
    describe('getFocusDelay', () => {
      it('should return 50ms for Windows', () => {
        require('os').platform.mockReturnValue('win32');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getFocusDelay()).toBe(50);
        expect(crossPlatformFocus.focusDelay).toBe(50);
      });

      it('should return 25ms for macOS', () => {
        require('os').platform.mockReturnValue('darwin');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getFocusDelay()).toBe(25);
        expect(crossPlatformFocus.focusDelay).toBe(25);
      });

      it('should return 35ms for Linux and other platforms', () => {
        require('os').platform.mockReturnValue('linux');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getFocusDelay()).toBe(35);
        expect(crossPlatformFocus.focusDelay).toBe(35);
      });
    });

    describe('getRetryDelay', () => {
      it('should return 75ms for Windows', () => {
        require('os').platform.mockReturnValue('win32');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getRetryDelay()).toBe(75);
      });

      it('should return 50ms for macOS', () => {
        require('os').platform.mockReturnValue('darwin');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getRetryDelay()).toBe(50);
      });
    });

    describe('getValidationDelay', () => {
      it('should return 100ms for Windows', () => {
        require('os').platform.mockReturnValue('win32');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getValidationDelay()).toBe(100);
      });

      it('should return 75ms for macOS', () => {
        require('os').platform.mockReturnValue('darwin');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getValidationDelay()).toBe(75);
      });
    });
  });

  describe('Basic Focus Operations', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should handle null elements gracefully', async () => {
      const result = await crossPlatformFocus.setFocus(null);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Cannot set focus: element is null');
    });

    it('should handle elements without focus method', async () => {
      const mockElement = {};
      
      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Element does not have focus method', {
        elementType: 'Object',
        platform: 'linux',
      });
    });

    it('should handle successful focus operation', async () => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = mockElement; // Simulate successful focus
      
      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle focus failure', async () => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = null; // Focus fails
      
      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('Platform-Specific Focus Behavior', () => {
    it('should handle Windows platform focus with render', async () => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = mockElement;
      
      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle macOS platform focus', async () => {
      require('os').platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = mockElement;
      
      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should handle focus method errors', async () => {
      const mockElement = { 
        focus: jest.fn().mockImplementation(() => {
          throw new Error('Focus failed');
        })
      };
      
      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true, retries: 1 });
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Focus setting failed', {
        error: 'Focus failed',
        platform: 'linux',
      });
    });

    it('should handle unknown platforms', () => {
      require('os').platform.mockReturnValue('unknown-os');
      const unknownFocus = new CrossPlatformFocus(mockScreen);
      
      expect(unknownFocus.getFocusDelay()).toBe(35);
      expect(unknownFocus.getRetryDelay()).toBe(60);
      expect(unknownFocus.getValidationDelay()).toBe(85);
    });
  });

  describe('Resize Handling', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      mockScreen.on = jest.fn();
    });

    it('should setup resize handling with callback', (done) => {
      const mockOnResize = jest.fn();
      
      crossPlatformFocus.setupResizeHandling(mockOnResize);
      
      expect(mockScreen.on).toHaveBeenCalledWith('resize', expect.any(Function));
      
      // Trigger resize event
      const resizeHandler = mockScreen.on.mock.calls[0][1];
      resizeHandler();
      
      // Wait for timeout and check callback
      setTimeout(() => {
        expect(mockOnResize).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should setup resize handling without callback', () => {
      crossPlatformFocus.setupResizeHandling();
      
      expect(mockScreen.on).toHaveBeenCalledWith('resize', expect.any(Function));
      
      // Should not throw error when no callback provided
      const resizeHandler = mockScreen.on.mock.calls[0][1];
      expect(() => resizeHandler()).not.toThrow();
    });

    it('should use longer delay for Windows resize', () => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      mockScreen.on = jest.fn();
      const mockOnResize = jest.fn();
      
      crossPlatformFocus.setupResizeHandling(mockOnResize);
      const resizeHandler = mockScreen.on.mock.calls[0][1];
      
      // Mock setTimeout to verify Windows uses 100ms delay
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        expect(delay).toBe(100);
        return originalSetTimeout(fn, delay);
      });
      
      resizeHandler();
      
      global.setTimeout = originalSetTimeout;
    });

    it('should use shorter delay for macOS and Linux resize', () => {
      const mockOnResize = jest.fn();
      
      crossPlatformFocus.setupResizeHandling(mockOnResize);
      const resizeHandler = mockScreen.on.mock.calls[0][1];
      
      // Mock setTimeout to verify non-Windows uses 50ms delay
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        expect(delay).toBe(50);
        return originalSetTimeout(fn, delay);
      });
      
      resizeHandler();
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Focus Preservation After Resize', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should preserve focus when current focus exists', (done) => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = mockElement;
      jest.spyOn(crossPlatformFocus, 'setFocus').mockResolvedValue(true);
      
      crossPlatformFocus.preserveFocusAfterResize();
      
      // Initially focused element should be remembered
      expect(mockScreen.focused).toBe(mockElement);
      
      // Simulate focus lost during resize
      setTimeout(() => {
        mockScreen.focused = null;
      }, 10);
      
      // Wait for focus restoration attempt
      setTimeout(() => {
        expect(crossPlatformFocus.setFocus).toHaveBeenCalledWith(mockElement, { immediate: true });
        expect(logger.debug).toHaveBeenCalledWith('Focus lost during resize, restoring', {
          platform: 'linux',
        });
        done();
      }, crossPlatformFocus.focusDelay + 20);
    });

    it('should do nothing when no focus to preserve', () => {
      mockScreen.focused = null;
      jest.spyOn(crossPlatformFocus, 'setFocus');
      
      crossPlatformFocus.preserveFocusAfterResize();
      
      expect(logger.debug).toHaveBeenCalledWith('No focus to preserve after resize');
      expect(crossPlatformFocus.setFocus).not.toHaveBeenCalled();
    });

    it('should not restore focus if still focused after resize', (done) => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = mockElement;
      jest.spyOn(crossPlatformFocus, 'setFocus');
      
      crossPlatformFocus.preserveFocusAfterResize();
      
      // Focus remains the same after delay
      setTimeout(() => {
        expect(crossPlatformFocus.setFocus).not.toHaveBeenCalled();
        done();
      }, crossPlatformFocus.focusDelay + 10);
    });
  });

  describe('Focus Validation Interval', () => {
    it('should return 1500ms for Windows', () => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.getFocusValidationInterval()).toBe(1500);
    });

    it('should return 2500ms for macOS', () => {
      require('os').platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.getFocusValidationInterval()).toBe(2500);
    });

    it('should return 2000ms for Linux and other platforms', () => {
      require('os').platform.mockReturnValue('linux');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.getFocusValidationInterval()).toBe(2000);
    });
  });

  describe('Blessed Event Handling Setup', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      mockScreen.on = jest.fn();
    });

    it('should setup focus, blur and render event handlers', () => {
      const handlers = {
        onFocus: jest.fn(),
        onBlur: jest.fn(),
        onRender: jest.fn()
      };
      
      crossPlatformFocus.setupBlessedEventHandling(handlers);
      
      expect(mockScreen.on).toHaveBeenCalledWith('element focus', expect.any(Function));
      expect(mockScreen.on).toHaveBeenCalledWith('element blur', expect.any(Function));
      expect(mockScreen.on).toHaveBeenCalledWith('render', expect.any(Function));
    });

    it('should handle focus events with onFocus callback', () => {
      const mockElement = { constructor: { name: 'TestElement' } };
      const handlers = { onFocus: jest.fn() };
      
      crossPlatformFocus.setupBlessedEventHandling(handlers);
      
      // Get the focus event handler and trigger it
      const focusHandler = mockScreen.on.mock.calls.find(call => call[0] === 'element focus')[1];
      focusHandler(mockElement);
      
      expect(handlers.onFocus).toHaveBeenCalledWith(mockElement);
      expect(logger.debug).toHaveBeenCalledWith('Element focus event', {
        platform: 'linux',
        element: 'TestElement'
      });
    });

    it('should handle focus events on Windows with process.nextTick', () => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      mockScreen.on = jest.fn();
      
      const mockElement = { constructor: { name: 'TestElement' } };
      const handlers = { onFocus: jest.fn() };
      
      crossPlatformFocus.setupBlessedEventHandling(handlers);
      
      const focusHandler = mockScreen.on.mock.calls.find(call => call[0] === 'element focus')[1];
      focusHandler(mockElement);
      
      // On Windows, onFocus should be called via process.nextTick
      process.nextTick(() => {
        expect(handlers.onFocus).toHaveBeenCalledWith(mockElement);
      });
    });

    it('should handle blur events with onBlur callback', () => {
      const mockElement = { constructor: { name: 'TestElement' } };
      const handlers = { onBlur: jest.fn() };
      
      crossPlatformFocus.setupBlessedEventHandling(handlers);
      
      const blurHandler = mockScreen.on.mock.calls.find(call => call[0] === 'element blur')[1];
      blurHandler(mockElement);
      
      expect(handlers.onBlur).toHaveBeenCalledWith(mockElement);
      expect(logger.debug).toHaveBeenCalledWith('Element blur event', {
        platform: 'linux',
        element: 'TestElement'
      });
    });

    it('should handle render events with onRender callback', () => {
      const handlers = { onRender: jest.fn() };
      
      crossPlatformFocus.setupBlessedEventHandling(handlers);
      
      const renderHandler = mockScreen.on.mock.calls.find(call => call[0] === 'render')[1];
      renderHandler();
      
      expect(handlers.onRender).toHaveBeenCalled();
    });

    it('should handle render events on Windows with delay', () => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      mockScreen.on = jest.fn();
      
      const handlers = { onRender: jest.fn() };
      
      crossPlatformFocus.setupBlessedEventHandling(handlers);
      
      const renderHandler = mockScreen.on.mock.calls.find(call => call[0] === 'render')[1];
      renderHandler();
      
      // On Windows, onRender should be called with 10ms delay
      setTimeout(() => {
        expect(handlers.onRender).toHaveBeenCalled();
      }, 15);
    });

    it('should work with empty handlers object', () => {
      crossPlatformFocus.setupBlessedEventHandling({});
      
      expect(mockScreen.on).toHaveBeenCalledTimes(3);
    });

    it('should work with no handlers provided', () => {
      crossPlatformFocus.setupBlessedEventHandling();
      
      expect(mockScreen.on).toHaveBeenCalledTimes(3);
    });
  });

  describe('Terminal Capabilities Validation', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      delete process.env.TERM;
      delete process.env.TERM_PROGRAM;
    });

    it('should return default capabilities for normal terminal', () => {
      const capabilities = crossPlatformFocus.validateTerminalCapabilities();
      
      expect(capabilities).toEqual({
        supportsMouseTracking: true,
        supportsFocusEvents: true,
        requiresDelayedFocus: false,
        recommendedValidationInterval: 2000
      });
    });

    it('should detect Windows platform requirements', () => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      const capabilities = crossPlatformFocus.validateTerminalCapabilities();
      
      expect(capabilities.requiresDelayedFocus).toBe(true);
      expect(capabilities.recommendedValidationInterval).toBe(1500);
    });

    it('should detect dumb terminal limitations', () => {
      process.env.TERM = 'dumb';
      
      const capabilities = crossPlatformFocus.validateTerminalCapabilities();
      
      expect(capabilities.supportsFocusEvents).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Terminal does not support focus events', { term: 'dumb' });
    });

    it('should detect Windows cmd terminal requirements', () => {
      require('os').platform.mockReturnValue('win32');
      process.env.TERM_PROGRAM = 'cmd';
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      const capabilities = crossPlatformFocus.validateTerminalCapabilities();
      
      expect(capabilities.requiresDelayedFocus).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith('Windows cmd detected, using delayed focus strategy');
    });
  });

  describe('Platform-Specific Focus Recovery', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should delegate to Windows recovery on Windows platform', async () => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { focus: jest.fn() };
      jest.spyOn(crossPlatformFocus, 'recoverFocusWindows').mockResolvedValue(true);
      
      const result = await crossPlatformFocus.recoverFocus(mockElement);
      
      expect(crossPlatformFocus.recoverFocusWindows).toHaveBeenCalledWith(mockElement);
      expect(result).toBe(true);
    });

    it('should delegate to macOS recovery on macOS platform', async () => {
      require('os').platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      const mockElement = { focus: jest.fn() };
      jest.spyOn(crossPlatformFocus, 'recoverFocusMacOS').mockResolvedValue(true);
      
      const result = await crossPlatformFocus.recoverFocus(mockElement);
      
      expect(crossPlatformFocus.recoverFocusMacOS).toHaveBeenCalledWith(mockElement);
      expect(result).toBe(true);
    });

    it('should delegate to Linux recovery on Linux platform', async () => {
      const mockElement = { focus: jest.fn() };
      jest.spyOn(crossPlatformFocus, 'recoverFocusLinux').mockResolvedValue(true);
      
      const result = await crossPlatformFocus.recoverFocus(mockElement);
      
      expect(crossPlatformFocus.recoverFocusLinux).toHaveBeenCalledWith(mockElement);
      expect(result).toBe(true);
    });

    it('should return false when terminal does not support focus events', async () => {
      process.env.TERM = 'dumb';
      const mockElement = { focus: jest.fn() };
      
      const result = await crossPlatformFocus.recoverFocus(mockElement);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Focus recovery not supported in this terminal');
    });
  });

  describe('Windows Focus Recovery', () => {
    beforeEach(() => {
      require('os').platform.mockReturnValue('win32');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should successfully recover focus on first attempt', async () => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = null;
      
      // Mock successful focus on first attempt
      setTimeout(() => {
        mockScreen.focused = mockElement;
      }, 50);
      
      const result = await crossPlatformFocus.recoverFocusWindows(mockElement);
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should retry multiple times before forcing focus', async () => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = null;
      
      const result = await crossPlatformFocus.recoverFocusWindows(mockElement);
      
      expect(mockElement.focus).toHaveBeenCalledTimes(5); // Max attempts
      expect(result).toBe(true); // Should force focus as last resort
    });

    it('should handle elements without focus method', async () => {
      const mockElement = {};
      
      const result = await crossPlatformFocus.recoverFocusWindows(mockElement);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Windows focus recovery failed: element has no focus method', {
        elementType: 'Object'
      });
    });

    it('should handle focus method errors and retry', async () => {
      const mockElement = { 
        focus: jest.fn().mockImplementation(() => {
          throw new Error('Focus failed');
        })
      };
      
      const result = await crossPlatformFocus.recoverFocusWindows(mockElement);
      
      expect(mockElement.focus).toHaveBeenCalledTimes(5);
      expect(result).toBe(false);
    });
  });

  describe('macOS Focus Recovery', () => {
    beforeEach(() => {
      require('os').platform.mockReturnValue('darwin');
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should use setFocus with 2 retries', async () => {
      const mockElement = { focus: jest.fn() };
      jest.spyOn(crossPlatformFocus, 'setFocus').mockResolvedValue(true);
      
      const result = await crossPlatformFocus.recoverFocusMacOS(mockElement);
      
      expect(crossPlatformFocus.setFocus).toHaveBeenCalledWith(mockElement, { retries: 2 });
      expect(result).toBe(true);
    });
  });

  describe('Linux Focus Recovery', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should successfully recover focus with process.nextTick', async () => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = null;
      
      // Mock successful focus after delay
      setTimeout(() => {
        mockScreen.focused = mockElement;
      }, 50);
      
      const result = await crossPlatformFocus.recoverFocusLinux(mockElement);
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should force focus if first attempt fails', async () => {
      const mockElement = { focus: jest.fn() };
      mockScreen.focused = null; // Focus will fail initially
      
      const result = await crossPlatformFocus.recoverFocusLinux(mockElement);
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(mockScreen.render).toHaveBeenCalled();
      expect(result).toBe(true); // Should force focus
    });

    it('should handle elements without focus method', async () => {
      const mockElement = {};
      
      const result = await crossPlatformFocus.recoverFocusLinux(mockElement);
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Linux focus recovery failed: element has no focus method', {
        elementType: 'Object'
      });
    });

    it('should handle focus method errors', async () => {
      const mockElement = { 
        focus: jest.fn().mockImplementation(() => {
          throw new Error('Focus failed');
        })
      };
      
      const result = await crossPlatformFocus.recoverFocusLinux(mockElement);
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Linux focus recovery failed', { error: 'Focus failed' });
    });
  });
});