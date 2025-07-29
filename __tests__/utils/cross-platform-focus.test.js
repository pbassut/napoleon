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
});