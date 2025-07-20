/**
 * Input normalization for cross-terminal compatibility
 * Handles different key code variations across terminals
 */

const os = require('os');
const { isWindowsTerminal, isMacTerminal, isITerm2 } = require('./terminal-capabilities');

/**
 * Normalize key input across different terminals
 * @param {string} input - Raw input string
 * @param {Object} key - Key object from Ink
 * @returns {Object} Normalized key object
 */
function normalizeKey(input, key) {
  const normalized = { ...key };

  // Handle platform-specific meta/alt key differences
  if (os.platform() === 'darwin') {
    // macOS uses Option as Alt
    if (key.meta && !key.alt) {
      normalized.alt = true;
      normalized.meta = false;
    }
  }

  // Windows Terminal specific mappings
  if (isWindowsTerminal()) {
    // Handle special key sequences
    if (input === '\x1b[1;5D') {
      // Ctrl+Left
      normalized.ctrl = true;
      normalized.leftArrow = true;
    } else if (input === '\x1b[1;5C') {
      // Ctrl+Right
      normalized.ctrl = true;
      normalized.rightArrow = true;
    }
  }

  // macOS Terminal.app specific mappings
  if (isMacTerminal()) {
    // Terminal.app sends different codes for some keys
    if (input === '\x1b[5~') {
      normalized.pageUp = true;
    } else if (input === '\x1b[6~') {
      normalized.pageDown = true;
    }
  }

  // Common terminal escape sequences
  const escapeSequences = {
    '\x1b[A': { upArrow: true },
    '\x1b[B': { downArrow: true },
    '\x1b[C': { rightArrow: true },
    '\x1b[D': { leftArrow: true },
    '\x1b[H': { home: true },
    '\x1b[F': { end: true },
    '\x1b[2~': { insert: true },
    '\x1b[3~': { delete: true },
    '\x1b[5~': { pageUp: true },
    '\x1b[6~': { pageDown: true },
    '\x1bOP': { f1: true },
    '\x1bOQ': { f2: true },
    '\x1bOR': { f3: true },
    '\x1bOS': { f4: true },
    '\x1b[15~': { f5: true },
    '\x1b[17~': { f6: true },
    '\x1b[18~': { f7: true },
    '\x1b[19~': { f8: true },
    '\x1b[20~': { f9: true },
    '\x1b[21~': { f10: true },
    '\x1b[23~': { f11: true },
    '\x1b[24~': { f12: true },
  };

  // Check if input matches any escape sequence
  if (escapeSequences[input]) {
    Object.assign(normalized, escapeSequences[input]);
  }

  // Handle Ctrl+key combinations
  if (input.length === 1) {
    const charCode = input.charCodeAt(0);

    // Ctrl+A through Ctrl+Z (1-26)
    if (charCode >= 1 && charCode <= 26) {
      normalized.ctrl = true;
      normalized.name = String.fromCharCode(charCode + 96); // Convert to letter

      // Special cases
      switch (charCode) {
        case 3: // Ctrl+C
          normalized.name = 'c';
          break;
        case 4: // Ctrl+D
          normalized.name = 'd';
          break;
        case 9: // Tab
          normalized.tab = true;
          normalized.ctrl = false;
          break;
        case 13: // Enter
          normalized.return = true;
          normalized.ctrl = false;
          break;
        case 27: // Escape
          normalized.escape = true;
          normalized.ctrl = false;
          break;
      }
    }
  }

  // Normalize function keys across terminals
  if (normalized.name && normalized.name.startsWith('f')) {
    const fNum = parseInt(normalized.name.substring(1), 10);
    if (!isNaN(fNum) && fNum >= 1 && fNum <= 12) {
      normalized[`f${fNum}`] = true;
    }
  }

  return normalized;
}

/**
 * Create a key binding map for consistent shortcuts
 */
const keyBindings = {
  // Navigation
  up: ['upArrow', 'k'],
  down: ['downArrow', 'j'],
  left: ['leftArrow', 'h'],
  right: ['rightArrow', 'l'],
  pageUp: ['pageUp', 'ctrl+u'],
  pageDown: ['pageDown', 'ctrl+d'],
  home: ['home', 'g'],
  end: ['end', 'G'],

  // Actions
  select: ['return', 'space'],
  cancel: ['escape', 'q'],
  search: ['/'],
  help: ['?', 'f1'],
  refresh: ['r', 'f5'],

  // Agent operations
  spawn: ['n'],
  terminate: ['d', 'delete'],
  info: ['i', 'return'],

  // Special
  quit: ['q', 'ctrl+c'],
};

/**
 * Check if a key matches a binding
 * @param {Object} key - Normalized key object
 * @param {string} binding - Binding name from keyBindings
 * @returns {boolean}
 */
function matchesBinding(key, binding) {
  const bindings = keyBindings[binding];
  if (!bindings) return false;

  return bindings.some((b) => {
    if (b.includes('+')) {
      // Handle modifier combinations
      const parts = b.split('+');
      const modifier = parts[0];
      const keyName = parts[1];

      return key[modifier] && (key.name === keyName || key[keyName]);
    }
    // Simple key check
    return key[b] || key.name === b;
  });
}

/**
 * Get human-readable key description
 * @param {string} binding - Binding name
 * @returns {string} Human-readable description
 */
function getKeyDescription(binding) {
  const bindings = keyBindings[binding];
  if (!bindings) return '';

  const descriptions = bindings.map((b) => {
    if (b.includes('+')) {
      const parts = b.split('+');
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('+');
    }

    // Special key names
    const specialKeys = {
      upArrow: '↑',
      downArrow: '↓',
      leftArrow: '←',
      rightArrow: '→',
      return: 'Enter',
      escape: 'Esc',
      space: 'Space',
      delete: 'Del',
      pageUp: 'PgUp',
      pageDown: 'PgDn',
    };

    return specialKeys[b] || b.toUpperCase();
  });

  return descriptions.join('/');
}

/**
 * Debug key input
 * @param {string} input - Raw input
 * @param {Object} key - Key object
 * @returns {string} Debug string
 */
function debugKey(input, key) {
  const bytes = Array.from(input).map((c) => {
    const code = c.charCodeAt(0);
    if (code < 32) {
      return `\\x${code.toString(16).padStart(2, '0')}`;
    }
    return c;
  }).join('');

  return `Input: "${bytes}" Key: ${JSON.stringify(key)}`;
}

module.exports = {
  normalizeKey,
  matchesBinding,
  getKeyDescription,
  debugKey,
  keyBindings,
};
