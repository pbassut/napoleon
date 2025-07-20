/**
 * UI Configuration and Migration Management
 * Handles UI selection, legacy support, and migration flags
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.napoleon', 'ui-config.json');
const LEGACY_UI_CUTOFF_DATE = '2025-12-31';
const MIGRATION_MESSAGE_KEY = 'hasSeenInkMigrationMessage';

class UIConfig {
  constructor() {
    this.config = {
      defaultUI: 'ink',
      useLegacyUI: false,
      allowLegacyUI: true,
      hasSeenMigrationMessage: false,
      migrationDate: new Date().toISOString(),
      preferences: {}
    };
    this.loaded = false;
  }

  /**
   * Load UI configuration from disk
   */
  async load() {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = { ...this.config, ...JSON.parse(data) };
      this.loaded = true;
      logger.info('UI configuration loaded', { config: this.config });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to load UI config', { error: error.message });
      }
      // Use defaults for new installations
      await this.save();
    }
  }

  /**
   * Save UI configuration to disk
   */
  async save() {
    try {
      const dir = path.dirname(CONFIG_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      logger.info('UI configuration saved');
    } catch (error) {
      logger.error('Failed to save UI config', { error: error.message });
    }
  }

  /**
   * Determine which UI to use based on configuration and flags
   */
  async determineUI(cliArgs = {}) {
    if (!this.loaded) {
      await this.load();
    }

    // Priority order:
    // 1. Command line flag
    // 2. Environment variable
    // 3. Config file
    // 4. Default

    // Check command line flag
    if (cliArgs.useLegacyUI || process.argv.includes('--use-legacy-ui') || process.env.NAPOLEON_USE_LEGACY_UI === 'true') {
      logger.info('Legacy UI requested via CLI flag');
      return this.canUseLegacyUI() ? 'blessed' : 'ink';
    }

    // Check environment variable
    if (process.env.NAPOLEON_UI) {
      const requestedUI = process.env.NAPOLEON_UI.toLowerCase();
      if (requestedUI === 'blessed' && !this.canUseLegacyUI()) {
        logger.warn('Legacy UI requested but not available');
        return 'ink';
      }
      return requestedUI === 'blessed' ? 'blessed' : 'ink';
    }

    // Check config file
    if (this.config.useLegacyUI && this.canUseLegacyUI()) {
      return 'blessed';
    }

    // Default to Ink
    return this.config.defaultUI || 'ink';
  }

  /**
   * Check if legacy UI is still available
   */
  canUseLegacyUI() {
    // Force flag for emergency situations
    if (process.env.FORCE_LEGACY_UI === 'true') {
      logger.warn('Legacy UI forced via FORCE_LEGACY_UI environment variable');
      return true;
    }

    // Check if we're past the cutoff date
    const cutoffDate = new Date(LEGACY_UI_CUTOFF_DATE);
    const now = new Date();

    if (now > cutoffDate) {
      logger.info('Legacy UI no longer available (past cutoff date)');
      return false;
    }

    // Check if legacy UI is disabled in config
    if (this.config.allowLegacyUI === false) {
      logger.info('Legacy UI disabled in configuration');
      return false;
    }

    return true;
  }

  /**
   * Check if migration message has been shown
   */
  hasSeenMigrationMessage() {
    return this.config.hasSeenMigrationMessage === true;
  }

  /**
   * Mark migration message as seen
   */
  async markMigrationMessageSeen() {
    this.config.hasSeenMigrationMessage = true;
    await this.save();
  }

  /**
   * Migrate legacy Blessed configuration to Ink format
   */
  async migrateLegacyConfig(blessedConfig) {
    const migrated = {
      theme: this.migrateTheme(blessedConfig.colors || {}),
      keyBindings: this.migrateKeyBindings(blessedConfig.keys || {}),
      ui: {
        animations: blessedConfig.animations !== false,
        compactMode: blessedConfig.compactDisplay || false,
        showBorders: blessedConfig.borders !== false,
        scrollbarVisible: blessedConfig.scrollbar !== false
      },
      terminal: {
        mouse: blessedConfig.mouse !== false,
        fullUnicode: blessedConfig.fullUnicode !== false
      }
    };

    this.config.preferences = migrated;
    this.config.migrationDate = new Date().toISOString();
    await this.save();

    logger.info('Legacy configuration migrated', { migrated });
    return migrated;
  }

  /**
   * Migrate theme settings
   */
  migrateTheme(blessedColors) {
    return {
      primary: blessedColors.focus || '#0969da',
      secondary: blessedColors.selected || '#1f6feb',
      background: blessedColors.bg || '#0d1117',
      foreground: blessedColors.fg || '#c9d1d9',
      border: blessedColors.border || '#30363d',
      error: blessedColors.error || '#f85149',
      warning: blessedColors.warning || '#d29922',
      success: blessedColors.success || '#3fb950',
      info: blessedColors.info || '#58a6ff'
    };
  }

  /**
   * Migrate key bindings
   */
  migrateKeyBindings(blessedKeys) {
    const defaultBindings = {
      quit: ['q', 'C-c'],
      help: ['?', 'h'],
      up: ['up', 'k'],
      down: ['down', 'j'],
      select: ['enter', 'space'],
      back: ['escape', 'backspace'],
      spawn: ['n', 'a'],
      terminate: ['t', 'x'],
      logs: ['l'],
      refresh: ['r', 'C-r']
    };

    // Merge blessed key bindings with defaults
    const migrated = { ...defaultBindings };
    
    for (const [action, keys] of Object.entries(blessedKeys)) {
      if (Array.isArray(keys)) {
        migrated[action] = keys;
      } else if (typeof keys === 'string') {
        migrated[action] = [keys];
      }
    }

    return migrated;
  }

  /**
   * Get current UI preferences
   */
  getPreferences() {
    return this.config.preferences || {};
  }

  /**
   * Update UI preference
   */
  async setPreference(key, value) {
    if (!this.config.preferences) {
      this.config.preferences = {};
    }
    
    // Navigate nested keys
    const keys = key.split('.');
    let current = this.config.preferences;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    await this.save();
  }

  /**
   * Get days until legacy UI cutoff
   */
  getDaysUntilLegacyCutoff() {
    const cutoffDate = new Date(LEGACY_UI_CUTOFF_DATE);
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.floor((cutoffDate - now) / msPerDay);
    return Math.max(0, daysRemaining);
  }

  /**
   * Generate migration status report
   */
  getMigrationStatus() {
    return {
      currentUI: this.config.defaultUI,
      legacyUIAvailable: this.canUseLegacyUI(),
      daysUntilCutoff: this.getDaysUntilLegacyCutoff(),
      migrationDate: this.config.migrationDate,
      hasSeenMessage: this.config.hasSeenMigrationMessage,
      preferences: this.config.preferences
    };
  }
}

// Singleton instance
const uiConfig = new UIConfig();

module.exports = {
  uiConfig,
  UIConfig
};