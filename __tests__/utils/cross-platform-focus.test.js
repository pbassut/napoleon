const CrossPlatformFocus = require('../../src/utils/cross-platform-focus');
const os = require('os');
const logger = require('../../src/utils/logger');

// Mock dependencies
jest.mock('os');
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

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
    os.platform.mockReturnValue('linux');
  });

  describe('Constructor and Platform Detection', () => {
    it('should initialize with screen reference and detect Linux platform', () => {
      os.platform.mockReturnValue('linux');
      
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.screen).toBe(mockScreen);
      expect(crossPlatformFocus.platform).toBe('linux');
      expect(crossPlatformFocus.isLinux).toBe(true);
      expect(crossPlatformFocus.isWindows).toBe(false);
      expect(crossPlatformFocus.isMacOS).toBe(false);
    });

    it('should detect Windows platform correctly', () => {
      os.platform.mockReturnValue('win32');
      
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.platform).toBe('win32');
      expect(crossPlatformFocus.isWindows).toBe(true);
      expect(crossPlatformFocus.isLinux).toBe(false);
      expect(crossPlatformFocus.isMacOS).toBe(false);
    });

    it('should detect macOS platform correctly', () => {
      os.platform.mockReturnValue('darwin');
      
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(crossPlatformFocus.platform).toBe('darwin');
      expect(crossPlatformFocus.isMacOS).toBe(true);
      expect(crossPlatformFocus.isWindows).toBe(false);
      expect(crossPlatformFocus.isLinux).toBe(false);
    });

    it('should log debug information during initialization', () => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      
      expect(logger.debug).toHaveBeenCalledWith('Cross-platform focus initialized', {
        platform: 'linux',
        focusDelay: 35,
        retryDelay: 60,
      });
    });
  });

  describe('Platform-Specific Timing', () => {
    describe('getFocusDelay', () => {
      it('should return 50ms for Windows', () => {
        os.platform.mockReturnValue('win32');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getFocusDelay()).toBe(50);
        expect(crossPlatformFocus.focusDelay).toBe(50);
      });

      it('should return 25ms for macOS', () => {
        os.platform.mockReturnValue('darwin');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getFocusDelay()).toBe(25);
        expect(crossPlatformFocus.focusDelay).toBe(25);
      });

      it('should return 35ms for Linux and other platforms', () => {
        os.platform.mockReturnValue('linux');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getFocusDelay()).toBe(35);
        expect(crossPlatformFocus.focusDelay).toBe(35);
      });

      it('should return 35ms for unknown platforms', () => {
        os.platform.mockReturnValue('freebsd');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getFocusDelay()).toBe(35);
      });
    });

    describe('getRetryDelay', () => {
      it('should return 75ms for Windows', () => {
        os.platform.mockReturnValue('win32');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getRetryDelay()).toBe(75);
        expect(crossPlatformFocus.retryDelay).toBe(75);
      });

      it('should return 50ms for macOS', () => {
        os.platform.mockReturnValue('darwin');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getRetryDelay()).toBe(50);
        expect(crossPlatformFocus.retryDelay).toBe(50);
      });

      it('should return 60ms for Linux and other platforms', () => {
        os.platform.mockReturnValue('linux');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getRetryDelay()).toBe(60);
        expect(crossPlatformFocus.retryDelay).toBe(60);
      });
    });

    describe('getValidationDelay', () => {
      it('should return 100ms for Windows', () => {
        os.platform.mockReturnValue('win32');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getValidationDelay()).toBe(100);
        expect(crossPlatformFocus.validationDelay).toBe(100);
      });

      it('should return 75ms for macOS', () => {
        os.platform.mockReturnValue('darwin');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getValidationDelay()).toBe(75);
        expect(crossPlatformFocus.validationDelay).toBe(75);
      });

      it('should return 85ms for Linux and other platforms', () => {
        os.platform.mockReturnValue('linux');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        expect(crossPlatformFocus.getValidationDelay()).toBe(85);
        expect(crossPlatformFocus.validationDelay).toBe(85);
      });
    });
  });

  describe('Focus Operations', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    describe('setFocus', () => {
      it('should handle null elements gracefully', async () => {
        const result = await crossPlatformFocus.setFocus(null);
        
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith('Cannot set focus: element is null');
      });

      it('should handle elements without focus method', async () => {
        const mockElement = {};
        
        const promise = crossPlatformFocus.setFocus(mockElement);
        jest.advanceTimersByTime(35);
        const result = await promise;
        
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith('Element does not have focus method', {
          elementType: 'Object',
          platform: 'linux',
        });
      });

      it('should handle Windows platform-specific focus with render', async () => {
        os.platform.mockReturnValue('win32');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        const mockElement = { focus: jest.fn() };
        
        const promise = crossPlatformFocus.setFocus(mockElement, { immediate: true });
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalled();
        expect(mockScreen.render).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle macOS platform-specific focus', async () => {
        os.platform.mockReturnValue('darwin');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        const mockElement = { focus: jest.fn() };
        
        const promise = crossPlatformFocus.setFocus(mockElement, { immediate: true });
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalled();
        expect(mockScreen.render).not.toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should handle Linux platform-specific focus', async () => {
        os.platform.mockReturnValue('linux');
        crossPlatformFocus = new CrossPlatformFocus(mockScreen);
        
        const mockElement = { focus: jest.fn() };
        
        const promise = crossPlatformFocus.setFocus(mockElement, { immediate: true });
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should retry on focus errors', async () => {
        const mockElement = { 
          focus: jest.fn()
            .mockImplementationOnce(() => { throw new Error('First fail'); })
            .mockImplementationOnce(() => {}) // Success on second try
        };
        
        const promise = crossPlatformFocus.setFocus(mockElement, { retries: 2, immediate: true });
        jest.advanceTimersByTime(60); // Advance by retry delay
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalledTimes(2);
        expect(result).toBe(true);
      });

      it('should give up after max retries', async () => {
        const mockElement = { 
          focus: jest.fn().mockImplementation(() => {
            throw new Error('Always fails');
          })
        };
        
        const promise = crossPlatformFocus.setFocus(mockElement, { retries: 2, immediate: true });
        jest.advanceTimersByTime(120); // Advance through retries
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalledTimes(2);
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith('Focus failed after retries', {
          retries: 2,
          error: expect.any(Error)
        });
      });

      it('should use delay when immediate is false', async () => {
        const mockElement = { focus: jest.fn() };
        
        const promise = crossPlatformFocus.setFocus(mockElement, { immediate: false });
        
        // Should not call focus immediately
        expect(mockElement.focus).not.toHaveBeenCalled();
        
        // Advance by focus delay
        jest.advanceTimersByTime(35);
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });

    describe('validateFocus', () => {
      it('should validate successful focus', async () => {
        const mockElement = { focus: jest.fn() };
        mockScreen.focused = mockElement;
        
        const result = await crossPlatformFocus.validateFocus(mockElement);
        
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('Focus validation successful', {
          element: mockElement
        });
      });

      it('should detect focus validation failure', async () => {
        const mockElement = { focus: jest.fn() };
        const otherElement = { focus: jest.fn() };
        mockScreen.focused = otherElement;
        
        const result = await crossPlatformFocus.validateFocus(mockElement);
        
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith('Focus validation failed', {
          expected: mockElement,
          actual: otherElement
        });
      });

      it('should handle no focused element', async () => {
        const mockElement = { focus: jest.fn() };
        mockScreen.focused = null;
        
        const result = await crossPlatformFocus.validateFocus(mockElement);
        
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith('Focus validation failed', {
          expected: mockElement,
          actual: null
        });
      });
    });

    describe('clearFocus', () => {
      it('should clear focus from screen', () => {
        mockScreen.focused = { focus: jest.fn() };
        
        crossPlatformFocus.clearFocus();
        
        expect(mockScreen.focused).toBe(null);
        expect(logger.debug).toHaveBeenCalledWith('Focus cleared');
      });
    });

    describe('getCurrentFocus', () => {
      it('should return currently focused element', () => {
        const focusedElement = { focus: jest.fn() };
        mockScreen.focused = focusedElement;
        
        const result = crossPlatformFocus.getCurrentFocus();
        
        expect(result).toBe(focusedElement);
      });

      it('should return null when no element is focused', () => {
        mockScreen.focused = null;
        
        const result = crossPlatformFocus.getCurrentFocus();
        
        expect(result).toBe(null);
      });
    });

    describe('hasFocus', () => {
      it('should return true when element has focus', () => {
        const element = { focus: jest.fn() };
        mockScreen.focused = element;
        
        const result = crossPlatformFocus.hasFocus(element);
        
        expect(result).toBe(true);
      });

      it('should return false when element does not have focus', () => {
        const element = { focus: jest.fn() };
        const otherElement = { focus: jest.fn() };
        mockScreen.focused = otherElement;
        
        const result = crossPlatformFocus.hasFocus(element);
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Advanced Focus Operations', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    describe('setFocusWithValidation', () => {
      it('should set focus and validate successfully', async () => {
        const mockElement = { focus: jest.fn() };
        mockScreen.focused = mockElement; // Simulate successful focus
        
        const promise = crossPlatformFocus.setFocusWithValidation(mockElement);
        jest.advanceTimersByTime(35 + 85); // Focus delay + validation delay
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should retry if validation fails', async () => {
        const mockElement = { focus: jest.fn() };
        let focusCallCount = 0;
        
        // Mock screen to simulate focus failing first time, succeeding second time
        Object.defineProperty(mockScreen, 'focused', {
          get: () => {
            focusCallCount++;
            return focusCallCount > 1 ? mockElement : null;
          },
          configurable: true
        });
        
        const promise = crossPlatformFocus.setFocusWithValidation(mockElement, { maxRetries: 2 });
        jest.advanceTimersByTime(300); // Allow for retries and validation
        const result = await promise;
        
        expect(mockElement.focus).toHaveBeenCalledTimes(2);
        expect(result).toBe(true);
      });
    });

    describe('ensureFocus', () => {
      it('should ensure focus on element', async () => {
        const mockElement = { focus: jest.fn() };
        mockScreen.focused = mockElement;
        
        const result = await crossPlatformFocus.ensureFocus(mockElement);
        
        expect(result).toBe(true);
      });

      it('should handle focus failures gracefully', async () => {
        const mockElement = { 
          focus: jest.fn().mockImplementation(() => {
            throw new Error('Focus failed');
          })
        };
        
        const promise = crossPlatformFocus.ensureFocus(mockElement);
        jest.advanceTimersByTime(200);
        const result = await promise;
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Platform Detection Helpers', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should detect platform correctly through helper methods', () => {
      os.platform.mockReturnValue('win32');
      const windowsFocus = new CrossPlatformFocus(mockScreen);
      expect(windowsFocus.isWindowsPlatform()).toBe(true);
      expect(windowsFocus.isMacOSPlatform()).toBe(false);
      expect(windowsFocus.isLinuxPlatform()).toBe(false);

      os.platform.mockReturnValue('darwin');
      const macFocus = new CrossPlatformFocus(mockScreen);
      expect(macFocus.isWindowsPlatform()).toBe(false);
      expect(macFocus.isMacOSPlatform()).toBe(true);
      expect(macFocus.isLinuxPlatform()).toBe(false);

      os.platform.mockReturnValue('linux');
      const linuxFocus = new CrossPlatformFocus(mockScreen);
      expect(linuxFocus.isWindowsPlatform()).toBe(false);
      expect(linuxFocus.isMacOSPlatform()).toBe(false);
      expect(linuxFocus.isLinuxPlatform()).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      crossPlatformFocus = new CrossPlatformFocus(mockScreen);
    });

    it('should handle screen without focused property', () => {
      const screenWithoutFocus = {};
      const focus = new CrossPlatformFocus(screenWithoutFocus);
      
      expect(() => focus.getCurrentFocus()).not.toThrow();
      expect(focus.getCurrentFocus()).toBe(undefined);
    });

    it('should handle unknown platforms with default timing', () => {
      os.platform.mockReturnValue('unknown-os');
      const unknownFocus = new CrossPlatformFocus(mockScreen);
      
      expect(unknownFocus.getFocusDelay()).toBe(35);
      expect(unknownFocus.getRetryDelay()).toBe(60);
      expect(unknownFocus.getValidationDelay()).toBe(85);
    });

    it('should handle elements without constructor', () => {
      const elementWithoutConstructor = Object.create(null);
      elementWithoutConstructor.focus = undefined;
      
      expect(async () => {
        await crossPlatformFocus.setFocus(elementWithoutConstructor);
      }).not.toThrow();
    });

    it('should handle async focus methods', async () => {
      const mockElement = { 
        focus: jest.fn().mockResolvedValue(undefined)
      };
      
      const result = await crossPlatformFocus.setFocus(mockElement, { immediate: true });
      
      expect(mockElement.focus).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});