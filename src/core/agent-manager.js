const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadConfig, SESSIONS_FILE } = require('./config');
const {
  EnvironmentValidationError,
  FileSystemError,
} = require('../utils/errors');
const logger = require('../utils/logger');
const WorktreeLifecycleManager = require('./worktree-lifecycle-manager');
const SDKCommunicationManager = require('./sdk/communication-manager');
const { SDKStatus } = require('./sdk/sdk-types');
const AgentLogManager = require('./logging/agent-log-manager');

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
  /[;&|`$]/, // Shell metacharacters (dangerous ones)
  /\.\.[/\\]/, // Directory traversal
  /^-/, // Options starting with dash
  /[<>]/, // Redirection operators
  /\0/, // Null bytes
  /\x00-\x08/, // Control characters (excluding tab, newline, carriage return)
  /\x0B\x0C/, // Vertical tab, form feed
  /\x0E-\x1F/, // Other control characters
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
    this.maxAgents = 3;
    this.worktreeLifecycle = null;
    this.orphanScanInterval = null;
    this.sdkManager = new SDKCommunicationManager();
    this.agentLogManager = null; // Will be initialized based on config
  }

  /**
   * Initialize the agent manager
   */
  async initialize() {
    try {
      this.config = loadConfig();
      this.maxAgents = this.config.maxAgents || 3;

      // Initialize worktree lifecycle management
      this.worktreeLifecycle = new WorktreeLifecycleManager({
        maxConcurrentCleanups: this.config.maxConcurrentCleanups || 2,
        retryAttempts: this.config.cleanupRetryAttempts || 3,
      });

      // Initialize worktree lifecycle (discovery and cleanup of orphans)
      await this.worktreeLifecycle.initialize();

      // Initialize persistent agent logging
      await this.initializeAgentLogging();

      // Load existing sessions
      await this.loadSessions();

      // Start background orphan scanning
      this.startBackgroundOrphanScanning();

      logger.info('Agent manager initialized successfully', {
        maxAgents: this.maxAgents,
        activeSessions: this.agents.size,
        worktreeMetrics: this.worktreeLifecycle.getMetrics(),
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
        }
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
            sessions[i]
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
  async reattachToProcess(session) {
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
      session.process = null;

      // Only add diagnostic info if logs are truly empty (no actual output was captured)
      // and avoid duplicates by checking for restore message
      const alreadyHasRestoreMessage = session.logs.some(
        (log) => log.content && log.content.includes('Session restored - PID')
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
        'Please check file permissions for ~/.napoleon/'
      );
    }
  }

  /**
   * Validate git repository context
   */
  validateGitRepository() {
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
    if (!session.logs) {
      session.logs = [];
    }
    if (!session.output) {
      session.output = [];
    }

    // Mark this session as restored from previous run
    session.wasRestored = true;
    session.sdkStatus = SDKStatus.ACTIVE;
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
      this.validateAPIKey();

      logger.info('Initializing SDK session', { agentId, workingDirectory });

      const sdkSession = await this.sdkManager.initializeSDKSession(
        agentId,
        workingDirectory
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
        'Check SDK configuration and dependencies'
      );
    }
  }

  /**
   * Generate unique agent ID
   */
  generateAgentId() {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate worktree name following the naming convention
   * Pattern: agent-{id}-{timestamp}
   */
  generateWorktreeName(agentId) {
    const timestamp = Date.now();
    return `agent-${agentId.replace('agent-', '')}-${timestamp}`;
  }

  /**
   * Ensure worktree directory structure exists
   */
  ensureWorktreeDirectory() {
    const worktreesDir = path.join(process.cwd(), '.napoleon-worktrees');

    if (!fs.existsSync(worktreesDir)) {
      try {
        fs.mkdirSync(worktreesDir, { recursive: true, mode: 0o755 });
        logger.info('Created worktrees directory', { path: worktreesDir });
      } catch (error) {
        throw new FileSystemError(
          `Failed to create worktrees directory: ${error.message}`,
          'WORKTREE_DIR_CREATION_FAILED',
          'Please check write permissions for the project directory'
        );
      }
    }

    return worktreesDir;
  }

  /**
   * Validate git repository state for worktree creation
   */
  validateGitForWorktree() {
    try {
      // Check if we're in a git repository
      const gitValidation = this.validateGitRepository();
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
          }
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
        // Validate git state
        const gitValidation = this.validateGitForWorktree();
        if (!gitValidation.isValid) {
          reject(
            new EnvironmentValidationError(
              gitValidation.error,
              'GIT_WORKTREE_VALIDATION_FAILED',
              gitValidation.suggestion
            )
          );
          return;
        }

        // Ensure worktree directory exists
        const worktreesDir = this.ensureWorktreeDirectory();

        // Generate worktree name and path
        const worktreeName = this.generateWorktreeName(agentId);
        const worktreePath = path.join(worktreesDir, worktreeName);

        logger.info('Creating git worktree', {
          agentId,
          worktreeName,
          worktreePath,
        });

        // Create the worktree
        exec(
          `git worktree add "${worktreePath}"`,
          {
            cwd: process.cwd(),
            timeout: 30000, // 30 second timeout
          },
          (error, stdout, stderr) => {
            if (error) {
              logger.error('Git worktree creation failed', {
                agentId,
                worktreePath,
                error: error.message,
                stderr,
              });

              // Clean up any partial directory creation
              this.cleanupFailedWorktree(worktreePath);

              reject(
                new EnvironmentValidationError(
                  `Worktree creation failed: ${stderr || error.message}`,
                  'WORKTREE_CREATION_FAILED',
                  'Please check git repository state and try again'
                )
              );
            } else {
              logger.info('Git worktree created successfully', {
                agentId,
                worktreeName,
                worktreePath,
                stdout: stdout.trim(),
              });

              resolve({
                worktreeName,
                worktreePath,
                agentId,
              });
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clean up failed worktree creation
   */
  cleanupFailedWorktree(worktreePath) {
    try {
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

      logger.info('Removing git worktree', { worktreePath });

      exec(
        `git worktree remove "${worktreePath}" --force`,
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
              }
            );

            // Fallback: manual directory removal
            try {
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
        }
      );
    });
  }

  /**
   * Validate agent instructions for security and format
   */
  validateInstructions(instructions) {
    if (!instructions || typeof instructions !== 'string') {
      throw new EnvironmentValidationError(
        'Instructions must be a non-empty string',
        'INVALID_INSTRUCTIONS_TYPE',
        'Please provide valid text instructions for the agent'
      );
    }

    const trimmed = instructions.trim();

    // Remove minimum length validation - allow any non-empty instructions
    // This aligns with US028 requirements

    if (trimmed.length > 5000) {
      throw new EnvironmentValidationError(
        'Agent instructions must be less than 5000 characters',
        'INSTRUCTIONS_TOO_LONG',
        'Please provide more concise instructions for the agent'
      );
    }

    // Security validation - check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new EnvironmentValidationError(
          'Instructions contain potentially dangerous characters',
          'DANGEROUS_INPUT_DETECTED',
          'Please remove special characters and shell metacharacters from your instructions'
        );
      }
    }

    // Character set validation
    if (!ALLOWED_CHARS.test(trimmed)) {
      throw new EnvironmentValidationError(
        'Instructions contain invalid characters',
        'INVALID_CHARACTERS',
        'Please use only standard alphanumeric characters and basic punctuation'
      );
    }

    return trimmed;
  }

  /**
   * Validate options object for spawning agent
   */
  validateOptions(options) {
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
            'Please provide a valid directory path'
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
          'Please ensure the directory exists and is readable'
        );
      }
    }

    return validatedOptions;
  }

  /**
   * Spawn a new agent with instructions
   */
  async spawnAgent(instructions, options = {}) {
    try {
      // Validate and sanitize input
      const sanitizedInstructions = this.validateInstructions(instructions);
      const validatedOptions = this.validateOptions(options);

      // Check agent limit
      if (this.agents.size >= this.maxAgents) {
        throw new EnvironmentValidationError(
          `Maximum ${this.maxAgents} agents already running`,
          'MAX_AGENTS_REACHED',
          'Please terminate an existing agent before spawning a new one'
        );
      }

      // Validate git repository
      const gitValidation = this.validateGitRepository();
      if (!gitValidation.isValid) {
        throw new EnvironmentValidationError(
          gitValidation.error,
          'GIT_REPO_INVALID',
          gitValidation.suggestion
        );
      }

      // Generate agent session (or use provided one for pending agent replacement)
      const agentId = options.agentId || this.generateAgentId();

      logger.info('Spawning new agent', {
        agentId,
        instructionsLength: instructions.length,
      });

      // Update status to forking before creating worktree
      if (this.agents.has(agentId)) {
        const agent = this.agents.get(agentId);
        agent.status = AgentStatus.FORKING;
        this.agents.set(agentId, agent);
      }

      // Create git worktree for agent isolation
      const worktreeInfo = await this.createWorktree(agentId);
      const workingDirectory = worktreeInfo.worktreePath;

      logger.info('Agent worktree created', {
        agentId,
        worktreeName: worktreeInfo.worktreeName,
        workingDirectory,
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

      // Update status to starting before SDK initialization
      session.status = AgentStatus.STARTING;
      this.agents.set(agentId, session);

      // Initialize SDK session
      const sdkSession = await this.initializeSDKSession(
        agentId,
        workingDirectory
      );

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
            sanitizedInstructions
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

      // Register with worktree lifecycle manager
      if (this.worktreeLifecycle) {
        this.worktreeLifecycle.registerActiveAgent(agentId, session);
        logger.debug('Agent registered with worktree lifecycle manager', {
          agentId,
        });
      }

      // Send initial instructions to agent
      await this.sendInstructions(agentId, instructions);

      logger.info('Agent spawned successfully', {
        agentId,
        sessionId: session.sessionId,
        status: session.status,
      });

      return session;
    } catch (error) {
      logger.error('Failed to spawn agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate API key for SDK operations
   * @private
   */
  validateAPIKey() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new EnvironmentValidationError(
        'ANTHROPIC_API_KEY environment variable is not set',
        'CLAUDE_API_KEY_NOT_FOUND',
        'Please set your Anthropic API key: export ANTHROPIC_API_KEY=your_key_here'
      );
    }
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
        content: `Processing instructions: "${instructions.substring(0, 100)}${instructions.length > 100 ? '...' : ''}"`,
        type: 'info',
      });

      // Update session status to indicate processing
      this.updateAgentStatus(agentId, AgentStatus.RUNNING);

      // Execute query using SDK manager in the background
      // Don't await - let the agent run asynchronously
      this.sdkManager
        .executeQuery(session.sessionId || session.id, instructions, {
          maxTurns: 10,
          workingDirectory: session.workingDirectory,
        })
        .then((messages) => {
          logger.info('SDK query completed for agent', { agentId });
          // Process each message from SDK
          for (const message of messages) {
            logger.info('SDK message received', { agentId, message });
            // Handle real-time output from SDK
            this.handleSDKMessage(agentId, message);
          }

          // Update status when SDK query completes
          const currentSession = this.agents.get(agentId);
          if (currentSession && currentSession.status === AgentStatus.RUNNING) {
            this.updateAgentStatus(agentId, AgentStatus.IDLE);
          }
        })
        .catch((error) => {
          logger.error('SDK query failed for agent', {
            agentId,
            error: error.message,
          });

          // Update agent status to error
          const currentSession = this.agents.get(agentId);
          if (currentSession) {
            currentSession.error = error.message;
            this.updateAgentStatus(agentId, AgentStatus.ERROR);
          }
        });

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
    if (message.type === 'result') {
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
      if (status === AgentStatus.TERMINATING || status === AgentStatus.ERROR) {
        this.agents.delete(agentId);
      }

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
          const finalLogPath =
            await this.agentLogManager.terminateAgentLog(agentId);
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
          session.sessionId || session.id
        );
        if (terminationSuccess) {
          session.sdkStatus = SDKStatus.INACTIVE;
          logger.info('SDK session terminated successfully', { agentId });
        } else {
          logger.warn('SDK session termination failed', { agentId });
          session.sdkStatus = SDKStatus.ERROR;
        }
      }

      // Clean up worktree immediately (for test compatibility and immediate cleanup)
      if (session.worktreePath) {
        try {
          // Direct git worktree removal for immediate cleanup
          await new Promise((resolve, reject) => {
            exec(
              `git worktree remove "${session.worktreePath}" --force`,
              {
                cwd: process.cwd(),
                timeout: 30000, // 30 second timeout
              },
              (error, stdout, stderr) => {
                if (error) {
                  logger.warn(
                    'Direct git worktree removal failed, trying lifecycle manager',
                    {
                      agentId,
                      worktreePath: session.worktreePath,
                      error: error.message,
                      stderr,
                    }
                  );

                  // Fallback to lifecycle manager
                  if (this.worktreeLifecycle) {
                    this.worktreeLifecycle
                      .forceCleanupWorktree(session.worktreePath, {
                        force: true,
                        preserveBranch: options.preserveBranch || false,
                      })
                      .then(() => {
                        logger.info(
                          'Agent worktree queued for cleanup via lifecycle manager',
                          {
                            agentId,
                            worktreePath: session.worktreePath,
                          }
                        );
                        resolve();
                      })
                      .catch((lifecycleError) => {
                        logger.error(
                          'Failed to cleanup worktree via lifecycle manager',
                          {
                            agentId,
                            worktreePath: session.worktreePath,
                            error: lifecycleError.message,
                          }
                        );
                        reject(lifecycleError);
                      });
                  } else {
                    reject(error);
                  }
                } else {
                  logger.info('Agent worktree removed directly', {
                    agentId,
                    worktreePath: session.worktreePath,
                    stdout: stdout.trim(),
                  });
                  resolve();
                }
              }
            );
          });
        } catch (error) {
          logger.error('Failed to cleanup worktree', {
            agentId,
            worktreePath: session.worktreePath,
            error: error.message,
          });
        }
      }

      this.updateAgentStatus(agentId, AgentStatus.TERMINATING);

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
  canSpawnAgent() {
    return this.agents.size < this.maxAgents;
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
  formatRuntime(seconds) {
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
    if (!session) return null;

    const runtime = this.getAgentRuntime(agentId);
    return {
      id: session.id,
      status: session.status,
      runtime: this.formatRuntime(runtime),
      spawnTime: session.spawnTime,
      lastActivity: session.lastActivity,
      pid: session.pid,
    };
  }

  /**
   * Get comprehensive agent details for detail view
   */
  getAgentDetails(agentId) {
    const session = this.agents.get(agentId);
    if (!session) return null;

    return {
      id: session.id,
      status: session.status,
      pid: session.pid,
      spawnTime: session.spawnTime,
      lastActivity: session.lastActivity,
      instructions: session.instructions,
      worktreePath: session.worktreePath,
      worktreeName: session.worktreeName,
      branch: session.branch || 'main',
      environmentVars: session.environmentVars || {},
      process: session.process,
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
      (!session.logs || session.logs.length === 0) &&
      session.pid &&
      session.wasRestored
    ) {
      this.reattachToProcess(session);
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
    // Scan every 5 minutes for orphaned worktrees
    const scanIntervalMs = this.config.orphanScanIntervalMs || 5 * 60 * 1000;

    this.orphanScanInterval = setInterval(async () => {
      try {
        if (this.worktreeLifecycle) {
          const result = await this.worktreeLifecycle.scanForOrphans();

          if (result.newOrphans > 0) {
            logger.info('Background orphan scan found new orphaned worktrees', {
              scanned: result.scanned,
              newOrphans: result.newOrphans,
            });
          } else {
            logger.debug('Background orphan scan completed', {
              scanned: result.scanned,
              newOrphans: result.newOrphans,
            });
          }
        }
      } catch (error) {
        logger.error('Background orphan scan failed', { error: error.message });
      }
    }, scanIntervalMs);

    logger.info('Background orphan scanning started', {
      intervalMinutes: Math.round(scanIntervalMs / (60 * 1000)),
    });
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
   */
  async forceCleanupWorktree(worktreePath, options = {}) {
    if (!this.worktreeLifecycle) {
      throw new Error('Worktree lifecycle manager not initialized');
    }

    return this.worktreeLifecycle.forceCleanupWorktree(worktreePath, options);
  }

  /**
   * Get worktree lifecycle status and metrics
   */
  getWorktreeLifecycleStatus() {
    if (!this.worktreeLifecycle) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.worktreeLifecycle.getStatus(),
    };
  }

  /**
   * Shutdown agent manager and cleanup resources
   */
  async shutdown() {
    logger.info('Shutting down agent manager');

    try {
      // Stop background scanning
      this.stopBackgroundOrphanScanning();

      // Shutdown worktree lifecycle manager
      if (this.worktreeLifecycle) {
        await this.worktreeLifecycle.shutdown();
      }

      // Terminate all active agents
      const activeAgents = Array.from(this.agents.keys());
      if (activeAgents.length > 0) {
        logger.info('Terminating active agents during shutdown', {
          count: activeAgents.length,
        });

        await Promise.allSettled(
          activeAgents.map((agentId) =>
            this.terminateAgent(agentId, { force: true })
          )
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
