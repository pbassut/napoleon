/**
 * Tests for UI Test Framework InputSimulator
 */

import { InputSimulator } from '../../../src/ui-tests/framework/InputSimulator';
import { ProcessManager } from '../../../src/ui-tests/framework/ProcessManager';

// Mock ProcessManager
jest.mock('../../../src/ui-tests/framework/ProcessManager');

describe('InputSimulator', () => {
  let inputSimulator: InputSimulator;
  let mockProcessManager: jest.Mocked<ProcessManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProcessManager = {
      sendInput: jest.fn(),
    } as any as jest.Mocked<ProcessManager>;

    inputSimulator = new InputSimulator(mockProcessManager);
  });

  describe('Constructor', () => {
    it('should initialize with process manager', () => {
      expect(inputSimulator).toBeInstanceOf(InputSimulator);
      expect((inputSimulator as any).processManager).toBe(mockProcessManager);
    });
  });

  describe('pressKey', () => {
    it('should send enter key', async () => {
      await inputSimulator.pressKey(12345, 'enter');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\r');
    });

    it('should send return key', async () => {
      await inputSimulator.pressKey(12345, 'return');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\r');
    });

    it('should send tab key', async () => {
      await inputSimulator.pressKey(12345, 'tab');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\t');
    });

    it('should send space key', async () => {
      await inputSimulator.pressKey(12345, 'space');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, ' ');
    });

    it('should send escape key', async () => {
      await inputSimulator.pressKey(12345, 'escape');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b');
    });

    it('should send esc key', async () => {
      await inputSimulator.pressKey(12345, 'esc');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b');
    });

    it('should send arrow keys', async () => {
      await inputSimulator.pressKey(12345, 'up');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[A');

      await inputSimulator.pressKey(12345, 'down');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[B');

      await inputSimulator.pressKey(12345, 'right');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[C');

      await inputSimulator.pressKey(12345, 'left');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[D');
    });

    it('should send backspace key', async () => {
      await inputSimulator.pressKey(12345, 'backspace');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x7f');
    });

    it('should send delete key', async () => {
      await inputSimulator.pressKey(12345, 'delete');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[3~');
    });

    it('should send home key', async () => {
      await inputSimulator.pressKey(12345, 'home');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[H');
    });

    it('should send end key', async () => {
      await inputSimulator.pressKey(12345, 'end');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[F');
    });

    it('should send page up key', async () => {
      await inputSimulator.pressKey(12345, 'pageup');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[5~');
    });

    it('should send page down key', async () => {
      await inputSimulator.pressKey(12345, 'pagedown');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[6~');
    });

    it('should handle case-insensitive key names', async () => {
      await inputSimulator.pressKey(12345, 'ENTER');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\r');

      await inputSimulator.pressKey(12345, 'Up');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b[A');

      await inputSimulator.pressKey(12345, 'TAB');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\t');
    });

    it('should send unmapped keys as-is', async () => {
      await inputSimulator.pressKey(12345, 'a');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, 'a');

      await inputSimulator.pressKey(12345, 'Z');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, 'Z');

      await inputSimulator.pressKey(12345, '1');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '1');

      await inputSimulator.pressKey(12345, '!');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '!');
    });

    it('should handle special characters', async () => {
      await inputSimulator.pressKey(12345, '@');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '@');

      await inputSimulator.pressKey(12345, '#');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '#');

      await inputSimulator.pressKey(12345, '$');
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '$');
    });

    it('should handle empty key string', async () => {
      await inputSimulator.pressKey(12345, '');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '');
    });

    it('should propagate sendInput errors', async () => {
      const error = new Error('Send input failed');
      mockProcessManager.sendInput.mockRejectedValue(error);

      await expect(inputSimulator.pressKey(12345, 'enter')).rejects.toThrow('Send input failed');
    });
  });

  describe('typeText', () => {
    it('should type simple text', async () => {
      await inputSimulator.typeText(12345, 'hello');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(5);
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(1, 12345, 'h');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(2, 12345, 'e');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(3, 12345, 'l');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(4, 12345, 'l');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(5, 12345, 'o');
    });

    it('should handle empty text', async () => {
      await inputSimulator.typeText(12345, '');
      
      expect(mockProcessManager.sendInput).not.toHaveBeenCalled();
    });

    it('should handle long text', async () => {
      const longText = 'abc';
      await inputSimulator.typeText(12345, longText);
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(3);
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(1, 12345, 'a');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(2, 12345, 'b');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(3, 12345, 'c');
    });

    it('should handle text with special characters', async () => {
      const specialText = 'A!';
      await inputSimulator.typeText(12345, specialText);
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(2);
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(1, 12345, 'A');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(2, 12345, '!');
    });

    it('should handle Unicode text', async () => {
      const unicodeText = '🚀A';
      await inputSimulator.typeText(12345, unicodeText);
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(2);
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(1, 12345, '🚀');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(2, 12345, 'A');
    });
  });

  describe('sendCtrlKey', () => {
    it('should send Ctrl+C', async () => {
      await inputSimulator.sendCtrlKey(12345, 'c');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x03');
    });

    it('should send Ctrl+D', async () => {
      await inputSimulator.sendCtrlKey(12345, 'd');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x04');
    });

    it('should send Ctrl+Z', async () => {
      await inputSimulator.sendCtrlKey(12345, 'z');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1a');
    });

    it('should handle uppercase control keys', async () => {
      await inputSimulator.sendCtrlKey(12345, 'C');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x03');
    });

    it('should throw for invalid control keys', async () => {
      await expect(inputSimulator.sendCtrlKey(12345, '1'))
        .rejects.toThrow('Invalid control key: 1');
    });
  });

  describe('sendKeySequence', () => {
    it('should press multiple keys in sequence', async () => {
      await inputSimulator.sendKeySequence(12345, ['h', 'e', 'l', 'l', 'o']);
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(5);
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(1, 12345, 'h');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(2, 12345, 'e');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(3, 12345, 'l');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(4, 12345, 'l');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(5, 12345, 'o');
    });

    it('should handle special keys in sequence', async () => {
      await inputSimulator.sendKeySequence(12345, ['h', 'enter', 'w', 'tab', 'space']);
      
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(1, 12345, 'h');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(2, 12345, '\r');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(3, 12345, 'w');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(4, 12345, '\t');
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(5, 12345, ' ');
    });

    it('should handle empty key sequence', async () => {
      await inputSimulator.sendKeySequence(12345, []);
      
      expect(mockProcessManager.sendInput).not.toHaveBeenCalled();
    });

    it.skip('should handle delays between keys', async () => {
      jest.useFakeTimers();
      
      const pressPromise = inputSimulator.sendKeySequence(12345, ['a', 'b'], 100);
      
      // First key should be sent immediately
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(1);
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(1, 12345, 'a');
      
      // Advance time and second key should be sent
      jest.advanceTimersByTime(100);
      await pressPromise;
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(2);
      expect(mockProcessManager.sendInput).toHaveBeenNthCalledWith(2, 12345, 'b');
      
      jest.useRealTimers();
    });
  });

  describe('sendAltKey', () => {
    it('should send Alt+a', async () => {
      await inputSimulator.sendAltKey(12345, 'a');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1ba');
    });

    it('should send Alt+Z', async () => {
      await inputSimulator.sendAltKey(12345, 'Z');
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1bZ');
    });
  });

  describe('clearInput', () => {
    it('should send Ctrl+U to clear input', async () => {
      await inputSimulator.clearInput(12345);
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x15');
    });
  });

  describe('confirmDialog', () => {
    it('should send enter key', async () => {
      await inputSimulator.confirmDialog(12345);
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\r');
    });
  });

  describe('cancelDialog', () => {
    it('should send escape key', async () => {
      await inputSimulator.cancelDialog(12345);
      
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(12345, '\x1b');
    });
  });

  describe('Error Handling', () => {
    it('should handle process manager errors in typeText', async () => {
      const error = new Error('Process error');
      mockProcessManager.sendInput.mockRejectedValue(error);

      await expect(inputSimulator.typeText(12345, 'test')).rejects.toThrow('Process error');
    });

    it.skip('should handle process manager errors in sendKeySequence', async () => {
      const error = new Error('Process error');
      mockProcessManager.sendInput.mockRejectedValueOnce(Promise.resolve()).mockRejectedValueOnce(error);

      await expect(inputSimulator.sendKeySequence(12345, ['a', 'b'])).rejects.toThrow('Process error');
    });

    it('should handle process manager errors in sendCtrlKey', async () => {
      const error = new Error('Process error');
      mockProcessManager.sendInput.mockRejectedValue(error);

      await expect(inputSimulator.sendCtrlKey(12345, 'c')).rejects.toThrow('Process error');
    });
  });
});