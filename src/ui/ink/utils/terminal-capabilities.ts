/**
 * Terminal capability detection and management
 * Detects terminal features and provides fallback mechanisms
 */

import * as os from 'os';

// Terminal capability interface
interface TerminalCapabilities {
  colors: number;
  unicode: boolean;
  boxDrawing: boolean;
  mouse: boolean;
  altBuffer: boolean;
  italics: boolean;
  hyperlinks: boolean;
  terminalName: string;
}

const defaultCapabilities: TerminalCapabilities = {
  colors: 16,
  unicode: false,
  boxDrawing: false,
  mouse: false,
  altBuffer: false,
  italics: false,
  hyperlinks: false,
  terminalName: 'unknown',
};

/**
 * Detect if running in Windows Terminal
 */
export function isWindowsTerminal(): boolean {
  return !!(process.env.WT_SESSION || process.env.TERMINAL_EMULATOR === 'Windows Terminal');
}

/**
 * Detect if running in iTerm2
 */
export function isITerm2(): boolean {
  return process.env.TERM_PROGRAM === 'iTerm.app' || process.env.LC_TERMINAL === 'iTerm2';
}

/**
 * Detect if running in macOS Terminal.app
 */
export function isMacTerminal(): boolean {
  return process.env.TERM_PROGRAM === 'Apple_Terminal';
}

/**
 * Detect if running in Hyper terminal
 */
export function isHyper(): boolean {
  return process.env.TERM_PROGRAM === 'Hyper';
}

/**
 * Detect if running in Alacritty
 */
export function isAlacritty(): boolean {
  return process.env.TERM === 'alacritty';
}

/**
 * Detect terminal capabilities
 */
export function detectCapabilities(): TerminalCapabilities {
  const capabilities = { ...defaultCapabilities };

  // Color support detection
  const colorTerm = process.env.COLORTERM;
  const term = process.env.TERM || '';
  
  if (colorTerm === 'truecolor' || colorTerm === '24bit') {
    capabilities.colors = 16777216; // 24-bit color
  } else if (term.includes('256') || colorTerm === '256') {
    capabilities.colors = 256;
  } else if (term.includes('color')) {
    capabilities.colors = 16;
  } else {
    capabilities.colors = 8;
  }

  // Unicode support
  const lang = process.env.LANG || process.env.LC_ALL || '';
  capabilities.unicode = lang.includes('UTF-8') || lang.includes('utf8');

  // Box drawing characters
  capabilities.boxDrawing = capabilities.unicode || term.includes('xterm');

  // Terminal-specific capabilities
  if (isWindowsTerminal()) {
    capabilities.terminalName = 'Windows Terminal';
    capabilities.unicode = true;
    capabilities.boxDrawing = true;
    capabilities.hyperlinks = true;
    capabilities.colors = Math.max(capabilities.colors, 256);
  } else if (isITerm2()) {
    capabilities.terminalName = 'iTerm2';
    capabilities.unicode = true;
    capabilities.boxDrawing = true;
    capabilities.hyperlinks = true;
    capabilities.italics = true;
    capabilities.colors = Math.max(capabilities.colors, 256);
  } else if (isMacTerminal()) {
    capabilities.terminalName = 'Terminal.app';
    capabilities.unicode = true;
    capabilities.boxDrawing = true;
    capabilities.colors = Math.max(capabilities.colors, 256);
  } else if (isHyper()) {
    capabilities.terminalName = 'Hyper';
    capabilities.unicode = true;
    capabilities.boxDrawing = true;
    capabilities.hyperlinks = true;
    capabilities.colors = Math.max(capabilities.colors, 256);
  } else if (isAlacritty()) {
    capabilities.terminalName = 'Alacritty';
    capabilities.unicode = true;
    capabilities.boxDrawing = true;
    capabilities.colors = Math.max(capabilities.colors, 256);
  }

  return capabilities;
}

/**
 * Get appropriate box drawing character based on capabilities
 */
export function getBoxChar(type: string, capabilities?: TerminalCapabilities): string {
  const caps = capabilities || detectCapabilities();
  
  if (!caps.boxDrawing) {
    // ASCII fallbacks
    const asciiFallbacks: { [key: string]: string } = {
      topLeft: '+',
      topRight: '+',
      bottomLeft: '+',
      bottomRight: '+',
      horizontal: '-',
      vertical: '|',
      cross: '+',
    };
    return asciiFallbacks[type] || '+';
  }

  // Unicode box drawing characters
  const boxChars: { [key: string]: string } = {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    teeUp: '┴',
    teeDown: '┬',
    teeLeft: '┤',
    teeRight: '├',
  };

  return boxChars[type] || '?';
}

/**
 * Get appropriate status symbol based on capabilities
 */
export function getStatusSymbol(status: string, capabilities?: TerminalCapabilities): string {
  const caps = capabilities || detectCapabilities();
  
  if (!caps.unicode) {
    // ASCII fallbacks
    const asciiFallbacks: { [key: string]: string } = {
      running: '*',
      pending: 'o',
      error: 'X',
      success: '+',
      terminated: '-',
      arrowUp: '^',
      arrowDown: 'v',
      warning: '!',
    };
    return asciiFallbacks[status] || '?';
  }

  // Unicode symbols
  const symbols: { [key: string]: string } = {
    running: '●',
    pending: '◌',
    error: '×',
    success: '✓',
    terminated: '○',
    arrowUp: '▲',
    arrowDown: '▼',
    warning: '⚠️',
    info: 'ℹ️',
    spinner: '◐',
  };

  return symbols[status] || '?';
}

/**
 * Test if terminal supports a specific feature
 */
export function supportsFeature(feature: keyof TerminalCapabilities, capabilities?: TerminalCapabilities): boolean {
  const caps = capabilities || detectCapabilities();
  return caps[feature] as boolean;
}

/**
 * Get color support level
 */
export function getColorSupport(capabilities?: TerminalCapabilities): number {
  const caps = capabilities || detectCapabilities();
  return caps.colors;
}

/**
 * Log terminal information
 */
export function logTerminalInfo(): void {
  const caps = detectCapabilities();
  console.log('Terminal Information:');
  console.log(`  Name: ${caps.terminalName}`);
  console.log(`  Colors: ${caps.colors}`);
  console.log(`  Unicode: ${caps.unicode}`);
  console.log(`  Box Drawing: ${caps.boxDrawing}`);
  console.log(`  Hyperlinks: ${caps.hyperlinks}`);
  console.log(`  Platform: ${os.platform()}`);
  console.log(`  TERM: ${process.env.TERM}`);
  console.log(`  COLORTERM: ${process.env.COLORTERM}`);
}