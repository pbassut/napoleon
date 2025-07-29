const FocusDebugger = require('../../src/utils/focus-debugger');
const logger = require('../../src/utils/logger');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('FocusDebugger', () => {
  let mockScreen;
  let focusDebugger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScreen = {
      focused: null,
      constructor: { name: 'MockScreen' }
    };
    
    // Clear environment variable
    delete process.env.NAPOLEON_DEBUG_FOCUS;
    
    focusDebugger = new FocusDebugger(mockScreen);
  });

  describe('Constructor', () => {
    it('should initialize with screen reference', () => {
      expect(focusDebugger.screen).toBe(mockScreen);
      expect(focusDebugger.focusLog).toEqual([]);
      expect(focusDebugger.isDebugging).toBe(false);
    });

    it('should enable debugging when environment variable is set', () => {
      process.env.NAPOLEON_DEBUG_FOCUS = 'true';
      const focusDebuggerInstance = new FocusDebugger(mockScreen);
      expect(focusDebuggerInstance.isDebugging).toBe(true);
    });

    it('should disable debugging for non-true environment values', () => {
      process.env.NAPOLEON_DEBUG_FOCUS = 'false';
      const focusDebuggerInstance = new FocusDebugger(mockScreen);
      expect(focusDebuggerInstance.isDebugging).toBe(false);
    });
  });

  describe('logFocusState', () => {
    it('should not log when debugging is disabled', () => {
      focusDebugger.logFocusState('test context');
      expect(logger.debug).not.toHaveBeenCalled();
      expect(focusDebugger.focusLog).toHaveLength(0);
    });

    it('should log focus state when debugging is enabled', () => {
      focusDebugger.setDebugging(true);
      mockScreen.focused = { constructor: { name: 'TestElement' } };
      
      focusDebugger.logFocusState('test context');
      
      expect(logger.debug).toHaveBeenCalledWith('Focus state', expect.objectContaining({
        context: 'test context',
        focused: 'TestElement',
        screen: 'MockScreen'
      }));
      expect(focusDebugger.focusLog).toHaveLength(1);
    });

    it('should handle no focused element', () => {
      focusDebugger.setDebugging(true);
      mockScreen.focused = null;
      
      focusDebugger.logFocusState('no focus');
      
      expect(logger.debug).toHaveBeenCalledWith('Focus state', expect.objectContaining({
        context: 'no focus',
        focused: 'none'
      }));
    });

    it('should limit log size to 50 entries', () => {
      focusDebugger.setDebugging(true);
      
      // Add 55 entries
      for (let i = 0; i < 55; i++) {
        focusDebugger.logFocusState(`context ${i}`);
      }
      
      expect(focusDebugger.focusLog).toHaveLength(50);
      expect(focusDebugger.focusLog[0].context).toBe('context 5');
      expect(focusDebugger.focusLog[49].context).toBe('context 54');
    });

    it('should include timestamp in logged state', () => {
      focusDebugger.setDebugging(true);
      const before = Date.now();
      
      focusDebugger.logFocusState('timestamp test');
      
      const after = Date.now();
      const logEntry = focusDebugger.focusLog[0];
      expect(logEntry.timestamp).toBeGreaterThanOrEqual(before);
      expect(logEntry.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('dumpFocusHistory', () => {
    it('should not dump when debugging is disabled', () => {
      focusDebugger.dumpFocusHistory();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should dump focus history when debugging is enabled', () => {
      focusDebugger.setDebugging(true);
      focusDebugger.logFocusState('test entry');
      
      focusDebugger.dumpFocusHistory();
      
      expect(logger.info).toHaveBeenCalledWith('Focus history dump', {
        history: focusDebugger.focusLog
      });
    });

    it('should dump empty history', () => {
      focusDebugger.setDebugging(true);
      
      focusDebugger.dumpFocusHistory();
      
      expect(logger.info).toHaveBeenCalledWith('Focus history dump', {
        history: []
      });
    });
  });

  describe('validateFocusConsistency', () => {
    it('should return true when focus is consistent', () => {
      mockScreen.focused = mockScreen; // Expected default focus
      
      const result = focusDebugger.validateFocusConsistency();
      
      expect(result).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should return false and warn when focus is inconsistent', () => {
      mockScreen.focused = { constructor: { name: 'UnexpectedElement' } };
      
      const result = focusDebugger.validateFocusConsistency();
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Focus inconsistency detected', {
        current: 'UnexpectedElement',
        expected: 'MockScreen'
      });
    });

    it('should handle null current focus', () => {
      mockScreen.focused = null;
      
      const result = focusDebugger.validateFocusConsistency();
      
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Focus inconsistency detected', {
        current: 'none',
        expected: 'MockScreen'
      });
    });
  });

  describe('determineExpectedFocus', () => {
    it('should return screen as default expected focus', () => {
      const expected = focusDebugger.determineExpectedFocus();
      expect(expected).toBe(mockScreen);
    });
  });

  describe('getRecentEvents', () => {
    it('should return empty array when no events logged', () => {
      const events = focusDebugger.getRecentEvents();
      expect(events).toEqual([]);
    });

    it('should return recent events with default count', () => {
      focusDebugger.setDebugging(true);
      
      for (let i = 0; i < 15; i++) {
        focusDebugger.logFocusState(`event ${i}`);
      }
      
      const events = focusDebugger.getRecentEvents();
      expect(events).toHaveLength(10);
      expect(events[0].context).toBe('event 5');
      expect(events[9].context).toBe('event 14');
    });

    it('should return recent events with custom count', () => {
      focusDebugger.setDebugging(true);
      
      for (let i = 0; i < 10; i++) {
        focusDebugger.logFocusState(`event ${i}`);
      }
      
      const events = focusDebugger.getRecentEvents(5);
      expect(events).toHaveLength(5);
      expect(events[0].context).toBe('event 5');
      expect(events[4].context).toBe('event 9');
    });

    it('should handle count larger than available events', () => {
      focusDebugger.setDebugging(true);
      focusDebugger.logFocusState('only event');
      
      const events = focusDebugger.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].context).toBe('only event');
    });
  });

  describe('clearHistory', () => {
    it('should clear all focus log entries', () => {
      focusDebugger.setDebugging(true);
      focusDebugger.logFocusState('test 1');
      focusDebugger.logFocusState('test 2');
      
      expect(focusDebugger.focusLog).toHaveLength(2);
      
      focusDebugger.clearHistory();
      
      expect(focusDebugger.focusLog).toEqual([]);
    });
  });

  describe('setDebugging', () => {
    it('should enable debugging and log status', () => {
      focusDebugger.setDebugging(true);
      
      expect(focusDebugger.isDebugging).toBe(true);
      expect(logger.info).toHaveBeenCalledWith('Focus debugging', { enabled: true });
    });

    it('should disable debugging and log status', () => {
      focusDebugger.setDebugging(true);
      focusDebugger.setDebugging(false);
      
      expect(focusDebugger.isDebugging).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Focus debugging', { enabled: false });
    });

    it('should affect logFocusState behavior', () => {
      // Initially disabled
      focusDebugger.logFocusState('disabled test');
      expect(logger.debug).not.toHaveBeenCalled();
      
      // Enable and test
      focusDebugger.setDebugging(true);
      focusDebugger.logFocusState('enabled test');
      expect(logger.debug).toHaveBeenCalledWith('Focus state', expect.any(Object));
      
      // Disable again
      jest.clearAllMocks();
      focusDebugger.setDebugging(false);
      focusDebugger.logFocusState('disabled again');
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle screen without constructor name', () => {
      const screenWithoutName = { focused: null };
      const focusDebuggerInstance = new FocusDebugger(screenWithoutName);
      focusDebuggerInstance.setDebugging(true);
      
      focusDebuggerInstance.logFocusState('no constructor name');
      
      expect(logger.debug).toHaveBeenCalledWith('Focus state', expect.objectContaining({
        screen: 'Object'
      }));
    });

    it('should handle focused element without constructor', () => {
      focusDebugger.setDebugging(true);
      mockScreen.focused = { name: 'ElementWithoutConstructor' };
      
      focusDebugger.logFocusState('no constructor');
      
      expect(logger.debug).toHaveBeenCalledWith('Focus state', expect.objectContaining({
        focused: 'Object'
      }));
    });

    it('should handle multiple rapid focus changes', () => {
      focusDebugger.setDebugging(true);
      
      const elements = [
        { constructor: { name: 'Element1' } },
        { constructor: { name: 'Element2' } },
        null,
        { constructor: { name: 'Element3' } }
      ];
      
      elements.forEach((element, index) => {
        mockScreen.focused = element;
        focusDebugger.logFocusState(`rapid change ${index}`);
      });
      
      expect(focusDebugger.focusLog).toHaveLength(4);
      expect(logger.debug).toHaveBeenCalledTimes(4);
    });
  });
});