const fs = require('fs');
const path = require('path');
const os = require('os');
const { FileSystemError } = require('../utils/errors');

const CONFIG_DIR = path.join(os.homedir(), '.add-manager');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SESSIONS_FILE = path.join(CONFIG_DIR, 'sessions.json');
const LOGS_DIR = path.join(CONFIG_DIR, 'logs');

const DEFAULT_CONFIG = {
  version: '1.0.0',
  maxAgents: 3,
  sessionTimeout: 3600000, // 1 hour in milliseconds
  logLevel: 'info',
  features: {
    autoCleanup: true,
    notifications: true,
  },
};

const DEFAULT_SESSIONS = {
  active: [],
  history: [],
  lastCleanup: Date.now(),
};

/**
 * Initializes the session storage directory and files
 */
async function initializeSessionStorage() {
  try {
    // Create main config directory
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { mode: 0o700 });
    }

    // Create logs directory
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { mode: 0o700 });
    }

    // Initialize config file
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        { mode: 0o600 },
      );
    }

    // Initialize sessions file
    if (!fs.existsSync(SESSIONS_FILE)) {
      fs.writeFileSync(
        SESSIONS_FILE,
        JSON.stringify(DEFAULT_SESSIONS, null, 2),
        { mode: 0o600 },
      );
    }

    // Verify permissions
    const stats = fs.statSync(CONFIG_DIR);
    // eslint-disable-next-line no-bitwise
    if ((stats.mode & 0o077) !== 0) {
      fs.chmodSync(CONFIG_DIR, 0o700);
    }
  } catch (error) {
    throw new FileSystemError(
      `Failed to initialize session storage: ${error.message}`,
      'STORAGE_INIT_FAILED',
      'Please ensure you have write permissions to your home directory',
    );
  }
}

/**
 * Loads configuration from file
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    throw new FileSystemError(
      `Failed to load configuration: ${error.message}`,
      'CONFIG_LOAD_FAILED',
      'Please check the configuration file format',
    );
  }
}

/**
 * Saves configuration to file
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(config, null, 2),
      { mode: 0o600 },
    );
  } catch (error) {
    throw new FileSystemError(
      `Failed to save configuration: ${error.message}`,
      'CONFIG_SAVE_FAILED',
      'Please check file permissions',
    );
  }
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  SESSIONS_FILE,
  LOGS_DIR,
  initializeSessionStorage,
  loadConfig,
  saveConfig,
};
