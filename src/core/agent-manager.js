const { spawn } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadConfig, saveConfig, SESSIONS_FILE } = require('./config');
const { EnvironmentValidationError, FileSystemError } = require('../utils/errors');
const logger = require('../utils/logger');

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
   * Spawn a new agent with instructions
   */
  async spawnAgent(instructions, options = {}) {
    try {
      // Validate input
      if (!instructions || instructions.trim().length < 10) {
        throw new EnvironmentValidationError(
          'Agent instructions must be at least 10 characters long',
          'INSTRUCTIONS_TOO_SHORT',
          'Please provide more detailed instructions for the agent'
        );
      }

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
      const workingDirectory = options.workingDirectory || process.cwd();
      
      logger.info('Spawning new agent', {
        agentId,
        instructionsLength: instructions.length,
        workingDirectory,
      });

      // Create agent session data
      const session = {
        id: agentId,
        instructions: instructions.trim(),
        spawnTime: new Date().toISOString(),
        status: 'initializing',
        pid: null,
        workingDirectory,
        gitRoot: gitValidation.rootPath,
      };

      // Spawn Claude CLI process
      const claudeProcess = await this.spawnClaudeProcess(session);
      
      // Update session with process info
      session.pid = claudeProcess.pid;
      session.status = 'running';
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
        this.updateAgentStatus(session.id, 'error');
      });

      claudeProcess.on('exit', (code, signal) => {
        logger.info('Claude process exited', {
          agentId: session.id,
          code,
          signal,
        });
        this.updateAgentStatus(session.id, 'terminated');
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
      if (status === 'terminated' || status === 'error') {
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

      this.updateAgentStatus(agentId, 'terminated');
      
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
}

module.exports = AgentManager;