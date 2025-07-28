import * as os from 'os';
import {
  normalizeKey,
  keyBindings,
  matchesBinding,
  getKeyDescription,
  debugKey,
} from '../../../../src/ui/ink/utils/input-normalizer';

// Mock terminal capabilities
jest.mock('../../../../src/ui/ink/utils/terminal-capabilities', () => ({
  isWindowsTerminal: jest.fn(() => false),
  isMacTerminal: jest.fn(() => false),
}));

// Mock os module to control platform detection
jest.mock('os', () => ({
  platform: jest.fn(),
}));

import { isWindowsTerminal, isMacTerminal } from '../../../../src/ui/ink/utils/terminal-capabilities';

const mockIsWindowsTerminal = isWindowsTerminal as jest.MockedFunction<typeof isWindowsTerminal>;
const mockIsMacTerminal = isMacTerminal as jest.MockedFunction<typeof isMacTerminal>;

describe('Input Normalizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWindowsTerminal.mockReturnValue(false);
    mockIsMacTerminal.mockReturnValue(false);
  });

  describe('normalizeKey', () => {
    describe('Basic key handling', () => {
      it('should preserve basic key properties', () => {
        const input = 'a';
        const key = { name: 'a' };
        
        const result = normalizeKey(input, key);
        
        expect(result.name).toBe('a');
      });

      it('should create copy of key object', () => {
        const input = 'a';
        const key = { name: 'a', custom: true };
        
        const result = normalizeKey(input, key);
        
        expect(result).not.toBe(key);
        expect(result.custom).toBe(true);
      });
    });

    describe('macOS platform handling', () => {
      beforeEach(() => {
        (os.platform as jest.Mock).mockReturnValue('darwin');
      });

      it('should convert meta to alt on macOS', () => {
        const input = 'a';
        const key = { name: 'a', meta: true };
        
        const result = normalizeKey(input, key);
        
        expect(result.alt).toBe(true);
        expect(result.meta).toBe(false);
      });

      it('should not convert meta to alt if alt already exists', () => {
        const input = 'a';
        const key = { name: 'a', meta: true, alt: true };
        
        const result = normalizeKey(input, key);
        
        expect(result.alt).toBe(true);
        expect(result.meta).toBe(true);
      });

      it('should convert Mac delete to backspace', () => {
        const input = '\x7f';
        const key = { delete: true };
        
        const result = normalizeKey(input, key);
        
        expect(result.backspace).toBe(true);
        expect(result.delete).toBe(false);
      });

      it('should not convert fn+delete to backspace', () => {
        const input = '\x1b[3~';
        const key = { delete: true, fn: true };
        
        const result = normalizeKey(input, key);
        
        expect(result.delete).toBe(true);
        expect(result.backspace).toBeFalsy();
      });
    });

    describe('Windows Terminal handling', () => {
      beforeEach(() => {
        mockIsWindowsTerminal.mockReturnValue(true);
      });

      it('should handle Ctrl+Left Arrow', () => {
        const input = '\x1b[1;5D';
        const key = {};
        
        const result = normalizeKey(input, key);
        
        expect(result.ctrl).toBe(true);
        expect(result.leftArrow).toBe(true);
      });

      it('should handle Ctrl+Right Arrow', () => {
        const input = '\x1b[1;5C';
        const key = {};
        
        const result = normalizeKey(input, key);
        
        expect(result.ctrl).toBe(true);
        expect(result.rightArrow).toBe(true);
      });
    });

    describe('Mac Terminal.app handling', () => {
      beforeEach(() => {
        mockIsMacTerminal.mockReturnValue(true);
      });

      it('should handle Page Up in Terminal.app', () => {
        const input = '\x1b[5~';
        const key = {};
        
        const result = normalizeKey(input, key);
        
        expect(result.pageUp).toBe(true);
      });

      it('should handle Page Down in Terminal.app', () => {
        const input = '\x1b[6~';
        const key = {};
        
        const result = normalizeKey(input, key);
        
        expect(result.pageDown).toBe(true);
      });
    });

    describe('Escape sequences', () => {
      it('should handle arrow keys', () => {
        expect(normalizeKey('\x1b[A', {}).upArrow).toBe(true);
        expect(normalizeKey('\x1b[B', {}).downArrow).toBe(true);
        expect(normalizeKey('\x1b[C', {}).rightArrow).toBe(true);
        expect(normalizeKey('\x1b[D', {}).leftArrow).toBe(true);
      });

      it('should handle home and end keys', () => {
        expect(normalizeKey('\x1b[H', {}).home).toBe(true);
        expect(normalizeKey('\x1b[F', {}).end).toBe(true);
      });

      it('should handle insert and delete keys', () => {
        expect(normalizeKey('\x1b[2~', {}).insert).toBe(true);
        expect(normalizeKey('\x1b[3~', {}).delete).toBe(true);
      });

      it('should handle page up and page down keys', () => {
        expect(normalizeKey('\x1b[5~', {}).pageUp).toBe(true);
        expect(normalizeKey('\x1b[6~', {}).pageDown).toBe(true);
      });

      it('should handle function keys F1-F4', () => {
        expect(normalizeKey('\x1bOP', {}).f1).toBe(true);
        expect(normalizeKey('\x1bOQ', {}).f2).toBe(true);
        expect(normalizeKey('\x1bOR', {}).f3).toBe(true);
        expect(normalizeKey('\x1bOS', {}).f4).toBe(true);
      });

      it('should handle function keys F5-F12', () => {
        expect(normalizeKey('\x1b[15~', {}).f5).toBe(true);
        expect(normalizeKey('\x1b[17~', {}).f6).toBe(true);
        expect(normalizeKey('\x1b[18~', {}).f7).toBe(true);
        expect(normalizeKey('\x1b[19~', {}).f8).toBe(true);
        expect(normalizeKey('\x1b[20~', {}).f9).toBe(true);
        expect(normalizeKey('\x1b[21~', {}).f10).toBe(true);
        expect(normalizeKey('\x1b[23~', {}).f11).toBe(true);
        expect(normalizeKey('\x1b[24~', {}).f12).toBe(true);
      });
    });

    describe('Control character handling', () => {
      it('should handle backspace (ASCII 127)', () => {
        const input = '\x7f';
        const key = {};
        
        const result = normalizeKey(input, key);
        
        expect(result.backspace).toBe(true);
      });

      it('should handle Ctrl+A through Ctrl+Z', () => {
        // Ctrl+A (ASCII 1)
        const resultA = normalizeKey('\x01', {});
        expect(resultA.ctrl).toBe(true);
        expect(resultA.name).toBe('a');

        // Ctrl+Z (ASCII 26)
        const resultZ = normalizeKey('\x1a', {});
        expect(resultZ.ctrl).toBe(true);
        expect(resultZ.name).toBe('z');
      });

      it('should handle special control characters', () => {
        // Ctrl+C (ASCII 3)
        const resultC = normalizeKey('\x03', {});
        expect(resultC.ctrl).toBe(true);
        expect(resultC.name).toBe('c');

        // Ctrl+D (ASCII 4)
        const resultD = normalizeKey('\x04', {});
        expect(resultD.ctrl).toBe(true);
        expect(resultD.name).toBe('d');
      });

      it('should handle Tab (ASCII 9)', () => {
        const result = normalizeKey('\x09', {});
        
        expect(result.tab).toBe(true);
        expect(result.ctrl).toBe(false);
      });

      it('should handle Enter (ASCII 13)', () => {
        const result = normalizeKey('\x0d', {});
        
        expect(result.return).toBe(true);
        expect(result.ctrl).toBe(false);
      });

      it('should handle Escape (ASCII 27)', () => {
        const result = normalizeKey('\x1b', {});
        
        expect(result.escape).toBe(true);
        expect(result.ctrl).toBe(false);
      });
    });

    describe('Function key normalization', () => {
      it('should normalize function key names', () => {
        const key = { name: 'f1' };
        const result = normalizeKey('', key);
        
        expect(result.f1).toBe(true);
      });

      it('should handle all function keys F1-F12', () => {
        for (let i = 1; i <= 12; i++) {
          const key = { name: `f${i}` };
          const result = normalizeKey('', key);
          
          expect(result[`f${i}`]).toBe(true);
        }
      });

      it('should ignore invalid function key numbers', () => {
        const key = { name: 'f13' };
        const result = normalizeKey('', key);
        
        expect(result.f13).toBeFalsy();
      });

      it('should ignore non-function key names starting with f', () => {
        const key = { name: 'foo' };
        const result = normalizeKey('', key);
        
        expect(result.foo).toBeFalsy();
      });
    });

    describe('Edge cases', () => {
      it('should handle empty input', () => {
        const result = normalizeKey('', {});
        
        expect(Object.keys(result)).toHaveLength(0);
      });

      it('should handle null/undefined key properties', () => {
        const key = { name: null, meta: undefined };
        const result = normalizeKey('a', key);
        
        expect(result.name).toBe(null);
        expect(result.meta).toBe(undefined);
      });

      it('should handle unknown escape sequences', () => {
        const input = '\x1b[999~';
        const key = {};
        
        const result = normalizeKey(input, key);
        
        // Should not throw or modify the key
        expect(Object.keys(result)).toHaveLength(0);
      });
    });
  });

  describe('keyBindings', () => {
    it('should have navigation bindings', () => {
      expect(keyBindings.up).toEqual(['upArrow', 'k']);
      expect(keyBindings.down).toEqual(['downArrow', 'j']);
      expect(keyBindings.left).toEqual(['leftArrow', 'h']);
      expect(keyBindings.right).toEqual(['rightArrow', 'l']);
    });

    it('should have action bindings', () => {
      expect(keyBindings.select).toEqual(['return', 'space']);
      expect(keyBindings.cancel).toEqual(['escape', 'q']);
      expect(keyBindings.search).toEqual(['/']);
    });

    it('should have agent operation bindings', () => {
      expect(keyBindings.spawn).toEqual(['n']);
      expect(keyBindings.terminate).toEqual(['d', 'delete']);
      expect(keyBindings.info).toEqual(['i', 'return']);
    });

    it('should have special bindings', () => {
      expect(keyBindings.quit).toEqual(['q', 'ctrl+c']);
    });
  });

  describe('matchesBinding', () => {
    it('should match simple key bindings', () => {
      const key = { upArrow: true };
      
      expect(matchesBinding(key, 'up')).toBe(true);
      expect(matchesBinding(key, 'down')).toBe(false);
    });

    it('should match key name bindings', () => {
      const key = { name: 'j' };
      
      expect(matchesBinding(key, 'down')).toBe(true);
      expect(matchesBinding(key, 'up')).toBe(false);
    });

    it('should match modifier combinations', () => {
      const key = { ctrl: true, name: 'c' };
      
      expect(matchesBinding(key, 'quit')).toBe(true);
    });

    it('should handle modifier key properties', () => {
      const key = { ctrl: true, c: true };
      
      expect(matchesBinding(key, 'quit')).toBe(true);
    });

    it('should return false for unknown bindings', () => {
      const key = { name: 'x' };
      
      expect(matchesBinding(key, 'unknown')).toBe(false);
    });

    it('should handle complex binding matching', () => {
      // Test space key for select
      const spaceKey = { name: 'space' };
      expect(matchesBinding(spaceKey, 'select')).toBe(true);

      // Test return key for select
      const returnKey = { return: true };
      expect(matchesBinding(returnKey, 'select')).toBe(true);
    });

    it('should handle multiple modifiers', () => {
      const key = { ctrl: true, shift: true, name: 'a' };
      
      // Should not match ctrl+c (quit) due to additional shift modifier
      expect(matchesBinding(key, 'quit')).toBe(false);
    });
  });

  describe('getKeyDescription', () => {
    it('should return human-readable descriptions', () => {
      expect(getKeyDescription('up')).toBe('↑/K');
      expect(getKeyDescription('down')).toBe('↓/J');
      expect(getKeyDescription('left')).toBe('←/H');
      expect(getKeyDescription('right')).toBe('→/L');
    });

    it('should handle special key names', () => {
      expect(getKeyDescription('select')).toBe('Enter/Space');
      expect(getKeyDescription('cancel')).toBe('Esc/Q');
    });

    it('should handle modifier combinations', () => {
      expect(getKeyDescription('quit')).toBe('Q/Ctrl+C');
      expect(getKeyDescription('pageUp')).toBe('PgUp/Ctrl+U');
    });

    it('should return empty string for unknown bindings', () => {
      expect(getKeyDescription('unknown')).toBe('');
    });

    it('should capitalize key names', () => {
      expect(getKeyDescription('search')).toBe('/');
      expect(getKeyDescription('help')).toBe('?/F1');
    });

    it('should handle single character bindings', () => {
      expect(getKeyDescription('spawn')).toBe('N');
      expect(getKeyDescription('search')).toBe('/');
    });
  });

  describe('debugKey', () => {
    it('should format printable characters', () => {
      const result = debugKey('a', { name: 'a' });
      
      expect(result).toBe('Input: "a" Key: {"name":"a"}');
    });

    it('should format control characters as hex', () => {
      const result = debugKey('\x03', { ctrl: true, name: 'c' });
      
      expect(result).toBe('Input: "\\x03" Key: {"ctrl":true,"name":"c"}');
    });

    it('should handle escape sequences', () => {
      const result = debugKey('\x1b[A', { upArrow: true });
      
      expect(result).toBe('Input: "\\x1b[A" Key: {"upArrow":true}');
    });

    it('should handle mixed content', () => {
      const result = debugKey('a\x03b', { mixed: true });
      
      expect(result).toBe('Input: "a\\x03b" Key: {"mixed":true}');
    });

    it('should handle empty input', () => {
      const result = debugKey('', {});
      
      expect(result).toBe('Input: "" Key: {}');
    });

    it('should handle Unicode characters', () => {
      const result = debugKey('🚀', { unicode: true });
      
      expect(result).toBe('Input: "🚀" Key: {"unicode":true}');
    });

    it('should format all control characters correctly', () => {
      for (let i = 0; i < 32; i++) {
        const char = String.fromCharCode(i);
        const hex = i.toString(16).padStart(2, '0');
        const result = debugKey(char, {});
        
        expect(result).toContain(`\\x${hex}`);
      }
    });

    it('should handle DEL character (127)', () => {
      const result = debugKey('\x7f', { backspace: true });
      
      expect(result).toBe('Input: "\\x7f" Key: {"backspace":true}');
    });
  });

  describe('Integration tests', () => {
    it('should work with typical arrow key navigation', () => {
      const upKey = normalizeKey('\x1b[A', {});
      expect(matchesBinding(upKey, 'up')).toBe(true);
      expect(getKeyDescription('up')).toBe('↑/K');
    });

    it('should work with Vim-style navigation', () => {
      const jKey = normalizeKey('j', { name: 'j' });
      expect(matchesBinding(jKey, 'down')).toBe(true);
    });

    it('should work with platform-specific key normalization', () => {
      (os.platform as jest.Mock).mockReturnValue('darwin');

      const deleteKey = normalizeKey('\x7f', { delete: true });
      expect(deleteKey.backspace).toBe(true);
      expect(deleteKey.delete).toBe(false);
    });

    it('should debug complex key sequences', () => {
      const input = '\x1b[1;5D';
      const key = { ctrl: true, leftArrow: true };
      const debug = debugKey(input, key);
      
      expect(debug).toContain('\\x1b[1;5D');
      expect(debug).toContain('"ctrl":true');
      expect(debug).toContain('"leftArrow":true');
    });
  });
});