/**
 * Terminal capability detection and management
 * Detects terminal features and provides fallback mechanisms
 */

const os = require('os');

// Terminal capability interface
const defaultCapabilities = {
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
function isWindowsTerminal() {
  return process.env.WT_SESSION || process.env.TERMINAL_EMULATOR === 'Windows Terminal';
}

/**
 * Detect if running in iTerm2
 */
function isITerm2() {
  return process.env.TERM_PROGRAM === 'iTerm.app' || process.env.LC_TERMINAL === 'iTerm2';
}

/**
 * Detect if running in macOS Terminal.app
 */
function isMacTerminal() {
  return process.env.TERM_PROGRAM === 'Apple_Terminal';
}

/**
 * Detect if running in Hyper terminal
 */
function isHyper() {
  return process.env.TERM_PROGRAM === 'Hyper';
}

/**
 * Detect if running in Alacritty
 */
function isAlacritty() {
  return process.env.ALACRITTY_SOCKET != null;
}

/**
 * Detect color support level
 */
function detectColorSupport() {
  if (process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit') {
    return 'truecolor';
  }

  if (process.stdout.hasColors && process.stdout.hasColors(256)) {
    return 256;
  }

  if (process.stdout.hasColors && process.stdout.hasColors()) {
    return 16;
  }

  return 16; // Fallback to basic colors
}

/**
 * Detect Unicode support
 */
function detectUnicodeSupport() {
  // Windows CMD and PowerShell have limited Unicode support
  if (os.platform() === 'win32' && !isWindowsTerminal()) {
    return false;
  }

  // Check locale
  const locale = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '';
  if (locale.includes('UTF-8') || locale.includes('UTF8')) {
    return true;
  }

  // Most modern terminals support Unicode
  return !process.env.TERM || !['dumb', 'cons25', 'emacs'].includes(process.env.TERM);
}

/**
 * Detect box drawing character support
 */
function detectBoxDrawingSupport() {
  // Same as Unicode for most cases
  return detectUnicodeSupport();
}

/**
 * Detect mouse support
 */
function detectMouseSupport() {
  // Disable in SSH sessions for now
  if (process.env.SSH_CLIENT || process.env.SSH_TTY) {
    return false;
  }

  // Disable if not TTY
  if (!process.stdout.isTTY) {
    return false;
  }

  // Known terminals with good mouse support
  return isITerm2() || isWindowsTerminal() || isHyper() || isAlacritty();
}

/**
 * Detect alternate buffer support
 */
function detectAltBufferSupport() {
  // macOS Terminal.app has issues with alt buffer
  if (isMacTerminal()) {
    return false;
  }

  // Most modern terminals support it
  return process.stdout.isTTY;
}

/**
 * Detect italics support
 */
function detectItalicsSupport() {
  // Windows CMD doesn't support italics
  if (os.platform() === 'win32' && !isWindowsTerminal()) {
    return false;
  }

  // macOS Terminal.app has limited italics support
  if (isMacTerminal()) {
    return false;
  }

  return true;
}

/**
 * Get terminal name for debugging
 */
function getTerminalName() {
  if (isWindowsTerminal()) return 'Windows Terminal';
  if (isITerm2()) return 'iTerm2';
  if (isMacTerminal()) return 'Terminal.app';
  if (isHyper()) return 'Hyper';
  if (isAlacritty()) return 'Alacritty';
  if (process.env.TERM_PROGRAM) return process.env.TERM_PROGRAM;
  if (process.env.TERM) return process.env.TERM;
  return 'unknown';
}

/**
 * Detect all terminal capabilities
 */
function detectCapabilities() {
  const capabilities = {
    colors: detectColorSupport(),
    unicode: detectUnicodeSupport(),
    boxDrawing: detectBoxDrawingSupport(),
    mouse: detectMouseSupport(),
    altBuffer: detectAltBufferSupport(),
    italics: detectItalicsSupport(),
    hyperlinks: isITerm2() || isWindowsTerminal() || isHyper(),
    terminalName: getTerminalName(),
  };

  // Allow environment variable overrides
  if (process.env.NAPOLEON_FORCE_ASCII === 'true') {
    capabilities.unicode = false;
    capabilities.boxDrawing = false;
  }

  if (process.env.NAPOLEON_NO_COLOR === 'true') {
    capabilities.colors = 16;
  }

  if (process.env.NAPOLEON_NO_MOUSE === 'true') {
    capabilities.mouse = false;
  }

  return capabilities;
}

// Box drawing characters with fallbacks
const boxCharacters = {
  unicode: {
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
    horizontalThick: '━',
    verticalThick: '┃',
    doubleTopLeft: '╔',
    doubleTopRight: '╗',
    doubleBottomLeft: '╚',
    doubleBottomRight: '╝',
    doubleHorizontal: '═',
    doubleVertical: '║',
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
    cross: '+',
    teeUp: '+',
    teeDown: '+',
    teeLeft: '+',
    teeRight: '+',
    horizontalThick: '=',
    verticalThick: '|',
    doubleTopLeft: '+',
    doubleTopRight: '+',
    doubleBottomLeft: '+',
    doubleBottomRight: '+',
    doubleHorizontal: '=',
    doubleVertical: '|',
  },
};

// Status symbols with fallbacks
const statusSymbols = {
  unicode: {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    running: '●',
    pending: '◌',
    terminated: '○',
    arrow: '→',
    arrowUp: '↑',
    arrowDown: '↓',
    bullet: '•',
  },
  ascii: {
    success: '[OK]',
    error: '[X]',
    warning: '[!]',
    info: '[i]',
    running: '(*)',
    pending: '( )',
    terminated: '(x)',
    arrow: '->',
    arrowUp: '^',
    arrowDown: 'v',
    bullet: '*',
  },
};

/**
 * Get box drawing character based on capabilities
 */
function getBoxChar(char, capabilities = null) {
  const caps = capabilities || detectCapabilities();
  return caps.boxDrawing ? boxCharacters.unicode[char] : boxCharacters.ascii[char];
}

/**
 * Get status symbol based on capabilities
 */
function getStatusSymbol(symbol, capabilities = null) {
  const caps = capabilities || detectCapabilities();
  return caps.unicode ? statusSymbols.unicode[symbol] : statusSymbols.ascii[symbol];
}

// Export everything
module.exports = {
  detectCapabilities,
  getBoxChar,
  getStatusSymbol,
  boxCharacters,
  statusSymbols,
  isWindowsTerminal,
  isITerm2,
  isMacTerminal,
  isHyper,
  isAlacritty,
};
