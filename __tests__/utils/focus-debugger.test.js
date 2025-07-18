const FocusDebugger = require('../../src/utils/focus-debugger');
const logger = require('../../src/utils/logger');

// Mock logger
jest.mock('../../src/utils/logger');

describe('FocusDebugger', () => {
  let mockScreen;
  let focusDebugger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock screen object
    mockScreen = {
      focused: null,
      constructor: { name: 'Screen' },
    };

    // Set debug environment variable
    process.env.NAPOLEON_DEBUG_FOCUS = 'true';
    
    focusDebugger = new FocusDebugger(mockScreen);
  });

  afterEach(() => {
    delete process.env.NAPOLEON_DEBUG_FOCUS;
  });

  describe('constructor', () => {
    it('should initialize with screen and empty focus log', () => {
      expect(focusDebugger.screen).toBe(mockScreen);
      expect(focusDebugger.focusLog).toEqual([]);
      expect(focusDebugger.isDebugging).toBe(true);
    });

    it('should disable debugging when environment variable is not set', () => {
      delete process.env.NAPOLEON_DEBUG_FOCUS;
      const focusDebuggerInstance = new FocusDebugger(mockScreen);
      expect(focusDebuggerInstance.isDebugging).toBe(false);
    });
  });

  describe('logFocusState', () => {
    it('should log focus state when debugging is enabled', () => {
      const mockElement = { constructor: { name: 'TestElement' } };
      mockScreen.focused = mockElement;

      focusDebugger.logFocusState('test-context');

      expect(focusDebugger.focusLog).toHaveLength(1);
      expect(focusDebugger.focusLog[0]).toMatchObject({
        context: 'test-context',
        focused: 'TestElement',
        screen: 'Screen',
      });
      expect(logger.debug).toHaveBeenCalledWith('Focus state', expect.any(Object));
    });

    it('should not log when debugging is disabled', () => {
      focusDebugger.isDebugging = false;
      focusDebugger.logFocusState('test-context');

      expect(focusDebugger.focusLog).toHaveLength(0);
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should maintain log size limit', () => {
      // Add 55 entries to exceed the 50 limit
      for (let i = 0; i < 55; i++) {
        focusDebugger.logFocusState(`context-${i}`);
      }

      expect(focusDebugger.focusLog).toHaveLength(50);
      expect(focusDebugger.focusLog[0].context).toBe('context-5'); // First 5 should be removed
    });
  });

  describe('dumpFocusHistory', () => {
    it('should dump history when debugging is enabled', () => {
      focusDebugger.logFocusState('test-context');
      focusDebugger.dumpFocusHistory();

      expect(logger.info).toHaveBeenCalledWith('Focus history dump', {
        history: expect.any(Array),
      });
    });

    it('should not dump when debugging is disabled', () => {
      focusDebugger.isDebugging = false;
      focusDebugger.dumpFocusHistory();

      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('validateFocusConsistency', () => {
    it('should return true when focus is consistent', () => {
      mockScreen.focused = mockScreen;
      const result = focusDebugger.validateFocusConsistency();

      expect(result).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should return false and warn when focus is inconsistent', () => {
      const otherElement = { constructor: { name: 'OtherElement' } };
      mockScreen.focused = otherElement;

      const result = focusDebugger.validateFocusConsistency();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Focus inconsistency detected', {
        current: 'OtherElement',
        expected: 'Screen',
      });
    });

    it('should handle null focused element', () => {
      mockScreen.focused = null;

      const result = focusDebugger.validateFocusConsistency();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Focus inconsistency detected', {
        current: 'none',
        expected: 'Screen',
      });
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events with default count', () => {
      for (let i = 0; i < 15; i++) {
        focusDebugger.logFocusState(`context-${i}`);
      }

      const recent = focusDebugger.getRecentEvents();
      expect(recent).toHaveLength(10);
      expect(recent[0].context).toBe('context-5');
      expect(recent[9].context).toBe('context-14');
    });

    it('should return specified number of recent events', () => {
      for (let i = 0; i < 10; i++) {
        focusDebugger.logFocusState(`context-${i}`);
      }

      const recent = focusDebugger.getRecentEvents(5);
      expect(recent).toHaveLength(5);
      expect(recent[0].context).toBe('context-5');
    });
  });

  describe('clearHistory', () => {
    it('should clear all focus log history', () => {
      focusDebugger.logFocusState('test-context');
      expect(focusDebugger.focusLog).toHaveLength(1);

      focusDebugger.clearHistory();
      expect(focusDebugger.focusLog).toHaveLength(0);
    });
  });

  describe('setDebugging', () => {
    it('should enable debugging and log status', () => {
      focusDebugger.setDebugging(true);

      expect(focusDebugger.isDebugging).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Focus debugging', { enabled: true });
    });

    it('should disable debugging and log status', () => {
      focusDebugger.setDebugging(false);

      expect(focusDebugger.isDebugging).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Focus debugging', { enabled: false });
    });
  });
});