#!/usr/bin/env node

/**
 * Migration script for transitioning from legacy add-manager to Napoleon CLI
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Check if AddManager data exists
 */
function checkAddManagerData() {
  const homeDir = os.homedir();
  const addManagerDir = path.join(homeDir, '.add-manager');

  if (!fs.existsSync(addManagerDir)) {
    return { exists: false, path: addManagerDir };
  }

  // Check for typical AddManager files
  const configFile = path.join(addManagerDir, 'config.json');
  const sessionsFile = path.join(addManagerDir, 'sessions.json');

  return {
    exists: true,
    path: addManagerDir,
    hasConfig: fs.existsSync(configFile),
    hasSessions: fs.existsSync(sessionsFile),
    configPath: configFile,
    sessionsPath: sessionsFile,
  };
}

/**
 * Check if Napoleon data exists
 */
function checkNapoleonData() {
  const homeDir = os.homedir();
  const napoleonDir = path.join(homeDir, '.napoleon');

  if (!fs.existsSync(napoleonDir)) {
    return { exists: false, path: napoleonDir };
  }

  // Check for Napoleon files
  const configFile = path.join(napoleonDir, 'config.json');
  const sessionsFile = path.join(napoleonDir, 'sessions.json');

  return {
    exists: true,
    path: napoleonDir,
    hasConfig: fs.existsSync(configFile),
    hasSessions: fs.existsSync(sessionsFile),
    configPath: configFile,
    sessionsPath: sessionsFile,
  };
}

/**
 * Transform session data from AddManager format to Napoleon format
 */
function transformSessionData(addManagerSessions) {
  if (!addManagerSessions || !Array.isArray(addManagerSessions.sessions)) {
    return { sessions: [], lastUpdated: new Date().toISOString() };
  }

  const transformedSessions = addManagerSessions.sessions.map((session) => ({
    id: session.id || session.agentId,
    instructions: session.instructions || session.prompt,
    spawnTime: session.spawnTime || session.createdAt,
    status: session.status || 'idle',
    pid: session.pid,
    workingDirectory: session.workingDirectory || session.cwd,
    worktreePath: session.worktreePath,
    worktreeName: session.worktreeName,
    gitRoot: session.gitRoot,
    lastActivity: session.lastActivity || session.lastUpdated,
    logs: session.logs || [],
    // Napoleon-specific fields
    sessionId: session.id || session.agentId,
    sdkStatus: 'inactive',
    lastMessageId: null,
  }));

  return {
    sessions: transformedSessions,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Transform config data from AddManager format to Napoleon format
 */
function transformConfigData(addManagerConfig) {
  if (!addManagerConfig || typeof addManagerConfig !== 'object') {
    return {
      napoleonDir: path.join(os.homedir(), '.napoleon'),
      sessionStorage: path.join(os.homedir(), '.napoleon', 'sessions'),
      maxPromptLength: 50,
      features: {
        autoCleanup: true,
      },
      logging: {
        agents: {
          enabled: false,
        },
      },
    };
  }

  // Map AddManager config to Napoleon config
  return {
    napoleonDir: addManagerConfig.dataDir || path.join(os.homedir(), '.napoleon'),
    sessionStorage: addManagerConfig.sessionStorage || path.join(os.homedir(), '.napoleon', 'sessions'),
    maxPromptLength: addManagerConfig.maxPromptLength || 50,
    features: {
      autoCleanup: addManagerConfig.autoCleanup !== false,
    },
    logging: {
      agents: {
        enabled: addManagerConfig.logging?.enabled || false,
        maxPromptLength: addManagerConfig.logging?.maxPromptLength || 50,
      },
    },
    // Preserve any additional settings
    ...addManagerConfig,
  };
}

/**
 * Perform the migration from AddManager to Napoleon
 */
async function performMigration(options = {}) {
  const { dryRun = false, backup = true } = options;

  const addManagerData = checkAddManagerData();
  const napoleonData = checkNapoleonData();

  if (!addManagerData.exists) {
    return {
      success: true,
      message: 'No AddManager data found - nothing to migrate',
      migrated: false,
    };
  }

  if (napoleonData.exists && !options.force) {
    return {
      success: false,
      message: 'Napoleon data already exists - use --force to overwrite',
      error: 'NAPOLEON_EXISTS',
    };
  }

  const migrationSteps = [];

  try {
    // Create Napoleon directory
    if (!dryRun) {
      if (!fs.existsSync(napoleonData.path)) {
        fs.mkdirSync(napoleonData.path, { recursive: true });
      }
    }
    migrationSteps.push('Created Napoleon directory');

    // Migrate config
    if (addManagerData.hasConfig) {
      const addManagerConfig = JSON.parse(fs.readFileSync(addManagerData.configPath, 'utf8'));
      const napoleonConfig = transformConfigData(addManagerConfig);

      if (!dryRun) {
        fs.writeFileSync(napoleonData.configPath, JSON.stringify(napoleonConfig, null, 2));
      }
      migrationSteps.push('Migrated configuration');
    }

    // Migrate sessions
    if (addManagerData.hasSessions) {
      const addManagerSessions = JSON.parse(fs.readFileSync(addManagerData.sessionsPath, 'utf8'));
      const napoleonSessions = transformSessionData(addManagerSessions);

      if (!dryRun) {
        fs.writeFileSync(napoleonData.sessionsPath, JSON.stringify(napoleonSessions, null, 2));
      }
      migrationSteps.push('Migrated sessions');
    }

    // Create backup if requested
    if (backup && !dryRun) {
      const backupDir = path.join(addManagerData.path, `backup-${Date.now()}`);
      fs.mkdirSync(backupDir, { recursive: true });

      if (addManagerData.hasConfig) {
        fs.copyFileSync(addManagerData.configPath, path.join(backupDir, 'config.json'));
      }
      if (addManagerData.hasSessions) {
        fs.copyFileSync(addManagerData.sessionsPath, path.join(backupDir, 'sessions.json'));
      }

      migrationSteps.push('Created backup');
    }

    return {
      success: true,
      message: 'Migration completed successfully',
      migrated: true,
      steps: migrationSteps,
      dryRun,
    };
  } catch (error) {
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
      error: error.message,
      steps: migrationSteps,
    };
  }
}

/**
 * Validate the migration was successful
 */
function validateMigration() {
  const napoleonData = checkNapoleonData();

  if (!napoleonData.exists) {
    return {
      valid: false,
      message: 'Napoleon directory not found',
      issues: ['Missing Napoleon directory'],
    };
  }

  const issues = [];

  if (!napoleonData.hasConfig) {
    issues.push('Missing config.json');
  }

  if (!napoleonData.hasSessions) {
    issues.push('Missing sessions.json');
  }

  // Validate config structure
  if (napoleonData.hasConfig) {
    try {
      const config = JSON.parse(fs.readFileSync(napoleonData.configPath, 'utf8'));
      if (!config.napoleonDir) {
        issues.push('Invalid config: missing napoleonDir');
      }
    } catch (error) {
      issues.push('Invalid config: malformed JSON');
    }
  }

  // Validate sessions structure
  if (napoleonData.hasSessions) {
    try {
      const sessions = JSON.parse(fs.readFileSync(napoleonData.sessionsPath, 'utf8'));
      if (!Array.isArray(sessions.sessions)) {
        issues.push('Invalid sessions: sessions is not an array');
      }
    } catch (error) {
      issues.push('Invalid sessions: malformed JSON');
    }
  }

  return {
    valid: issues.length === 0,
    message: issues.length === 0 ? 'Migration validation passed' : 'Migration validation failed',
    issues,
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    backup: !args.includes('--no-backup'),
  };

  console.log('Napoleon Migration Tool');
  console.log('======================');

  if (args.includes('--help')) {
    console.log(`
Usage: node migrate-to-napoleon.js [options]

Options:
  --dry-run     Show what would be migrated without making changes
  --force       Overwrite existing Napoleon data
  --no-backup   Skip creating backup of original data
  --help        Show this help message
`);
    process.exit(0);
  }

  (async () => {
    try {
      const result = await performMigration(options);

      if (result.success) {
        console.log('✅', result.message);
        if (result.steps) {
          result.steps.forEach((step) => console.log('  -', step));
        }

        if (!result.dryRun && result.migrated) {
          const validation = validateMigration();
          if (validation.valid) {
            console.log('✅ Migration validation passed');
          } else {
            console.log('❌ Migration validation failed:');
            validation.issues.forEach((issue) => console.log('  -', issue));
          }
        }
      } else {
        console.error('❌', result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  checkAddManagerData,
  checkNapoleonData,
  transformSessionData,
  transformConfigData,
  performMigration,
  validateMigration,
};
