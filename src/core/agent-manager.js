const { spawn } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadConfig, saveConfig, SESSIONS_FILE } = require('./config');
const { EnvironmentValidationError, FileSystemError } = require('../utils/errors');
const logger = require('../utils/logger');

// Agent status types as per US004 requirements
const AgentStatus = {
  SPAWNING: 'spawning',
  RUNNING: 'running',
  IDLE: 'idle',
  ERROR: 'error',
  TERMINATING: 'terminating'
};

// Input validation patterns for security
const DANGEROUS_PATTERNS = [
  /[;&|`$]/,         // Shell metacharacters (dangerous ones)
  /\.\.[\/\\]/,      // Directory traversal
  /^-/,              // Options starting with dash
  /[<>]/,            // Redirection operators
  /\0/,              // Null bytes
  /\x00-\x08/,       // Control characters (excluding tab, newline, carriage return)
  /\x0B\x0C/,        // Vertical tab, form feed
  /\x0E-\x1F/,       // Other control characters
  /\x7F/,            // DEL character
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
  }

  /**
   * Initialize the agent manager
   */
  async initialize() {
    try {
      this.config = loadConfig();
      this.maxAgents = this.config.maxAgents || 3;
      
      // Load existing sessions
      await this.loadSessions();
      
      logger.info('Agent manager initialized successfully', {
        maxAgents: this.maxAgents,
        activeSessions: this.agents.size,
      });
    } catch (error) {
      logger.error('Failed to initialize agent manager', { error: error.message });
      throw error;
    }
  }

  /**
   * Load existing sessions from storage
   */
  async loadSessions() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
        
        // Validate existing sessions (check if processes are still running)
        const validSessions = [];
        
        for (const session of sessionsData.sessions || []) {
          if (this.isProcessRunning(session.pid)) {
            this.agents.set(session.id, session);
            validSessions.push(session);
          } else {
            logger.warn('Found stale session, removing', { sessionId: session.id });
          }
        }
        
        // Update sessions file with only valid sessions
        await this.saveSessions();
        
        logger.info('Loaded existing sessions', { count: validSessions.length });
      }
    } catch (error) {
      logger.error('Failed to load sessions', { error: error.message });
      // Don't throw here, just log the error and continue
    }
  }

  /**
   * Save sessions to storage
   */
  async saveSessions() {
    try {
      const sessionsData = {
        sessions: Array.from(this.agents.values()),
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
        'Please check file permissions for ~/.add-manager/'
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
        suggestion: 'Please run ADD Manager from within a git repository directory',
      };
    }
  }

  /**
   * Check if process is running
   */
  isProcessRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate unique agent ID
   */
  generateAgentId() {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    
    // Length validation
    if (trimmed.length < 10) {
      throw new EnvironmentValidationError(
        'Agent instructions must be at least 10 characters long',
        'INSTRUCTIONS_TOO_SHORT',
        'Please provide more detailed instructions for the agent'
      );
    }

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

      // Generate agent session
      const agentId = this.generateAgentId();
      const workingDirectory = validatedOptions.workingDirectory || process.cwd();
      
      logger.info('Spawning new agent', {
        agentId,
        instructionsLength: instructions.length,
        workingDirectory,
      });

      // Create agent session data
      const session = {
        id: agentId,
        instructions: sanitizedInstructions,
        spawnTime: new Date().toISOString(),
        status: AgentStatus.SPAWNING,
        pid: null,
        workingDirectory,
        gitRoot: gitValidation.rootPath,
        lastActivity: new Date().toISOString(),
      };

      // Spawn Claude CLI process
      const claudeProcess = await this.spawnClaudeProcess(session);
      
      // Update session with process info
      session.pid = claudeProcess.pid;
      session.status = AgentStatus.RUNNING;
      session.process = claudeProcess;

      // Store session
      this.agents.set(agentId, session);
      await this.saveSessions();

      // Send initial instructions to agent
      await this.sendInstructions(agentId, instructions);

      logger.info('Agent spawned successfully', {
        agentId,
        pid: claudeProcess.pid,
        status: session.status,
      });

      return session;
    } catch (error) {
      logger.error('Failed to spawn agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Spawn Claude CLI process
   */
  async spawnClaudeProcess(session) {
    try {
      // Check if Claude CLI is available
      try {
        execSync('claude --version', { stdio: 'ignore' });
      } catch (error) {
        throw new EnvironmentValidationError(
          'Claude CLI is not installed or not in PATH',
          'CLAUDE_CLI_NOT_FOUND',
          'Please install Claude CLI: https://claude.ai/cli'
        );
      }

      // Spawn the process
      const claudeProcess = spawn('claude', ['--interactive'], {
        cwd: session.workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_SESSION_ID: session.id,
        },
      });

      // Handle process events
      claudeProcess.on('error', (error) => {
        logger.error('Claude process error', {
          agentId: session.id,
          error: error.message,
        });
        this.updateAgentStatus(session.id, AgentStatus.ERROR);
      });

      claudeProcess.on('exit', (code, signal) => {
        logger.info('Claude process exited', {
          agentId: session.id,
          code,
          signal,
        });
        this.updateAgentStatus(session.id, AgentStatus.TERMINATING);
      });

      // Set up stdout/stderr handlers
      claudeProcess.stdout.on('data', (data) => {
        this.handleAgentOutput(session.id, 'stdout', data);
      });

      claudeProcess.stderr.on('data', (data) => {
        this.handleAgentOutput(session.id, 'stderr', data);
      });

      return claudeProcess;
    } catch (error) {
      logger.error('Failed to spawn Claude process', { error: error.message });
      throw error;
    }
  }

  /**
   * Send instructions to agent
   */
  async sendInstructions(agentId, instructions) {
    const session = this.agents.get(agentId);
    if (!session || !session.process) {
      throw new Error('Agent session not found or process not available');
    }

    try {
      session.process.stdin.write(`${instructions}\n`);
      logger.debug('Instructions sent to agent', {
        agentId,
        instructionsLength: instructions.length,
      });
    } catch (error) {
      logger.error('Failed to send instructions to agent', {
        agentId,
        error: error.message,
      });
      throw error;
    }
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

    // Add to output buffer
    session.output.push({
      type,
      data: output,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 output entries
    if (session.output.length > 1000) {
      session.output = session.output.slice(-1000);
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
      this.saveSessions().catch(error => {
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
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Terminate agent
   */
  async terminateAgent(agentId) {
    const session = this.agents.get(agentId);
    if (!session) {
      throw new Error('Agent not found');
    }

    try {
      if (session.process && session.pid) {
        // Send SIGTERM first
        session.process.kill('SIGTERM');
        
        // Wait a bit, then force kill if needed
        setTimeout(() => {
          if (this.isProcessRunning(session.pid)) {
            session.process.kill('SIGKILL');
          }
        }, 5000);
      }

      this.updateAgentStatus(agentId, AgentStatus.TERMINATING);
      
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
   * Format runtime duration in HH:MM format
   */
  formatRuntime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
}

module.exports = AgentManager;
module.exports.AgentStatus = AgentStatus;