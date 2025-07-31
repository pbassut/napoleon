const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig, SESSIONS_FILE } = require('./config');
const {
  EnvironmentValidationError,
  FileSystemError,
} = require('../utils/errors');
const logger = require('../utils/logger');
const SDKCommunicationManager = require('./sdk/communication-manager');
const { SDKStatus } = require('./sdk/sdk-types');
const AgentLogManager = require('./logging/agent-log-manager');
const toolUsageTracker = require('./tool-usage-tracker');

// Load claude-code SDK dynamically when needed
let claudeCodeSDK;
try {
  // eslint-disable-next-line global-require
  claudeCodeSDK = require('@anthropic-ai/claude-code');
} catch (error) {
  claudeCodeSDK = null;
}

// Agent status types as per US004 requirements
const AgentStatus = {
  SPAWNING: 'spawning',
  FORKING: 'forking',
  STARTING: 'starting',
  RUNNING: 'running',
  PENDING: 'pending',
  IDLE: 'idle',
  ERROR: 'error',
  FAILED: 'failed',
  TERMINATED: 'terminated',
  TERMINATING: 'terminating',
};

// Input validation patterns for security
const DANGEROUS_PATTERNS = [
  /\$\(/, // Command substitution - ACTUAL DANGER
  /\.\.[/\\]/, // Directory traversal
  /^-/, // Options starting with dash
  /\0/, // Null bytes
  // eslint-disable-next-line no-control-regex
  /[\x00-\x08\x0B\x0C\x0E-\x1F]/, // Control characters (excluding tab, newline, carriage return)
  /\x7F/, // DEL character
];

// More permissive character set - allows most printable characters
const ALLOWED_CHARS = /^[\x20-\x7E\s\n\r\t]*$/;

/**
 * Agent Manager - Handles agent lifecycle and session management
 */
class AgentManager {
  constructor() {
    this.agents = new Map();
    this.config = null;
    this.orphanScanInterval = null;
    this.sdkManager = new SDKCommunicationManager();
    this.agentLogManager = null; // Will be initialized based on config
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the agent manager
   */
  async initialize() {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create initialization promise
    // eslint-disable-next-line no-underscore-dangle
    this.initializationPromise = this._performInitialization();

    try {
      await this.initializationPromise;
      this.isInitialized = true;
      return this;
    } catch (error) {
      // Reset promise on failure to allow retry
      this.initializationPromise = null;
      throw error;
    }
  }

  // eslint-disable-next-line no-underscore-dangle
  async _performInitialization() {
    try {
      this.config = loadConfig();

      // Initialize core components in parallel where possible
      const initTasks = [];

      // Run heavy operations in parallel
      initTasks.push(
        this.initializeAgentLogging(),
      );

      // Wait for core services to initialize
      await Promise.all(initTasks);

      // Load existing sessions in background (start but don't await)
      this.loadSessionsBackground();

      // Start background orphan scanning
      // DISABLED: Commenting out background orphan scanning to prevent worktree removal
      // this.startBackgroundOrphanScanning();

      logger.info('Agent manager initialized successfully', {
        activeSessions: this.agents.size,
        persistentLogging: this.agentLogManager ? 'enabled' : 'disabled',
      });
    } catch (error) {
      logger.error('Failed to initialize agent manager', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if the agent manager is fully initialized
   */
  isFullyInitialized() {
    return this.isInitialized;
  }

  /**
   * Get initialization status for UI display
   */
  getInitializationStatus() {
    if (this.isInitialized) {
      return { status: 'ready', message: 'Fully initialized' };
    } if (this.initializationPromise) {
      return { status: 'initializing', message: 'Loading services...' };
    }
    return { status: 'pending', message: 'Not initialized' };
  }

  /**
   * Load sessions in background without blocking initialization
   */
  loadSessionsBackground() {
    // Run session loading in background
    this.loadSessions().catch((error) => {
      logger.error('Background session loading failed', { error: error.message });
    });
  }

  /**
   * Initialize persistent agent logging with graceful degradation
   */
  async initializeAgentLogging() {
    try {
      // Check if persistent logging is enabled in config
      const loggingConfig = this.config.logging?.agents;
      if (!loggingConfig || !loggingConfig.enabled) {
        logger.info('Persistent agent logging disabled via configuration');
        return;
      }

      // Create and initialize AgentLogManager
      this.agentLogManager = new AgentLogManager({
        napoleonDir: this.config.napoleonDir,
        maxPromptLength: loggingConfig.maxPromptLength || 50,
      });

      await this.agentLogManager.initialize();
      logger.info('Persistent agent logging enabled', {
        directory: loggingConfig.directory,
        maxPromptLength: loggingConfig.maxPromptLength || 50,
      });
    } catch (error) {
      logger.warn(
        'Persistent agent logging disabled due to initialization failure',
        {
          error: error.message,
        },
      );
      this.agentLogManager = null; // Disable feature on failure
    }
  }

  /**
   * Load existing sessions from storage
   */
  async loadSessions() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));

        // Validate existing sessions (check SDK session status)
        const validSessions = [];

        const sessions = sessionsData.sessions || [];
        for (let i = 0; i < sessions.length; i += 1) {
          // Migrate legacy sessions to SDK format
          const migratedSession = AgentManager.migrateLegacySession(
            sessions[i],
          );

          // Check SDK session status
          const sdkStatus = this.getSDKSessionStatus(migratedSession.sessionId);

          if (sdkStatus === SDKStatus.ACTIVE) {
            // Initialize session for restoration
            AgentManager.initializeRestoredSession(migratedSession);

            this.agents.set(migratedSession.id, migratedSession);
            validSessions.push(migratedSession);
          } else {
            logger.warn('Found stale session, removing', {
              sessionId: migratedSession.id,
              sdkStatus,
              sessionType: migratedSession.pid ? 'legacy' : 'sdk',
            });
          }
        }

        // Update sessions file with only valid sessions
        await this.saveSessions();

        logger.info('Loaded existing sessions', {
          count: validSessions.length,
        });
      }
    } catch (error) {
      logger.error('Failed to load sessions', { error: error.message });
      // Don't throw here, just log the error and continue
    }
  }

  /**
   * Reattach to existing process for log capture
   * Note: This is limited by the fact that we can't directly reattach to existing stdio streams
   * But we can at least ensure the session is properly initialized
   */
  static async reattachToProcess(session) {
    try {
      // Unfortunately, we can't reattach to existing stdio streams of a running process
      // This is a limitation of how processes work - once spawned, we can't capture their output
      // unless we had the original process object

      // However, we can ensure the session is properly initialized for any new output
      logger.debug('Attempting to reattach to process', {
        agentId: session.id,
        pid: session.pid,
      });

      // Set process to null since we can't reattach to existing streams
      Object.assign(session, { process: null });

      // Only add diagnostic info if logs are truly empty (no actual output was captured)
      // and avoid duplicates by checking for restore message
      const alreadyHasRestoreMessage = session.logs.some(
        (log) => log.content && log.content.includes('Session restored - PID'),
      );

      if (!alreadyHasRestoreMessage && session.logs.length === 0) {
        // Add detailed diagnostic logs only for truly restored sessions
        const diagnosticLogs = [
          {
            timestamp: new Date(session.spawnTime),
            content: `🚀 Agent spawned: ${new Date(session.spawnTime).toLocaleString()}`,
            type: 'info',
          },
          {
            timestamp: new Date(session.spawnTime),
            content: `📝 Instructions: "${session.instructions}"`,
            type: 'info',
          },
          {
            timestamp: new Date(session.spawnTime),
            content: `📁 Working directory: ${session.workingDirectory}`,
            type: 'info',
          },
          {
            timestamp: new Date(session.spawnTime),
            content: `🌿 Git worktree: ${session.worktreePath}`,
            type: 'info',
          },
          {
            timestamp: new Date(),
            content: `🔄 Session restored - PID: ${session.pid}`,
            type: 'info',
          },
          {
            timestamp: new Date(),
            content:
              '⚠️  Previous output cannot be recovered - process was started before logging',
            type: 'warning',
          },
          {
            timestamp: new Date(),
            content: `📊 Status: ${session.status} | Last activity: ${new Date(session.lastActivity).toLocaleString()}`,
            type: 'info',
          },
          {
            timestamp: new Date(),
            content:
              '💡 New agent output will be captured in real-time from this point forward',
            type: 'info',
          },
        ];

        session.logs.push(...diagnosticLogs);
      }

      logger.info('Session restored with limited output capture', {
        agentId: session.id,
        pid: session.pid,
      });
    } catch (error) {
      logger.error('Failed to reattach to process', {
        agentId: session.id,
        pid: session.pid,
        error: error.message,
      });
    }
  }

  /**
   * Save sessions to storage
   */
  async saveSessions() {
    try {
      // Create serializable session data (exclude process objects)
      const sessions = Array.from(this.agents.values()).map((session) => ({
        id: session.id,
        instructions: session.instructions,
        spawnTime: session.spawnTime,
        status: session.status,
        pid: session.pid,
        workingDirectory: session.workingDirectory,
        worktreePath: session.worktreePath,
        worktreeName: session.worktreeName,
        gitRoot: session.gitRoot,
        lastActivity: session.lastActivity,
        logs: session.logs || [], // Include logs array for persistence
        // Exclude process and output objects as they cannot be serialized
      }));

      const sessionsData = {
        sessions,
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsData, null, 2), {
        mode: 0o600,
      });

      logger.debug('Sessions saved successfully', { count: this.agents.size });
    } catch (error) {
      logger.error('Failed to save sessions', { error: error.message });
      throw new FileSystemError(
        `Failed to save sessions: ${error.message}`,
        'SESSION_SAVE_FAILED',
        'Please check file permissions for ~/.napoleon/',
      );
    }
  }

  /**
   * Validate git repository context
   */
  static validateGitRepository() {
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --is-inside-work-tree', {
        stdio: 'ignore',
        cwd: process.cwd(),
      });

      // Get repository root
      const repoRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf8',
        cwd: process.cwd(),
      }).trim();

      return {
        isValid: true,
        rootPath: repoRoot,
        currentPath: process.cwd(),
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Not in a git repository',
        suggestion:
          'Please run Napoleon from within a git repository directory',
      };
    }
  }

  /**
   * Instance method wrapper for validateGitRepository
   */
  // eslint-disable-next-line class-methods-use-this
  validateGitRepository() {
    return AgentManager.validateGitRepository();
  }

  /**
   * Migrate legacy session to SDK format
   * @private
   */
  static migrateLegacySession(session) {
    // Return session as-is if already migrated
    if (session.sdkStatus) {
      return session;
    }

    // Migrate legacy session structure
    return {
      ...session,
      sdkStatus: SDKStatus.INACTIVE,
      sessionId: session.sessionId || session.id,
      lastMessageId: session.lastMessageId || null,
    };
  }

  /**
   * Initialize restored session with required properties
   * @private
   */
  static initializeRestoredSession(session) {
    // Initialize logging arrays if they don't exist
    const logs = session.logs || [];
    const output = session.output || [];

    // Mark this session as restored from previous run
    Object.assign(session, {
      logs,
      output,
      wasRestored: true,
      sdkStatus: SDKStatus.ACTIVE,
    });
  }

  /**
   * Get SDK session status for validation
   */
  getSDKSessionStatus(sessionId) {
    try {
      const session = this.sdkManager.getSession(sessionId);
      if (!session) {
        return SDKStatus.INACTIVE;
      }
      return session.isActive ? SDKStatus.ACTIVE : SDKStatus.INACTIVE;
    } catch (error) {
      logger.warn('Failed to get SDK session status', {
        sessionId,
        error: error.message,
      });
      return SDKStatus.ERROR;
    }
  }

  /**
   * Initialize SDK session for an agent
   */
  async initializeSDKSession(agentId, workingDirectory) {
    try {
      // Validate API key before initializing session
      AgentManager.validateAPIKey();

      logger.info('Initializing SDK session', { agentId, workingDirectory });

      const sdkSession = await this.sdkManager.initializeSDKSession(
        agentId,
        workingDirectory,
      );

      logger.info('SDK session initialized successfully', {
        agentId,
        sessionId: sdkSession.agentId,
        isActive: sdkSession.isActive,
      });

      return sdkSession;
    } catch (error) {
      logger.error('Failed to initialize SDK session', {
        agentId,
        workingDirectory,
        error: error.message,
      });

      // Re-throw validation errors as-is to preserve error codes and messages
      if (error instanceof EnvironmentValidationError) {
        throw error;
      }

      throw new EnvironmentValidationError(
        `Failed to initialize SDK session: ${error.message}`,
        'SDK_INITIALIZATION_FAILED',
        'Check SDK configuration and dependencies',
      );
    }
  }

  /**
   * Generate unique agent ID
   */
  static generateAgentId() {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate worktree name following the naming convention
   * Pattern: agent-{id}-{timestamp}
   */
  static generateWorktreeName(agentId) {
    const timestamp = Date.now();
    return `agent-${agentId.replace('agent-', '')}-${timestamp}`;
  }

  /**
   * Ensure worktree directory structure exists
   */
  static ensureWorktreeDirectory() {
    // Use ~/.napoleon/worktrees/ to avoid git clean issues
    const worktreesDir = path.join(os.homedir(), '.napoleon', 'worktrees');

    if (!fs.existsSync(worktreesDir)) {
      try {
        fs.mkdirSync(worktreesDir, { recursive: true, mode: 0o755 });
        logger.info('Created worktrees directory', { path: worktreesDir });
      } catch (error) {
        throw new FileSystemError(
          `Failed to create worktrees directory: ${error.message}`,
          'WORKTREE_DIR_CREATION_FAILED',
          'Please check write permissions for the project directory',
        );
      }
    }

    return worktreesDir;
  }

  /**
   * Validate git repository state for worktree creation
   */
  static validateGitForWorktree() {
    try {
      // Check if we're in a git repository
      const gitValidation = AgentManager.validateGitRepository();
      if (!gitValidation.isValid) {
        return gitValidation;
      }

      // Check for uncommitted changes
      try {
        execSync('git diff-index --quiet HEAD --', {
          stdio: 'ignore',
          cwd: process.cwd(),
        });
      } catch (error) {
        return {
          isValid: false,
          error: 'Repository has uncommitted changes',
          suggestion:
            'Please commit or stash your changes before creating worktrees',
          hasUncommittedChanges: true,
        };
      }

      // Check for untracked files that might interfere
      try {
        const untrackedFiles = execSync(
          'git ls-files --others --exclude-standard',
          {
            encoding: 'utf8',
            cwd: process.cwd(),
          },
        ).trim();

        if (untrackedFiles.length > 0) {
          logger.warn('Repository has untracked files', {
            files: untrackedFiles.split('\n').length,
          });
        }
      } catch (error) {
        // Non-critical, just log
        logger.debug('Could not check untracked files', {
          error: error.message,
        });
      }

      return {
        isValid: true,
        rootPath: gitValidation.rootPath,
        currentPath: gitValidation.currentPath,
        clean: true,
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Git validation failed: ${error.message}`,
        suggestion: 'Please ensure you are in a valid git repository',
      };
    }
  }

  /**
   * Create git worktree for agent
   */
  async createWorktree(agentId) {
    return new Promise((resolve, reject) => {
      try {
        const startTime = Date.now();

        // Validate git state
        const gitValidation = AgentManager.validateGitForWorktree();
        if (!gitValidation.isValid) {
          reject(
            new EnvironmentValidationError(
              gitValidation.error,
              'GIT_WORKTREE_VALIDATION_FAILED',
              gitValidation.suggestion,
            ),
          );
          return;
        }

        // Ensure worktree directory exists
        const worktreesDir = AgentManager.ensureWorktreeDirectory();

        // Generate worktree name and path
        const worktreeName = AgentManager.generateWorktreeName(agentId);
        const worktreePath = path.join(worktreesDir, worktreeName);

        logger.info('Creating git worktree', {
          agentId,
          worktreeName,
          worktreePath,
          timestamp: new Date().toISOString(),
        });

        // Create the worktree
        exec(
          `git worktree add "${worktreePath}" origin/main --lock`,
          {
            cwd: process.cwd(),
            timeout: 120000, // 2 minute timeout for large repos
          },
          (error, stdout, stderr) => {
            const duration = Date.now() - startTime;

            if (error) {
              logger.error('Git worktree creation failed', {
                agentId,
                worktreePath,
                error: error.message,
                stderr,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString(),
              });

              // Clean up any partial directory creation
              this.cleanupFailedWorktree(worktreePath);

              reject(
                new EnvironmentValidationError(
                  `Worktree creation failed: ${stderr || error.message}`,
                  'WORKTREE_CREATION_FAILED',
                  'Please check git repository state and try again',
                ),
              );
            } else {
              // Validate that worktree directory actually exists
              const worktreeExists = fs.existsSync(worktreePath);
              const isDirectory = worktreeExists && fs.statSync(worktreePath).isDirectory();

              logger.info('Git worktree created successfully', {
                agentId,
                worktreeName,
                worktreePath,
                stdout: stdout.trim(),
                duration: `${duration}ms`,
                worktreeExists,
                isDirectory,
                timestamp: new Date().toISOString(),
              });

              if (!worktreeExists || !isDirectory) {
                const validationError = new EnvironmentValidationError(
                  `Worktree creation succeeded but directory validation failed. Expected: ${worktreePath}`,
                  'WORKTREE_VALIDATION_FAILED',
                  'Worktree directory not found after creation',
                );

                logger.error('Worktree validation failed after creation', {
                  agentId,
                  worktreePath,
                  worktreeExists,
                  isDirectory,
                  duration: `${duration}ms`,
                });

                this.cleanupFailedWorktree(worktreePath);
                reject(validationError);
                return;
              }

              // Install dependencies in the worktree using npm ci for speed
              logger.info('Installing dependencies in worktree', {
                agentId,
                worktreePath,
              });

              exec(
                'npm ci',
                {
                  cwd: worktreePath,
                  timeout: 180000, // 3 minute timeout for npm ci
                },
                (npmError, npmStdout, npmStderr) => {
                  if (npmError) {
                    logger.error('npm ci failed in worktree - aborting agent creation', {
                      agentId,
                      worktreePath,
                      error: npmError.message,
                      stderr: npmStderr,
                    });

                    // Clean up the failed worktree (respects autoCleanup setting)
                    this.cleanupFailedWorktree(worktreePath);

                    reject(
                      new EnvironmentValidationError(
                        `Failed to install dependencies in worktree: ${npmError.message}`,
                        'DEPENDENCY_INSTALLATION_FAILED',
                        'Ensure npm is available and package-lock.json is valid',
                      ),
                    );
                    return;
                  }

                  logger.debug('Dependencies installed successfully in worktree', {
                    agentId,
                    worktreePath,
                    stdout: npmStdout.trim(),
                  });

                  resolve({
                    worktreeName,
                    worktreePath,
                    agentId,
                    duration,
                    validated: true,
                    dependenciesInstalled: true,
                  });
                },
              );
            }
          },
        );
      } catch (error) {
        logger.error('Worktree creation caught exception', {
          agentId,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        reject(error);
      }
    });
  }

  /**
   * Clean up failed worktree creation
   */
  cleanupFailedWorktree(worktreePath) {
    try {
      logger.debug('CLEANUP_PATH: cleanupFailedWorktree called', {
        worktreePath,
        autoCleanup: this.config.features?.autoCleanup,
      });

      // Check autoCleanup configuration before cleaning up failed worktree
      if (!this.config.features?.autoCleanup) {
        logger.debug('Failed worktree cleanup disabled by configuration', {
          worktreePath,
        });
        return;
      }

      if (fs.existsSync(worktreePath)) {
        fs.rmSync(worktreePath, { recursive: true, force: true });
        logger.info('Cleaned up failed worktree directory', { worktreePath });
      }
    } catch (error) {
      logger.warn('Failed to clean up failed worktree', {
        worktreePath,
        error: error.message,
      });
    }
  }

  /**
   * Remove git worktree
   */
  async removeWorktree(worktreePath) {
    return new Promise((resolve, reject) => {
      if (!worktreePath || !fs.existsSync(worktreePath)) {
        resolve(); // Already cleaned up
        return;
      }

      logger.debug('CLEANUP_PATH: removeWorktree called', {
        worktreePath,
        autoCleanup: this.config.features?.autoCleanup,
      });
      logger.info('Removing git worktree', { worktreePath });

      // First unlock the worktree if it's locked
      exec(
        `git worktree unlock "${worktreePath}"`,
        {
          cwd: process.cwd(),
          timeout: 10000,
        },
        (unlockError, _unlockStdout, _unlockStderr) => {
          if (unlockError) {
            logger.debug('Worktree unlock failed (this is normal if not locked)', {
              worktreePath,
              error: unlockError.message,
            });
          } else {
            logger.debug('Worktree unlocked before removal', { worktreePath });
          }

          // Now remove the worktree
          exec(
            `git worktree remove "${worktreePath}"`,
            {
              cwd: process.cwd(),
              timeout: 15000, // 15 second timeout
            },
            (error, stdout, stderr) => {
              if (error) {
                logger.warn(
                  'Git worktree removal failed, attempting manual cleanup',
                  {
                    worktreePath,
                    error: error.message,
                    stderr,
                  },
                );

                // Fallback: manual directory removal (respect autoCleanup)
                try {
                  // Check autoCleanup configuration before manual cleanup
                  if (!this.config.features?.autoCleanup) {
                    logger.debug('Manual worktree cleanup disabled by configuration', {
                      worktreePath,
                    });
                    resolve(); // Consider it handled even though not cleaned
                    return;
                  }

                  fs.rmSync(worktreePath, { recursive: true, force: true });
                  logger.info('Manually cleaned up worktree directory', {
                    worktreePath,
                  });
                  resolve();
                } catch (cleanupError) {
                  logger.error('Failed to manually clean up worktree', {
                    worktreePath,
                    error: cleanupError.message,
                  });
                  reject(cleanupError);
                }
              } else {
                logger.info('Git worktree removed successfully', {
                  worktreePath,
                  stdout: stdout.trim(),
                });
                resolve();
              }
            },
          );
        },
      );
    });
  }

  /**
   * Validate agent instructions for security and format
   */
  static validateInstructions(instructions) {
    if (!instructions || typeof instructions !== 'string') {
      throw new EnvironmentValidationError(
        'Instructions must be a non-empty string',
        'INVALID_INSTRUCTIONS_TYPE',
        'Please provide valid text instructions for the agent',
      );
    }

    const trimmed = instructions.trim();

    // Remove minimum length validation - allow any non-empty instructions
    // This aligns with US028 requirements

    if (trimmed.length > 5000) {
      throw new EnvironmentValidationError(
        'Agent instructions must be less than 5000 characters',
        'INSTRUCTIONS_TOO_LONG',
        'Please provide more concise instructions for the agent',
      );
    }

    // Security validation - check for dangerous patterns
    DANGEROUS_PATTERNS.forEach((pattern) => {
      if (pattern.test(trimmed)) {
        throw new EnvironmentValidationError(
          'Instructions contain potentially dangerous patterns. Please avoid command substitution ($(...)) and path traversal (../)',
          'DANGEROUS_INPUT_DETECTED',
          'Remove command substitution patterns and directory traversal sequences from your instructions',
        );
      }
    });

    // Character set validation
    if (!ALLOWED_CHARS.test(trimmed)) {
      throw new EnvironmentValidationError(
        'Instructions contain invalid characters',
        'INVALID_CHARACTERS',
        'Please use only standard alphanumeric characters and basic punctuation',
      );
    }

    return trimmed;
  }

  /**
   * Validate options object for spawning agent
   */
  static validateOptions(options) {
    if (!options || typeof options !== 'object') {
      return {}; // Return empty object if invalid
    }

    const validatedOptions = {};

    // Validate working directory if provided
    if (options.workingDirectory) {
      const workingDir = path.resolve(options.workingDirectory);

      // Check if directory exists and is accessible
      try {
        const stats = fs.statSync(workingDir);
        if (!stats.isDirectory()) {
          throw new EnvironmentValidationError(
            'Working directory is not a valid directory',
            'INVALID_WORKING_DIRECTORY',
            'Please provide a valid directory path',
          );
        }
        validatedOptions.workingDirectory = workingDir;
      } catch (error) {
        if (error instanceof EnvironmentValidationError) {
          throw error; // Re-throw validation errors
        }
        throw new EnvironmentValidationError(
          'Working directory is not accessible',
          'WORKING_DIRECTORY_NOT_ACCESSIBLE',
          'Please ensure the directory exists and is readable',
        );
      }
    }

    return validatedOptions;
  }

  /**
   * Spawn a new agent with instructions
   */
  async spawnAgent(instructions, options = {}) {
    const spawnStartTime = Date.now();
    let agentId;

    try {
      // Ensure initialization is complete before spawning agents
      if (!this.isInitialized) {
        logger.info('Agent manager not yet initialized, waiting...');
        await this.initialize();
      }

      // Checkpoint 1: Input validation
      const validationStartTime = Date.now();

      const sanitizedInstructions = AgentManager.validateInstructions(instructions);
      const validatedOptions = AgentManager.validateOptions(options);

      const validationDuration = Date.now() - validationStartTime;

      // No agent limit - allow unlimited agents

      // Validate git repository
      const gitValidation = AgentManager.validateGitRepository();
      if (!gitValidation.isValid) {
        throw new EnvironmentValidationError(
          gitValidation.error,
          'GIT_REPO_INVALID',
          gitValidation.suggestion,
        );
      }

      // Generate agent session (or use provided one for pending agent replacement)
      agentId = validatedOptions.agentId || options.agentId || AgentManager.generateAgentId();

      logger.info('SPAWN_FLOW: Starting agent spawn process', {
        agentId,
        instructionsLength: instructions.length,
        validationDuration: `${validationDuration}ms`,
        checkpoint: 'validation_complete',
        timestamp: new Date().toISOString(),
      });

      // Update status to forking before creating worktree
      if (this.agents.has(agentId)) {
        const agent = this.agents.get(agentId);
        agent.status = AgentStatus.FORKING;
        this.agents.set(agentId, agent);
      }

      // Checkpoint 2: Worktree creation
      const worktreeStartTime = Date.now();

      logger.info('SPAWN_FLOW: About to create worktree', {
        agentId,
        checkpoint: 'worktree_creation_start',
        timestamp: new Date().toISOString(),
      });

      const worktreeInfo = await this.createWorktree(agentId);
      const worktreeDuration = Date.now() - worktreeStartTime;

      logger.info('SPAWN_FLOW: Worktree created successfully', {
        agentId,
        worktreeInfo,
        worktreeDuration: `${worktreeDuration}ms`,
        checkpoint: 'worktree_creation_complete',
        timestamp: new Date().toISOString(),
      });

      const workingDirectory = worktreeInfo.worktreePath;

      // Checkpoint 3: Session creation
      const sessionStartTime = Date.now();

      logger.info('SPAWN_FLOW: Creating agent session', {
        agentId,
        checkpoint: 'session_creation_start',
        timestamp: new Date().toISOString(),
      });

      // Create agent session data
      const session = {
        id: agentId,
        instructions: sanitizedInstructions,
        spawnTime: new Date().toISOString(),
        status: AgentStatus.SPAWNING,
        workingDirectory,
        worktreePath: worktreeInfo.worktreePath,
        worktreeName: worktreeInfo.worktreeName,
        gitRoot: gitValidation.rootPath,
        lastActivity: new Date().toISOString(),
        logs: [], // Initialize logs array for detail view
        // SDK-specific fields
        sessionId: agentId,
        sdkStatus: SDKStatus.CONNECTING,
        lastMessageId: null,
      };

      // Add to agents map early to show spawning status
      this.agents.set(agentId, session);

      // Initialize logs array for the session
      session.logs = session.logs || [];

      // Add initial log entry for agent spawn
      session.logs.push({
        timestamp: new Date(),
        content: `Agent ${agentId} spawned successfully - initializing SDK session...`,
        type: 'info',
      });

      const sessionDuration = Date.now() - sessionStartTime;

      logger.info('SPAWN_FLOW: Agent session created', {
        agentId,
        sessionDuration: `${sessionDuration}ms`,
        checkpoint: 'session_creation_complete',
        timestamp: new Date().toISOString(),
      });

      // Update status to starting before SDK initialization
      session.status = AgentStatus.STARTING;
      this.agents.set(agentId, session);

      // Checkpoint 4: SDK initialization
      const sdkStartTime = Date.now();

      logger.info('SPAWN_FLOW: About to initialize SDK session', {
        agentId,
        workingDirectory,
        checkpoint: 'sdk_initialization_start',
        timestamp: new Date().toISOString(),
      });

      // DEBUG: Wait 10 seconds before SDK initialization to check worktree state
      logger.info('SPAWN_FLOW: Proceeding with SDK initialization', {
        agentId,
        timestamp: new Date().toISOString(),
      });

      // Initialize SDK session
      const sdkSession = await this.initializeSDKSession(
        agentId,
        workingDirectory,
      );

      const sdkDuration = Date.now() - sdkStartTime;

      logger.info('SPAWN_FLOW: SDK session initialized successfully', {
        agentId,
        sdkDuration: `${sdkDuration}ms`,
        checkpoint: 'sdk_initialization_complete',
        timestamp: new Date().toISOString(),
      });

      // Add SDK initialization log
      session.logs.push({
        timestamp: new Date(),
        content:
          'SDK session initialized - preparing to process instructions...',
        type: 'info',
      });

      // Update session with SDK info
      session.sdkStatus = SDKStatus.ACTIVE;
      session.status = AgentStatus.RUNNING;
      session.lastMessageId = sdkSession.lastMessageId;

      // Store session
      this.agents.set(agentId, session);
      await this.saveSessions();

      // Create persistent log file for the agent
      if (this.agentLogManager) {
        try {
          const logPath = await this.agentLogManager.createAgentLog(
            agentId,
            sanitizedInstructions,
          );
          logger.debug('Persistent log created for agent', {
            agentId,
            logPath,
          });
        } catch (error) {
          logger.warn('Failed to create persistent log for agent', {
            agentId,
            error: error.message,
          });
        }
      }

      // Checkpoint 5: Final completion
      const totalSpawnDuration = Date.now() - spawnStartTime;

      logger.info('SPAWN_FLOW: About to send instructions to agent', {
        agentId,
        checkpoint: 'instructions_sending_start',
        timestamp: new Date().toISOString(),
      });

      // Send initial instructions to agent
      this.sendInstructions(agentId, instructions);

      logger.info('SPAWN_FLOW: Agent spawn process completed successfully', {
        agentId,
        sessionId: session.sessionId,
        status: session.status,
        totalSpawnDuration: `${totalSpawnDuration}ms`,
        checkpoint: 'spawn_complete',
        timestamp: new Date().toISOString(),
        worktreeValidated: worktreeInfo.validated,
        performanceBreakdown: {
          validation: `${validationDuration}ms`,
          worktreeCreation: `${worktreeDuration}ms`,
          sessionCreation: `${sessionDuration}ms`,
          sdkInitialization: `${sdkDuration}ms`,
          total: `${totalSpawnDuration}ms`,
        },
      });

      return session;
    } catch (error) {
      const totalSpawnDuration = Date.now() - spawnStartTime;

      logger.error('SPAWN_FLOW: Agent spawn process failed', {
        agentId: agentId || 'unknown',
        error: error.message,
        totalSpawnDuration: `${totalSpawnDuration}ms`,
        checkpoint: 'spawn_failed',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Validate API key for SDK operations
   * @private
   */
  static validateAPIKey() {
    // API key validation is currently disabled
    // TODO: Re-enable when needed
  }

  /**
   * Send instructions to agent using Claude SDK
   */
  async sendInstructions(agentId, instructions) {
    const session = this.agents.get(agentId);
    if (!session) {
      throw new Error('Agent session not found');
    }

    // Check SDK session status
    const sdkStatus = this.getSDKSessionStatus(session.sessionId || session.id);
    if (sdkStatus !== SDKStatus.ACTIVE) {
      throw new Error('SDK session not available or inactive');
    }

    try {
      logger.debug('Sending instructions to agent via SDK', {
        agentId,
        instructionsLength: instructions.length,
      });

      // Add log entry for instruction processing
      this.handleSDKMessage(agentId, {
        content: `Processing instructions: "${instructions}"`,
        type: 'info',
      });

      // Update session status to indicate processing
      this.updateAgentStatus(agentId, AgentStatus.RUNNING);

      // Execute query using SDK manager in the background
      // Don't await - let the agent run asynchronously
      // Capture session data to prevent race conditions
      const sessionId = session.sessionId || session.id;

      // Execute SDK query with real-time streaming through SDKCommunicationManager
      (async () => {
        try {
          logger.info('Starting real-time SDK query stream for agent', { agentId });

          // Use the new streaming method from SDKCommunicationManager
          const messageStream = this.sdkManager.executeQueryStream(sessionId, instructions);

          // Process messages as they arrive in real-time using for await
          for await (const message of messageStream) {
            logger.info('SDK message received (real-time)', {
              agentId,
              messageType: message.type,
              messageId: message.id,
            });

            // Handle real-time output from SDK immediately
            this.handleSDKMessage(agentId, message);
          }

          // Update status when SDK query completes
          const currentSession = this.agents.get(agentId);
          if (currentSession && currentSession.status === AgentStatus.RUNNING) {
            this.updateAgentStatus(agentId, AgentStatus.IDLE);
          }

          logger.info('SDK query stream completed for agent', { agentId });
        } catch (error) {
          logger.error('SDK query stream failed for agent', {
            agentId,
            error: error.message,
            stack: error.stack,
          });

          // Update agent status to error
          const currentSession = this.agents.get(agentId);
          if (currentSession) {
            currentSession.error = error.message;
            this.updateAgentStatus(agentId, AgentStatus.ERROR);
          } else {
            logger.warn('Agent session was deleted during SDK query execution', {
              agentId,
              error: error.message,
            });
          }
        }
      })();

      logger.info('SDK query started in background', {
        agentId,
      });
    } catch (error) {
      logger.error('Failed to send instructions to agent via SDK', {
        agentId,
        error: error.message,
      });
      this.updateAgentStatus(agentId, AgentStatus.ERROR);
      throw error;
    }
  }

  /**
   * Handle SDK message output
   */
  handleSDKMessage(agentId, message) {
    const session = this.agents.get(agentId);
    if (!session) return;

    // Initialize logs array if not exists (for detail view)
    if (!session.logs) {
      session.logs = [];
    }

    // Add message to logs
    session.logs.push({
      timestamp: new Date(),
      content: message.content || JSON.stringify(message),
      type: message.type || 'info',
    });

    // Keep only last 1000 log entries for detail view
    if (session.logs.length > 1000) {
      session.logs = session.logs.slice(-1000);
    }

    // Add persistent logging after existing session.logs update
    if (this.agentLogManager) {
      this.agentLogManager
        .writeLogEntry(agentId, {
          type: message.type || 'sdk_message',
          source: 'claude_sdk',
          content: message.content || JSON.stringify(message),
          metadata: {
            messageId: message.id,
            sdkType: message.type,
            timestamp: new Date().toISOString(),
          },
        })
        .catch((error) => {
          logger.warn('Failed to write persistent log entry', {
            agentId,
            error: error.message,
          });
        });
    }

    // Auto-terminate agent when it reaches a result state (waiting for input)
    // Only if autoCleanup is enabled
    if (message.type === 'result') {
      if (this.config.features?.autoCleanup) {
        logger.info('Agent reached result state, auto-terminating', {
          agentId,
          resultContent: message.content,
        });

        // Add termination log entry
        session.logs.push({
          timestamp: new Date(),
          content:
            'Agent completed task and is waiting for input - auto-terminating',
          type: 'system',
        });

        // Terminate the agent asynchronously to avoid blocking message processing
        setImmediate(() => {
          this.terminateAgent(agentId).catch((error) => {
            logger.error('Failed to auto-terminate agent', {
              agentId,
              error: error.message,
            });
          });
        });
      } else {
        logger.info('Agent reached result state, keeping alive (autoCleanup disabled)', {
          agentId,
          resultContent: message.content,
        });

        // Add completion log entry but don't terminate
        session.logs.push({
          timestamp: new Date(),
          content:
            'Agent completed task and is waiting for input - staying active (autoCleanup disabled)',
          type: 'system',
        });

        // Update status to IDLE instead of terminating
        this.updateAgentStatus(agentId, AgentStatus.IDLE);
      }
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();

    logger.debug('SDK message received', {
      agentId,
      type: message.type,
      length: message.content?.length || 0,
    });
  }

  /**
   * Handle agent output
   */
  handleAgentOutput(agentId, type, data) {
    const session = this.agents.get(agentId);
    if (!session) return;

    const output = data.toString();

    // Initialize output buffer if not exists
    if (!session.output) {
      session.output = [];
    }

    // Initialize logs array if not exists (for detail view)
    if (!session.logs) {
      session.logs = [];
    }

    // Add to output buffer
    session.output.push({
      type,
      data: output,
      timestamp: new Date().toISOString(),
    });

    // Split output by lines and add each as separate log entry for detail view
    const timestamp = new Date();
    const lines = output.split('\n').filter((line) => line.trim() !== '');
    lines.forEach((line) => {
      session.logs.push({
        timestamp,
        content: line.trim(),
        type,
      });
    });

    // Keep only last 1000 output entries
    if (session.output.length > 1000) {
      session.output = session.output.slice(-1000);
    }

    // Keep only last 1000 log entries for detail view
    if (session.logs.length > 1000) {
      session.logs = session.logs.slice(-1000);
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();

    logger.debug('Agent output received', {
      agentId,
      type,
      length: output.length,
    });
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId, status) {
    const session = this.agents.get(agentId);
    if (session) {
      session.status = status;
      session.lastActivity = new Date().toISOString();

      // If agent is terminated, remove from active sessions
      // if (status === AgentStatus.TERMINATING || status === AgentStatus.ERROR) {
      //   this.agents.delete(agentId);
      // }

      // Save sessions
      this.saveSessions().catch((error) => {
        logger.error('Failed to save sessions after status update', {
          agentId,
          status,
          error: error.message,
        });
      });
    }
  }

  /**
   * Get all active agents
   */
  getActiveAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Add a pending agent to the UI immediately for loading state display
   * Used when starting agent creation process to show immediate feedback
   */
  addPendingAgent(agentConfig) {
    const pendingAgent = {
      ...agentConfig,
      status: AgentStatus.SPAWNING,
      createdAt: new Date().toISOString(),
      progress: 'Initializing...',
      spawnTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    this.agents.set(pendingAgent.id, pendingAgent);
    logger.debug('Added pending agent for immediate UI feedback', {
      agentId: pendingAgent.id,
      instructions: pendingAgent.instructions.substring(0, 50),
    });

    return pendingAgent;
  }

  /**
   * Update pending agent status with progress information
   * Used for background process status updates during spawn
   */
  updatePendingAgentStatus(agentId, status, errorMessage = null) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastActivity = new Date().toISOString();

      if (errorMessage) {
        agent.error = errorMessage;
        agent.progress = `Error: ${errorMessage}`;
      } else if (status === AgentStatus.IDLE) {
        agent.progress = 'Ready';
      } else if (status === AgentStatus.RUNNING) {
        agent.progress = 'Active';
      } else if (status === AgentStatus.SPAWNING) {
        agent.progress = agent.progress || 'Creating...';
      }

      logger.debug('Updated pending agent status', {
        agentId,
        status,
        error: errorMessage,
      });

      // If agent has error or terminating status, handle removal
      if (status === AgentStatus.ERROR || status === AgentStatus.TERMINATING) {
        this.agents.delete(agentId);
      }
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Terminate agent
   * @param {string} agentId - The agent ID to terminate
   * @param {Object} options - Termination options
   * @param {boolean} options.force - Force termination
   * @param {boolean} options.preserveBranch - Preserve git branch during cleanup
   * @param {boolean} options.deleteWorktree - Delete worktree completely (for UI deletion)
   */
  async terminateAgent(agentId, options = {}) {
    const session = this.agents.get(agentId);
    if (!session) {
      throw new Error('Agent not found');
    }

    try {
      // Terminate persistent log before session cleanup
      if (this.agentLogManager) {
        try {
          const finalLogPath = await this.agentLogManager.terminateAgentLog(agentId);
          logger.debug('Persistent log terminated', { agentId, finalLogPath });
        } catch (error) {
          logger.warn('Failed to terminate persistent log', {
            agentId,
            error: error.message,
          });
        }
      }

      // Terminate SDK session gracefully
      if (session.sessionId || session.id) {
        const terminationSuccess = await this.sdkManager.terminateSession(
          session.sessionId || session.id,
        );
        if (terminationSuccess) {
          session.sdkStatus = SDKStatus.INACTIVE;
          logger.info('SDK session terminated successfully', { agentId });
        } else {
          logger.warn('SDK session termination failed', { agentId });
          session.sdkStatus = SDKStatus.ERROR;
        }
      }

      this.updateAgentStatus(agentId, AgentStatus.TERMINATING);

      // Clean up tool usage tracking data
      toolUsageTracker.cleanupAgent(agentId);

      // Remove agent from active list and mark as terminated
      this.agents.delete(agentId);
      await this.saveSessions();

      logger.info('Agent terminated', { agentId });
    } catch (error) {
      logger.error('Failed to terminate agent', {
        agentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get agent count
   */
  getAgentCount() {
    return this.agents.size;
  }

  /**
   * Check if can spawn more agents
   */
  static canSpawnAgent() {
    return true; // No limit - always allow spawning
  }

  /**
   * Instance method wrapper for canSpawnAgent
   */
  // eslint-disable-next-line class-methods-use-this
  canSpawnAgent() {
    return AgentManager.canSpawnAgent();
  }

  /**
   * Get runtime duration for an agent
   */
  getAgentRuntime(agentId) {
    const session = this.agents.get(agentId);
    if (!session) return 0;

    const startTime = new Date(session.spawnTime);
    const now = new Date();
    return Math.floor((now - startTime) / 1000); // Return in seconds
  }

  /**
   * Format runtime duration in HH:MM format with 'min' label
   */
  static formatRuntime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}min`;
  }

  /**
   * Get detailed agent status for display
   */
  getAgentStatusDisplay(agentId) {
    const session = this.agents.get(agentId);
    if (!session) {
      return {
        status: 'unknown',
        displayText: 'Unknown',
        color: 'gray',
      };
    }

    const { status } = session;
    let displayText = 'Unknown';
    let color = 'gray';

    switch (status) {
      case 'running':
        displayText = 'Running';
        color = 'green';
        break;
      case 'spawning':
        displayText = 'Spawning';
        color = 'yellow';
        break;
      case 'idle':
        displayText = 'Idle';
        color = 'blue';
        break;
      case 'error':
        displayText = 'Error';
        color = 'red';
        break;
      case 'terminated':
        displayText = 'Terminated';
        color = 'gray';
        break;
      default:
        displayText = status || 'Unknown';
        color = 'gray';
    }

    return {
      status,
      displayText,
      color,
    };
  }

  /**
   * Get current task for an agent from todos array (static)
   */
  static getCurrentTask(agentId) {
    const todos = toolUsageTracker.getAgentTodos(agentId);

    if (!todos || !Array.isArray(todos)) {
      return null;
    }

    const inProgressTasks = todos.filter((todo) => todo.status === 'in_progress');

    if (inProgressTasks.length === 0) {
      return null; // No active task
    }

    if (inProgressTasks.length === 1) {
      return inProgressTasks[0];
    }

    // Handle edge case of multiple in_progress tasks
    logger.warn('Multiple in_progress todos found for agent', {
      agentId,
      count: inProgressTasks.length,
      tasks: JSON.stringify(inProgressTasks),
    });
    return inProgressTasks[0]; // Return first one
  }

  /**
   * Get current task for an agent from todos array (instance method)
   */
  getCurrentTask(agentId) {
    return AgentManager.getCurrentTask(agentId);
  }

  /**
   * Get comprehensive agent details for detail view
   */
  getAgentDetails(agentId) {
    const session = this.agents.get(agentId);
    if (!session) return null;

    // Get current todos from tool usage tracker
    const rawTodos = toolUsageTracker.getAgentTodos(agentId);
    const todos = Array.isArray(rawTodos) ? rawTodos : [];

    // Calculate runtime
    const runtime = this.getAgentRuntime(agentId);
    const formattedRuntime = AgentManager.formatRuntime(runtime);
    // Get current task information
    const currentTask = AgentManager.getCurrentTask(todos) || session.instructions;

    return {
      id: session.id,
      status: session.status,
      pid: session.pid,
      spawnTime: session.spawnTime,
      lastActivity: session.lastActivity,
      instructions: session.instructions,
      workingDirectory: session.workingDirectory,
      worktreePath: session.worktreePath,
      worktreeName: session.worktreeName,
      branch: session.branch || 'main',
      environmentVars: session.environmentVars || {},
      process: session.process,
      todos,
      runtime,
      formattedRuntime,
      currentTask,
    };
  }

  /**
   * Get agent logs for detail view
   */
  getAgentLogs(agentId) {
    const session = this.agents.get(agentId);
    if (!session) return [];

    // If logs are empty and this is a restored session (not newly spawned), add diagnostic info
    if (
      (!session.logs || session.logs.length === 0)
      && session.pid
      && session.wasRestored
    ) {
      AgentManager.reattachToProcess(session);
    }

    // Return logs with proper structure for detail view
    const logs = session.logs || [];
    return logs.map((log, index) => ({
      line: index + 1,
      timestamp: log.timestamp || new Date(),
      content: log.content || log.toString(),
      type: log.type || 'info',
    }));
  }

  /**
   * Start background orphan scanning for unexpected agent deaths
   */
  startBackgroundOrphanScanning() {
    const config = loadConfig();
    if (!config.features.autoCleanup) {
      logger.debug('Orphan scanning disabled by configuration');
      return { found: 0, queued: 0, scanned: 0 };
    }

    // Scan every 5 minutes for orphaned worktrees
    const scanIntervalMs = this.config.orphanScanIntervalMs || 5 * 60 * 1000;

    this.orphanScanInterval = setInterval(async () => {
      try {
        // Orphan scanning disabled - worktree lifecycle manager removed
        logger.debug('Background orphan scan skipped - worktree lifecycle manager not available');
      } catch (error) {
        logger.error('Background orphan scan failed', { error: error.message });
      }
    }, scanIntervalMs);

    logger.info('Background orphan scanning started', {
      intervalMinutes: Math.round(scanIntervalMs / (60 * 1000)),
    });

    return { started: true, intervalMinutes: Math.round(scanIntervalMs / (60 * 1000)) };
  }

  /**
   * Stop background orphan scanning
   */
  stopBackgroundOrphanScanning() {
    if (this.orphanScanInterval) {
      clearInterval(this.orphanScanInterval);
      this.orphanScanInterval = null;
      logger.info('Background orphan scanning stopped');
    }
  }

  /**
   * Force cleanup of a specific worktree (manual emergency cleanup)
   * @deprecated Worktree lifecycle manager has been removed
   */
  async forceCleanupWorktree(worktreePath, options = {}) {
    throw new Error('Worktree lifecycle manager not available - feature removed');
  }

  /**
   * Get worktree lifecycle status and metrics
   * @deprecated Worktree lifecycle manager has been removed
   */
  getWorktreeLifecycleStatus() {
    return { enabled: false, reason: 'Worktree lifecycle manager removed' };
  }

  /**
   * Shutdown agent manager and cleanup resources
   */
  async shutdown() {
    logger.info('Shutting down agent manager');

    try {
      // Stop background scanning
      this.stopBackgroundOrphanScanning();

      // Terminate all active agents
      const activeAgents = Array.from(this.agents.keys());
      if (activeAgents.length > 0) {
        logger.info('Terminating active agents during shutdown', {
          count: activeAgents.length,
        });

        await Promise.allSettled(
          activeAgents.map((agentId) => this.terminateAgent(agentId, { force: true })),
        );
      }

      logger.info('Agent manager shutdown completed');
    } catch (error) {
      logger.error('Error during agent manager shutdown', {
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = AgentManager;
module.exports.AgentStatus = AgentStatus;
