#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../src/utils/logger');

// Configuration paths factory functions
function getAddManagerDir() {
  return path.join(os.homedir(), '.add-manager');
}

function getNapoleonDir() {
  return path.join(os.homedir(), '.napoleon');
}

function getBackupDir() {
  return path.join(getNapoleonDir(), 'backup-from-add-manager');
}

// Session file paths factory functions
function getAddManagerSessions() {
  return path.join(getAddManagerDir(), 'sessions.json');
}

function getAddManagerConfig() {
  return path.join(getAddManagerDir(), 'config.json');
}

function getNapoleonSessions() {
  return path.join(getNapoleonDir(), 'sessions.json');
}

function getNapoleonConfig() {
  return path.join(getNapoleonDir(), 'config.json');
}

// Note: logger is imported from shared utils/logger.js

/**
 * CLI Arguments parser
 */
function parseArguments() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.includes('-n'),
    force: args.includes('--force') || args.includes('-f'),
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Migration Helper: ADD Manager to Napoleon

Usage: migrate-to-napoleon [options]

Options:
  --dry-run, -n     Show what would be migrated without making changes
  --force, -f       Force migration even if Napoleon data exists
  --verbose, -v     Show detailed output
  --help, -h        Show this help message

Examples:
  migrate-to-napoleon --dry-run    # Preview migration
  migrate-to-napoleon              # Perform migration
  migrate-to-napoleon --force      # Force migration (overwrites existing)
`);
}

/**
 * Recursively copy directory
 */
function copyDirectoryRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  entries.forEach((entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectoryRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

/**
 * Check if ADD Manager data exists
 */
function checkAddManagerData() {
  const checks = {
    directory: fs.existsSync(getAddManagerDir()),
    sessions: fs.existsSync(getAddManagerSessions()),
    config: fs.existsSync(getAddManagerConfig()),
  };

  return checks;
}

/**
 * Check if Napoleon data already exists
 */
function checkNapoleonData() {
  const checks = {
    directory: fs.existsSync(getNapoleonDir()),
    sessions: fs.existsSync(getNapoleonSessions()),
    config: fs.existsSync(getNapoleonConfig()),
  };

  return checks;
}

/**
 * Create backup of original ADD Manager data
 */
function createBackup() {
  logger.info('Creating backup of ADD Manager data...');

  const napoleonDir = getNapoleonDir();
  const backupDir = getBackupDir();

  if (!fs.existsSync(napoleonDir)) {
    fs.mkdirSync(napoleonDir, { recursive: true });
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Copy entire ADD Manager directory to backup
  const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const timestampedBackup = path.join(backupDir, `add-manager-${backupTimestamp}`);

  fs.mkdirSync(timestampedBackup, { recursive: true });

  // Copy files
  const filesToBackup = ['sessions.json', 'config.json'];
  const dirsToCopy = ['logs'];

  filesToBackup.forEach((file) => {
    const srcPath = path.join(getAddManagerDir(), file);
    const destPath = path.join(timestampedBackup, file);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      logger.info(`Backed up: ${file}`);
    }
  });

  // Copy directories
  dirsToCopy.forEach((dir) => {
    const srcPath = path.join(getAddManagerDir(), dir);
    const destPath = path.join(timestampedBackup, dir);

    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectoryRecursive(srcPath, destPath);
      logger.info(`Backed up directory: ${dir}`);
    }
  });

  logger.info(`Backup created at: ${timestampedBackup}`);
  return timestampedBackup;
}

/**
 * Transform session data from ADD Manager to Napoleon format
 */
function transformSessionData(addManagerSessions) {
  if (!addManagerSessions || !addManagerSessions.sessions) {
    return {
      sessions: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  const transformedSessions = addManagerSessions.sessions.map((session) => {
    // Remove process-specific fields and add SDK fields
    const transformed = {
      id: session.id,
      instructions: session.instructions,
      spawnTime: session.spawnTime,
      status: session.status,
      workingDirectory: session.workingDirectory,
      worktreePath: session.worktreePath,
      worktreeName: session.worktreeName,
      gitRoot: session.gitRoot,
      lastActivity: session.lastActivity,
      logs: session.logs || [],

      // New SDK-specific fields
      sdkStatus: 'inactive', // Will be activated when Napoleon starts
      lastMessageId: null,
      sdkSessionId: null,

      // Migration metadata
      migratedFrom: 'add-manager',
      migrationDate: new Date().toISOString(),

      // Remove process-specific fields
      // pid: removed (no longer needed with SDK)
      // process: removed (runtime only)
      // claudeSession: removed (will be recreated)
    };

    // Copy other fields that might exist but exclude process-related ones
    Object.keys(session).forEach((key) => {
      if (!['pid', 'process', 'claudeSession'].includes(key)
          && !Object.prototype.hasOwnProperty.call(transformed, key)) {
        transformed[key] = session[key];
      }
    });

    return transformed;
  });

  return {
    sessions: transformedSessions,
    lastUpdated: new Date().toISOString(),
    migratedFrom: 'add-manager',
    migrationDate: new Date().toISOString(),
  };
}

/**
 * Transform config data from ADD Manager to Napoleon format
 */
function transformConfigData(addManagerConfig) {
  if (!addManagerConfig) {
    return {
      version: '2.0.0',
      maxAgents: 3,
      sessionTimeout: 3600000,
      logLevel: 'info',
      features: {
        autoCleanup: true,
        notifications: true,
        sdkIntegration: true,
      },
    };
  }

  // Transform config, updating version and adding SDK features
  const transformed = {
    ...addManagerConfig,
    version: '2.0.0', // Update version to indicate Napoleon format
    features: {
      ...addManagerConfig.features,
      sdkIntegration: true, // Add SDK integration feature
    },
    migratedFrom: 'add-manager',
    migrationDate: new Date().toISOString(),
  };

  return transformed;
}

/**
 * Perform the migration
 */
async function performMigration(options) {
  logger.info('Starting migration from ADD Manager to Napoleon...');

  // Check ADD Manager data
  const addManagerData = checkAddManagerData();
  if (!addManagerData.directory) {
    logger.error('ADD Manager directory not found. Nothing to migrate.');
    return false;
  }

  // Check Napoleon data
  const napoleonData = checkNapoleonData();
  if ((napoleonData.sessions || napoleonData.config) && !options.force) {
    logger.warn('Napoleon data already exists. Use --force to overwrite.');
    logger.info('Existing Napoleon files:');
    if (napoleonData.sessions) logger.info('  - sessions.json');
    if (napoleonData.config) logger.info('  - config.json');
    return false;
  }

  let backupPath = null;

  try {
    // Create backup
    if (!options.dryRun) {
      backupPath = createBackup();
    } else {
      logger.info('[DRY RUN] Would create backup of ADD Manager data');
    }

    // Create Napoleon directory
    if (!options.dryRun) {
      const napoleonDir = getNapoleonDir();
      if (!fs.existsSync(napoleonDir)) {
        fs.mkdirSync(napoleonDir, { recursive: true, mode: 0o700 });
      }
    } else {
      logger.info('[DRY RUN] Would create Napoleon directory');
    }

    // Migrate sessions
    if (addManagerData.sessions) {
      logger.info('Migrating session data...');
      const addManagerSessions = JSON.parse(fs.readFileSync(getAddManagerSessions(), 'utf8'));
      const napoleonSessions = transformSessionData(addManagerSessions);

      if (options.verbose) {
        logger.info(`Found ${addManagerSessions.sessions?.length || 0} sessions to migrate`);
        addManagerSessions.sessions?.forEach((session) => {
          logger.info(`  - ${session.id}: ${session.instructions?.substring(0, 50)}...`);
        });
      }

      if (!options.dryRun) {
        fs.writeFileSync(getNapoleonSessions(), JSON.stringify(napoleonSessions, null, 2), {
          mode: 0o600,
        });
        logger.info('Session data migrated successfully');
      } else {
        logger.info('[DRY RUN] Would migrate session data');
      }
    }

    // Migrate config
    if (addManagerData.config) {
      logger.info('Migrating configuration...');
      const addManagerConfig = JSON.parse(fs.readFileSync(getAddManagerConfig(), 'utf8'));
      const napoleonConfig = transformConfigData(addManagerConfig);

      if (!options.dryRun) {
        fs.writeFileSync(getNapoleonConfig(), JSON.stringify(napoleonConfig, null, 2), {
          mode: 0o600,
        });
        logger.info('Configuration migrated successfully');
      } else {
        logger.info('[DRY RUN] Would migrate configuration');
      }
    }

    // Copy logs directory
    const logsDir = path.join(getAddManagerDir(), 'logs');
    if (fs.existsSync(logsDir)) {
      const napoleonLogsDir = path.join(getNapoleonDir(), 'logs');
      if (!options.dryRun) {
        fs.mkdirSync(napoleonLogsDir, { recursive: true });
        copyDirectoryRecursive(logsDir, napoleonLogsDir);
        logger.info('Log files copied successfully');
      } else {
        logger.info('[DRY RUN] Would copy log files');
      }
    }

    // Success message
    logger.info('Migration completed successfully!');

    if (!options.dryRun) {
      logger.info('');
      logger.info('Next steps:');
      logger.info('1. Install Napoleon: npm install -g napoleon');
      logger.info('2. Set up API key: export ANTHROPIC_API_KEY="your-key"');
      logger.info('3. Run Napoleon: napoleon');
      logger.info('4. Verify your sessions appear correctly');
      logger.info('');
      logger.info(`Your ADD Manager data has been backed up to: ${backupPath}`);
    }

    return true;
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    if (backupPath) {
      logger.info(`Your original data is safely backed up at: ${backupPath}`);
    }
    return false;
  }
}

/**
 * Validate migrated data
 */
function validateMigration() {
  logger.info('Validating migrated data...');

  try {
    // Check Napoleon sessions file
    const napoleonSessions = getNapoleonSessions();
    if (fs.existsSync(napoleonSessions)) {
      const sessions = JSON.parse(fs.readFileSync(napoleonSessions, 'utf8'));
      if (!sessions.sessions || !Array.isArray(sessions.sessions)) {
        throw new Error('Invalid sessions structure');
      }

      // Validate each session has required fields
      sessions.sessions.forEach((session, index) => {
        const required = ['id', 'sdkStatus', 'migrationDate'];
        required.forEach((field) => {
          if (!Object.prototype.hasOwnProperty.call(session, field)) {
            throw new Error(`Session ${index} missing required field: ${field}`);
          }
        });
      });

      logger.info(`✓ Sessions file valid (${sessions.sessions.length} sessions)`);
    }

    // Check Napoleon config file
    const napoleonConfig = getNapoleonConfig();
    if (fs.existsSync(napoleonConfig)) {
      const config = JSON.parse(fs.readFileSync(napoleonConfig, 'utf8'));
      if (!config.version || !config.features) {
        throw new Error('Invalid config structure');
      }

      logger.info('✓ Configuration file valid');
    }

    logger.info('Migration validation passed!');
    return true;
  } catch (error) {
    logger.error(`Validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArguments();

  if (options.help) {
    showHelp();
    return;
  }

  if (options.verbose) {
    logger.level = 'debug';
  }

  logger.info('ADD Manager to Napoleon Migration Tool');
  logger.info('=====================================');

  if (options.dryRun) {
    logger.info('Running in DRY RUN mode - no changes will be made');
  }

  const success = await performMigration(options);

  if (success && !options.dryRun) {
    validateMigration();
  }

  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  checkAddManagerData,
  checkNapoleonData,
  transformSessionData,
  transformConfigData,
  performMigration,
  validateMigration,
};
