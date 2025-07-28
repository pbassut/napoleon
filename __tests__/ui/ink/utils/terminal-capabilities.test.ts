/**
 * Tests for Terminal Capabilities Detection
 */

import * as os from 'os';
import {
  isWindowsTerminal,
  isITerm2,
  isMacTerminal,
  isHyper,
  isAlacritty,
  detectCapabilities,
  getBoxChar,
  getStatusSymbol,
  supportsFeature,
  getColorSupport,
  logTerminalInfo
} from '../../../../src/ui/ink/utils/terminal-capabilities';

// Mock os module
jest.mock('os');
const mockOs = os as jest.Mocked<typeof os>;

describe('Terminal Capabilities', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear all terminal-related environment variables
    delete process.env.WT_SESSION;
    delete process.env.TERMINAL_EMULATOR;
    delete process.env.TERM_PROGRAM;
    delete process.env.LC_TERMINAL;
    delete process.env.TERM;
    delete process.env.COLORTERM;
    delete process.env.LANG;
    delete process.env.LC_ALL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Terminal Detection Functions', () => {
    describe('isWindowsTerminal', () => {
      it('should detect Windows Terminal via WT_SESSION', () => {
        process.env.WT_SESSION = 'some-session-id';
        expect(isWindowsTerminal()).toBe(true);
      });

      it('should detect Windows Terminal via TERMINAL_EMULATOR', () => {
        process.env.TERMINAL_EMULATOR = 'Windows Terminal';
        expect(isWindowsTerminal()).toBe(true);
      });

      it('should return false when not Windows Terminal', () => {
        expect(isWindowsTerminal()).toBe(false);
      });

      it('should handle empty environment variables', () => {
        process.env.WT_SESSION = '';
        process.env.TERMINAL_EMULATOR = '';
        expect(isWindowsTerminal()).toBe(false);
      });
    });

    describe('isITerm2', () => {
      it('should detect iTerm2 via TERM_PROGRAM', () => {
        process.env.TERM_PROGRAM = 'iTerm.app';
        expect(isITerm2()).toBe(true);
      });

      it('should detect iTerm2 via LC_TERMINAL', () => {
        process.env.LC_TERMINAL = 'iTerm2';
        expect(isITerm2()).toBe(true);
      });

      it('should return false when not iTerm2', () => {
        expect(isITerm2()).toBe(false);
      });

      it('should handle different case in TERM_PROGRAM', () => {
        process.env.TERM_PROGRAM = 'iterm.app';
        expect(isITerm2()).toBe(false); // Should be case sensitive
      });
    });

    describe('isMacTerminal', () => {
      it('should detect macOS Terminal.app', () => {
        process.env.TERM_PROGRAM = 'Apple_Terminal';
        expect(isMacTerminal()).toBe(true);
      });

      it('should return false when not Terminal.app', () => {
        process.env.TERM_PROGRAM = 'Other_Terminal';
        expect(isMacTerminal()).toBe(false);
      });

      it('should return false with no TERM_PROGRAM', () => {
        expect(isMacTerminal()).toBe(false);
      });
    });

    describe('isHyper', () => {
      it('should detect Hyper terminal', () => {
        process.env.TERM_PROGRAM = 'Hyper';
        expect(isHyper()).toBe(true);
      });

      it('should return false when not Hyper', () => {
        process.env.TERM_PROGRAM = 'iTerm.app';
        expect(isHyper()).toBe(false);
      });

      it('should return false with no TERM_PROGRAM', () => {
        expect(isHyper()).toBe(false);
      });
    });

    describe('isAlacritty', () => {
      it('should detect Alacritty terminal', () => {
        process.env.TERM = 'alacritty';
        expect(isAlacritty()).toBe(true);
      });

      it('should return false when not Alacritty', () => {
        process.env.TERM = 'xterm-256color';
        expect(isAlacritty()).toBe(false);
      });

      it('should return false with no TERM', () => {
        expect(isAlacritty()).toBe(false);
      });
    });
  });

  describe('detectCapabilities', () => {
    describe('Color Detection', () => {
      it('should detect 24-bit color via truecolor', () => {
        process.env.COLORTERM = 'truecolor';
        const caps = detectCapabilities();
        expect(caps.colors).toBe(16777216);
      });

      it('should detect 24-bit color via 24bit', () => {
        process.env.COLORTERM = '24bit';
        const caps = detectCapabilities();
        expect(caps.colors).toBe(16777216);
      });

      it('should detect 256 colors via TERM', () => {
        process.env.TERM = 'xterm-256color';
        const caps = detectCapabilities();
        expect(caps.colors).toBe(256);
      });

      it('should detect 256 colors via COLORTERM', () => {
        process.env.COLORTERM = '256';
        const caps = detectCapabilities();
        expect(caps.colors).toBe(256);
      });

      it('should detect 16 colors via TERM with color', () => {
        process.env.TERM = 'xterm-color';
        const caps = detectCapabilities();
        expect(caps.colors).toBe(16);
      });

      it('should default to 8 colors', () => {
        process.env.TERM = 'dumb';
        const caps = detectCapabilities();
        expect(caps.colors).toBe(8);
      });
    });

    describe('Unicode Detection', () => {
      it('should detect Unicode via LANG', () => {
        process.env.LANG = 'en_US.UTF-8';
        const caps = detectCapabilities();
        expect(caps.unicode).toBe(true);
      });

      it('should detect Unicode via LC_ALL', () => {
        process.env.LC_ALL = 'C.UTF-8';
        const caps = detectCapabilities();
        expect(caps.unicode).toBe(true);
      });

      it('should detect Unicode via utf8 in LANG', () => {
        process.env.LANG = 'en_US.utf8';
        const caps = detectCapabilities();
        expect(caps.unicode).toBe(true);
      });

      it('should return false for non-UTF locales', () => {
        process.env.LANG = 'C';
        const caps = detectCapabilities();
        expect(caps.unicode).toBe(false);
      });
    });

    describe('Box Drawing Detection', () => {
      it('should enable box drawing with Unicode', () => {
        process.env.LANG = 'en_US.UTF-8';
        const caps = detectCapabilities();
        expect(caps.boxDrawing).toBe(true);
      });

      it('should enable box drawing with xterm', () => {
        process.env.TERM = 'xterm';
        const caps = detectCapabilities();
        expect(caps.boxDrawing).toBe(true);
      });

      it('should disable box drawing without Unicode or xterm', () => {
        process.env.TERM = 'dumb';
        process.env.LANG = 'C';
        const caps = detectCapabilities();
        expect(caps.boxDrawing).toBe(false);
      });
    });

    describe('Terminal-Specific Capabilities', () => {
      it('should configure Windows Terminal capabilities', () => {
        process.env.WT_SESSION = 'test';
        const caps = detectCapabilities();
        
        expect(caps.terminalName).toBe('Windows Terminal');
        expect(caps.unicode).toBe(true);
        expect(caps.boxDrawing).toBe(true);
        expect(caps.hyperlinks).toBe(true);
        expect(caps.colors).toBeGreaterThanOrEqual(256);
      });

      it('should configure iTerm2 capabilities', () => {
        process.env.TERM_PROGRAM = 'iTerm.app';
        const caps = detectCapabilities();
        
        expect(caps.terminalName).toBe('iTerm2');
        expect(caps.unicode).toBe(true);
        expect(caps.boxDrawing).toBe(true);
        expect(caps.hyperlinks).toBe(true);
        expect(caps.italics).toBe(true);
        expect(caps.colors).toBeGreaterThanOrEqual(256);
      });

      it('should configure Terminal.app capabilities', () => {
        process.env.TERM_PROGRAM = 'Apple_Terminal';
        const caps = detectCapabilities();
        
        expect(caps.terminalName).toBe('Terminal.app');
        expect(caps.unicode).toBe(true);
        expect(caps.boxDrawing).toBe(true);
        expect(caps.colors).toBeGreaterThanOrEqual(256);
      });

      it('should configure Hyper capabilities', () => {
        process.env.TERM_PROGRAM = 'Hyper';
        const caps = detectCapabilities();
        
        expect(caps.terminalName).toBe('Hyper');
        expect(caps.unicode).toBe(true);
        expect(caps.boxDrawing).toBe(true);
        expect(caps.hyperlinks).toBe(true);
        expect(caps.colors).toBeGreaterThanOrEqual(256);
      });

      it('should configure Alacritty capabilities', () => {
        process.env.TERM = 'alacritty';
        const caps = detectCapabilities();
        
        expect(caps.terminalName).toBe('Alacritty');
        expect(caps.unicode).toBe(true);
        expect(caps.boxDrawing).toBe(true);
        expect(caps.colors).toBeGreaterThanOrEqual(256);
      });

      it('should preserve higher color counts', () => {
        process.env.TERM_PROGRAM = 'iTerm.app';
        process.env.COLORTERM = 'truecolor';
        const caps = detectCapabilities();
        
        expect(caps.colors).toBe(16777216); // Should keep 24-bit, not downgrade to 256
      });
    });

    describe('Default Values', () => {
      it('should return default capabilities for unknown terminal', () => {
        const caps = detectCapabilities();
        
        expect(caps.terminalName).toBe('unknown');
        expect(caps.colors).toBe(8);
        expect(caps.unicode).toBe(false);
        expect(caps.boxDrawing).toBe(false);
        expect(caps.mouse).toBe(false);
        expect(caps.altBuffer).toBe(false);
        expect(caps.italics).toBe(false);
        expect(caps.hyperlinks).toBe(false);
      });
    });
  });

  describe('getBoxChar', () => {
    describe('With box drawing support', () => {
      const unicodeCapabilities = {
        colors: 256,
        unicode: true,
        boxDrawing: true,
        mouse: false,
        altBuffer: false,
        italics: false,
        hyperlinks: false,
        terminalName: 'test'
      };

      it('should return Unicode box characters', () => {
        expect(getBoxChar('topLeft', unicodeCapabilities)).toBe('┌');
        expect(getBoxChar('topRight', unicodeCapabilities)).toBe('┐');
        expect(getBoxChar('bottomLeft', unicodeCapabilities)).toBe('└');
        expect(getBoxChar('bottomRight', unicodeCapabilities)).toBe('┘');
        expect(getBoxChar('horizontal', unicodeCapabilities)).toBe('─');
        expect(getBoxChar('vertical', unicodeCapabilities)).toBe('│');
        expect(getBoxChar('cross', unicodeCapabilities)).toBe('┼');
      });

      it('should return extended Unicode characters', () => {
        expect(getBoxChar('teeUp', unicodeCapabilities)).toBe('┴');
        expect(getBoxChar('teeDown', unicodeCapabilities)).toBe('┬');
        expect(getBoxChar('teeLeft', unicodeCapabilities)).toBe('┤');
        expect(getBoxChar('teeRight', unicodeCapabilities)).toBe('├');
      });

      it('should return fallback for unknown types', () => {
        expect(getBoxChar('unknown', unicodeCapabilities)).toBe('?');
      });
    });

    describe('Without box drawing support', () => {
      const asciiCapabilities = {
        colors: 8,
        unicode: false,
        boxDrawing: false,
        mouse: false,
        altBuffer: false,
        italics: false,
        hyperlinks: false,
        terminalName: 'dumb'
      };

      it('should return ASCII fallback characters', () => {
        expect(getBoxChar('topLeft', asciiCapabilities)).toBe('+');
        expect(getBoxChar('topRight', asciiCapabilities)).toBe('+');
        expect(getBoxChar('bottomLeft', asciiCapabilities)).toBe('+');
        expect(getBoxChar('bottomRight', asciiCapabilities)).toBe('+');
        expect(getBoxChar('horizontal', asciiCapabilities)).toBe('-');
        expect(getBoxChar('vertical', asciiCapabilities)).toBe('|');
        expect(getBoxChar('cross', asciiCapabilities)).toBe('+');
      });

      it('should return + for unknown types', () => {
        expect(getBoxChar('unknown', asciiCapabilities)).toBe('+');
      });
    });

    it('should auto-detect capabilities if not provided', () => {
      process.env.LANG = 'en_US.UTF-8';
      const result = getBoxChar('topLeft');
      expect(result).toBe('┌');
    });
  });

  describe('getStatusSymbol', () => {
    describe('With Unicode support', () => {
      const unicodeCapabilities = {
        colors: 256,
        unicode: true,
        boxDrawing: true,
        mouse: false,
        altBuffer: false,
        italics: false,
        hyperlinks: false,
        terminalName: 'test'
      };

      it('should return Unicode status symbols', () => {
        expect(getStatusSymbol('running', unicodeCapabilities)).toBe('●');
        expect(getStatusSymbol('pending', unicodeCapabilities)).toBe('◌');
        expect(getStatusSymbol('error', unicodeCapabilities)).toBe('×');
        expect(getStatusSymbol('success', unicodeCapabilities)).toBe('✓');
        expect(getStatusSymbol('terminated', unicodeCapabilities)).toBe('○');
        expect(getStatusSymbol('arrowUp', unicodeCapabilities)).toBe('▲');
        expect(getStatusSymbol('arrowDown', unicodeCapabilities)).toBe('▼');
        expect(getStatusSymbol('warning', unicodeCapabilities)).toBe('⚠️');
        expect(getStatusSymbol('info', unicodeCapabilities)).toBe('ℹ️');
        expect(getStatusSymbol('spinner', unicodeCapabilities)).toBe('◐');
      });

      it('should return fallback for unknown status', () => {
        expect(getStatusSymbol('unknown', unicodeCapabilities)).toBe('?');
      });
    });

    describe('Without Unicode support', () => {
      const asciiCapabilities = {
        colors: 8,
        unicode: false,
        boxDrawing: false,
        mouse: false,
        altBuffer: false,
        italics: false,
        hyperlinks: false,
        terminalName: 'dumb'
      };

      it('should return ASCII status symbols', () => {
        expect(getStatusSymbol('running', asciiCapabilities)).toBe('*');
        expect(getStatusSymbol('pending', asciiCapabilities)).toBe('o');
        expect(getStatusSymbol('error', asciiCapabilities)).toBe('X');
        expect(getStatusSymbol('success', asciiCapabilities)).toBe('+');
        expect(getStatusSymbol('terminated', asciiCapabilities)).toBe('-');
        expect(getStatusSymbol('arrowUp', asciiCapabilities)).toBe('^');
        expect(getStatusSymbol('arrowDown', asciiCapabilities)).toBe('v');
        expect(getStatusSymbol('warning', asciiCapabilities)).toBe('!');
      });

      it('should return ? for unknown status', () => {
        expect(getStatusSymbol('unknown', asciiCapabilities)).toBe('?');
      });
    });

    it('should auto-detect capabilities if not provided', () => {
      process.env.LANG = 'en_US.UTF-8';
      const result = getStatusSymbol('success');
      expect(result).toBe('✓');
    });
  });

  describe('supportsFeature', () => {
    const testCapabilities = {
      colors: 256,
      unicode: true,
      boxDrawing: false,
      mouse: true,
      altBuffer: false,
      italics: true,
      hyperlinks: false,
      terminalName: 'test'
    };

    it('should check boolean feature support', () => {
      expect(supportsFeature('unicode', testCapabilities)).toBe(true);
      expect(supportsFeature('boxDrawing', testCapabilities)).toBe(false);
      expect(supportsFeature('mouse', testCapabilities)).toBe(true);
      expect(supportsFeature('altBuffer', testCapabilities)).toBe(false);
      expect(supportsFeature('italics', testCapabilities)).toBe(true);
      expect(supportsFeature('hyperlinks', testCapabilities)).toBe(false);
    });

    it('should handle colors as a number', () => {
      expect(supportsFeature('colors', testCapabilities)).toBe(256);
    });

    it('should handle terminalName as a string', () => {
      expect(supportsFeature('terminalName', testCapabilities)).toBe('test');
    });

    it('should auto-detect capabilities if not provided', () => {
      process.env.LANG = 'en_US.UTF-8';
      const result = supportsFeature('unicode');
      expect(result).toBe(true);
    });
  });

  describe('getColorSupport', () => {
    it('should return color count from capabilities', () => {
      const capabilities = {
        colors: 16777216,
        unicode: true,
        boxDrawing: true,
        mouse: false,
        altBuffer: false,
        italics: false,
        hyperlinks: false,
        terminalName: 'test'
      };

      expect(getColorSupport(capabilities)).toBe(16777216);
    });

    it('should auto-detect capabilities if not provided', () => {
      process.env.COLORTERM = 'truecolor';
      const result = getColorSupport();
      expect(result).toBe(16777216);
    });
  });

  describe('logTerminalInfo', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockOs.platform.mockReturnValue('darwin');
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log terminal information', () => {
      process.env.TERM_PROGRAM = 'iTerm.app';
      process.env.COLORTERM = 'truecolor';
      process.env.TERM = 'xterm-256color';

      logTerminalInfo();

      expect(consoleSpy).toHaveBeenCalledWith('Terminal Information:');
      expect(consoleSpy).toHaveBeenCalledWith('  Name: iTerm2');
      expect(consoleSpy).toHaveBeenCalledWith('  Colors: 16777216');
      expect(consoleSpy).toHaveBeenCalledWith('  Unicode: false');
      expect(consoleSpy).toHaveBeenCalledWith('  Box Drawing: true');
      expect(consoleSpy).toHaveBeenCalledWith('  Hyperlinks: true');
      expect(consoleSpy).toHaveBeenCalledWith('  Platform: darwin');
      expect(consoleSpy).toHaveBeenCalledWith('  TERM: xterm-256color');
      expect(consoleSpy).toHaveBeenCalledWith('  COLORTERM: truecolor');
    });

    it('should handle undefined environment variables', () => {
      // All env vars already cleared in beforeEach
      logTerminalInfo();

      expect(consoleSpy).toHaveBeenCalledWith('  TERM: undefined');
      expect(consoleSpy).toHaveBeenCalledWith('  COLORTERM: undefined');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty environment variables gracefully', () => {
      process.env.TERM = '';
      process.env.COLORTERM = '';
      process.env.LANG = '';
      process.env.LC_ALL = '';

      const caps = detectCapabilities();

      expect(caps).toBeDefined();
      expect(caps.colors).toBe(8); // Default fallback
      expect(caps.unicode).toBe(false);
    });

    it('should handle undefined environment variables', () => {
      // Environment variables cleared in beforeEach
      const caps = detectCapabilities();

      expect(caps).toBeDefined();
      expect(caps.terminalName).toBe('unknown');
    });

    it('should handle mixed case in environment variables', () => {
      process.env.LANG = 'en_US.utf8'; // lowercase utf8
      const caps = detectCapabilities();

      expect(caps.unicode).toBe(true);
    });

    it('should handle complex TERM values', () => {
      process.env.TERM = 'screen-256color-bce';
      const caps = detectCapabilities();

      expect(caps.colors).toBe(256);
    });

    it('should handle invalid box drawing character requests', () => {
      const result = getBoxChar('');
      expect(result).toBeDefined();
    });

    it('should handle invalid status symbol requests', () => {
      const result = getStatusSymbol('');
      expect(result).toBeDefined();
    });
  });
});