import { existsSync } from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('chalk', () => ({
  cyan: jest.fn((text) => `cyan:${text}`),
  green: jest.fn((text) => `green:${text}`),
  red: jest.fn((text) => `red:${text}`),
  yellow: jest.fn((text) => `yellow:${text}`),
  magenta: jest.fn((text) => `magenta:${text}`),
  white: jest.fn((text) => `white:${text}`),
  blue: jest.fn((text) => `blue:${text}`),
  gray: jest.fn((text) => `gray:${text}`),
}));

jest.mock('../../../../src/ui/ink/utils/terminal-capabilities', () => ({
  detectCapabilities: jest.fn(() => ({
    terminalName: 'MockTerminal',
    colors: 16777216,
    unicode: true,
    boxDrawing: true,
    mouse: true,
    altBuffer: true,
    italics: true,
    hyperlinks: true,
  })),
  getBoxChar: jest.fn((type) => {
    const chars = {
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
    };
    return chars[type] || '?';
  }),
  getStatusSymbol: jest.fn((status) => {
    const symbols = {
      running: '●',
      pending: '○',
      error: '✗',
      success: '✓',
      terminated: '■',
    };
    return symbols[status] || '?';
  }),
}));

describe('terminal-test.ts', () => {
  let originalConsoleLog: typeof console.log;
  let consoleLogMock: jest.Mock;

  beforeEach(() => {
    originalConsoleLog = console.log;
    consoleLogMock = jest.fn();
    console.log = consoleLogMock;
    
    jest.clearAllMocks();
    jest.resetModules(); // Clear module cache
    
    // Set up mock environment
    process.env.TERM = 'xterm-256color';
    process.env.COLORTERM = 'truecolor';
    process.env.TERM_PROGRAM = 'vscode';
    process.env.WT_SESSION = '';
    process.env.LANG = 'en_US.UTF-8';
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it('should import and execute terminal test successfully', async () => {
    // Import the module to trigger execution
    await import('../../../../src/ui/ink/utils/terminal-test');

    // Verify console output was called
    expect(consoleLogMock).toHaveBeenCalled();
    
    // Check for key output strings
    const allCalls = consoleLogMock.mock.calls.flat();
    const output = allCalls.join(' ');
    
    expect(output).toContain('Napoleon Terminal Compatibility Test');
    expect(output).toContain('Detected Terminal:');
    expect(output).toContain('Platform:');
    expect(output).toContain('Node Version:');
    expect(output).toContain('Capabilities:');
    expect(output).toContain('Test completed successfully!');
  });

  it('should display detected capabilities', async () => {
    await import('../../../../src/ui/ink/utils/terminal-test');

    const outputText = consoleLogMock.mock.calls.flat().join(' ');
    
    expect(outputText).toContain('cyan:MockTerminal');
    expect(outputText).toContain('24-bit True Color');
    expect(outputText).toContain('green:✓ Supported');
  });

  it('should test box drawing characters', async () => {
    await import('../../../../src/ui/ink/utils/terminal-test');

    // Verify box characters were used
    const getBoxChar = require('../../../../src/ui/ink/utils/terminal-capabilities').getBoxChar;
    expect(getBoxChar).toHaveBeenCalledWith('topLeft', expect.any(Object));
    expect(getBoxChar).toHaveBeenCalledWith('topRight', expect.any(Object));
    expect(getBoxChar).toHaveBeenCalledWith('bottomLeft', expect.any(Object));
    expect(getBoxChar).toHaveBeenCalledWith('bottomRight', expect.any(Object));
    expect(getBoxChar).toHaveBeenCalledWith('horizontal', expect.any(Object));
    expect(getBoxChar).toHaveBeenCalledWith('vertical', expect.any(Object));
  });

  it('should test status symbols', async () => {
    await import('../../../../src/ui/ink/utils/terminal-test');

    const getStatusSymbol = require('../../../../src/ui/ink/utils/terminal-capabilities').getStatusSymbol;
    expect(getStatusSymbol).toHaveBeenCalledWith('running', expect.any(Object));
    expect(getStatusSymbol).toHaveBeenCalledWith('pending', expect.any(Object));
    expect(getStatusSymbol).toHaveBeenCalledWith('error', expect.any(Object));
    expect(getStatusSymbol).toHaveBeenCalledWith('success', expect.any(Object));
    expect(getStatusSymbol).toHaveBeenCalledWith('terminated', expect.any(Object));
  });

  it('should display color tests', async () => {
    const chalk = require('chalk');
    await import('../../../../src/ui/ink/utils/terminal-test');

    // Verify chalk colors were used
    expect(chalk.red).toHaveBeenCalledWith('Red');
    expect(chalk.green).toHaveBeenCalledWith('Green');
    expect(chalk.blue).toHaveBeenCalledWith('Blue');
    expect(chalk.yellow).toHaveBeenCalledWith('Yellow');
    expect(chalk.cyan).toHaveBeenCalledWith('Cyan');
    expect(chalk.magenta).toHaveBeenCalledWith('Magenta');
    expect(chalk.white).toHaveBeenCalledWith('White');
    expect(chalk.gray).toHaveBeenCalledWith('Gray');
  });

  it('should display environment variables', async () => {
    await import('../../../../src/ui/ink/utils/terminal-test');

    const outputText = consoleLogMock.mock.calls.flat().join(' ');
    
    expect(outputText).toContain('Environment Variables:');
    expect(outputText).toContain('TERM:');
    expect(outputText).toContain('COLORTERM:');
    expect(outputText).toContain('TERM_PROGRAM:');
    expect(outputText).toContain('WT_SESSION:');
    expect(outputText).toContain('LANG:');
  });

  it('should handle missing environment variables', async () => {
    // Clear environment variables
    delete process.env.TERM;
    delete process.env.COLORTERM;
    delete process.env.TERM_PROGRAM;
    delete process.env.WT_SESSION;
    delete process.env.LANG;

    await import('../../../../src/ui/ink/utils/terminal-test');

    const outputText = consoleLogMock.mock.calls.flat().join(' ');
    
    expect(outputText).toContain('not set');
  });

  it('should handle different capability levels', async () => {
    const detectCapabilities = require('../../../../src/ui/ink/utils/terminal-capabilities').detectCapabilities;
    
    // Mock reduced capabilities
    detectCapabilities.mockReturnValueOnce({
      terminalName: 'BasicTerminal',
      colors: 256,
      unicode: false,
      boxDrawing: false,
      mouse: false,
      altBuffer: false,
      italics: false,
      hyperlinks: false,
    });

    await import('../../../../src/ui/ink/utils/terminal-test');

    const outputText = consoleLogMock.mock.calls.flat().join(' ');
    
    expect(outputText).toContain('256 colors');
    expect(outputText).toContain('red:✗ Not Supported');
  });

  it('should display platform and node version information', async () => {
    await import('../../../../src/ui/ink/utils/terminal-test');

    const outputText = consoleLogMock.mock.calls.flat().join(' ');
    
    expect(outputText).toContain(`cyan:${process.platform}`);
    expect(outputText).toContain(`cyan:${process.version}`);
  });

  it('should export empty object', async () => {
    const module = await import('../../../../src/ui/ink/utils/terminal-test');
    expect(typeof module).toBe('object');
  });

  describe('Edge Cases', () => {
    it('should handle undefined process.env values gracefully', async () => {
      const originalEnv = process.env;
      process.env = {} as any;

      await import('../../../../src/ui/ink/utils/terminal-test');

      const outputText = consoleLogMock.mock.calls.flat().join(' ');
      expect(outputText).toContain('not set');
      
      process.env = originalEnv;
    });

    it('should handle terminal capabilities detection errors', async () => {
      const detectCapabilities = require('../../../../src/ui/ink/utils/terminal-capabilities').detectCapabilities;
      
      // Mock error in capabilities detection
      detectCapabilities.mockReturnValueOnce({
        terminalName: 'Unknown',
        colors: 0,
        unicode: false,
        boxDrawing: false,
        mouse: false,
        altBuffer: false,
        italics: false,
        hyperlinks: false,
      });

      await import('../../../../src/ui/ink/utils/terminal-test');

      const outputText = consoleLogMock.mock.calls.flat().join(' ');
      expect(outputText).toContain('0 colors');
    });

    it('should handle box character fallbacks', async () => {
      const getBoxChar = require('../../../../src/ui/ink/utils/terminal-capabilities').getBoxChar;
      
      // Mock fallback characters
      getBoxChar.mockReturnValue('+');

      await import('../../../../src/ui/ink/utils/terminal-test');

      expect(getBoxChar).toHaveBeenCalled();
    });

    it('should handle status symbol fallbacks', async () => {
      const getStatusSymbol = require('../../../../src/ui/ink/utils/terminal-capabilities').getStatusSymbol;
      
      // Mock fallback symbols
      getStatusSymbol.mockReturnValue('*');

      await import('../../../../src/ui/ink/utils/terminal-test');

      expect(getStatusSymbol).toHaveBeenCalled();
    });
  });
});