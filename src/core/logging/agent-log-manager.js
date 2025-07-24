const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');
const logger = require('../../utils/logger');

/**
 * Agent Log Manager - Core service for persistent agent logging with real-time streaming
 *
 * Creates persistent log files with descriptive filenames containing initial prompts.
 * Enables debugging of agent behavior and access to historical execution data.
 * Supports real-time event streaming for immediate UI updates.
 */
class AgentLogManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.napoleonDir = config.napoleonDir || path.join(os.homedir(), '.napoleon');
    this.logsDir = path.join(this.napoleonDir, 'logs', 'agents');
    this.streams = new Map(); // agentId -> { stream, logPath, instructions, startTime }
    this.maxPromptLength = 50;
    this.initialized = false;
    this.activeSubscriptions = new Set(); // Track agents with active UI subscriptions
  }

  /**
   * Initialize the agent log manager and ensure log directory exists
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Create directory with recursive option
      await fs.promises.mkdir(this.logsDir, { recursive: true });
      this.initialized = true;
      logger.info('AgentLogManager initialized successfully', {
        logsDir: this.logsDir,
      });
    } catch (error) {
      // Handle directory creation errors gracefully
      if (error.code === 'EACCES') {
        logger.error('Permission denied creating agent logs directory', {
          logsDir: this.logsDir,
          error: error.message,
        });
        throw new Error(`Permission denied accessing ${this.logsDir}. Please check directory permissions.`);
      } else if (error.code === 'ENOTDIR') {
        logger.error('Parent path is not a directory', {
          logsDir: this.logsDir,
          error: error.message,
        });
        throw new Error(`Invalid directory path: ${this.logsDir}. Parent path is not a directory.`);
      } else {
        logger.error('Failed to initialize AgentLogManager', {
          logsDir: this.logsDir,
          error: error.message,
        });
        throw new Error(`Failed to create agent logs directory: ${error.message}`);
      }
    }
  }

  /**
   * Create log file path with descriptive naming pattern
   * @param {string} agentId - Unique agent identifier
   * @param {string} instructions - Agent instructions/prompt
   * @param {string} logsDir - Logs directory path
   * @param {Function} sanitizePrompt - Function to sanitize prompt
   * @returns {string} - Full log file path
   * @private
   */
  static generateLogFilePath(agentId, instructions, logsDir, sanitizePrompt) {
    const sanitizedPrompt = sanitizePrompt(instructions);
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${timestamp}_${agentId}_${sanitizedPrompt}.log`;
    return path.join(logsDir, filename);
  }

  /**
   * Create initial log entry for agent spawn
   * @param {string} agentId - Agent identifier
   * @param {string} startTime - ISO timestamp string
   * @param {string} instructions - Agent instructions
   * @param {string} logPath - Log file path
   * @returns {Object} - Initial log entry object
   * @private
   */
  static createInitialLogEntry(agentId, startTime, instructions, logPath) {
    return {
      timestamp: startTime,
      agentId,
      type: 'system',
      source: 'napoleon',
      content: 'Agent log session started',
      metadata: {
        event: 'agent_spawn',
        promptLength: instructions ? instructions.length : 0,
        logPath,
      },
    };
  }

  /**
   * Write log entry to stream and wait for completion
   * @param {WriteStream} stream - File write stream
   * @param {Object} entry - Log entry object
   * @returns {Promise<void>}
   * @private
   */
  static async writeLogLine(stream, entry) {
    const logLine = `${JSON.stringify(entry)}\n`;

    return new Promise((resolve, reject) => {
      stream.write(logLine, (error) => {
        if (error) {
          reject(error);
        } else {
          // Ensure file is actually created by calling resolve after write completes
          process.nextTick(resolve);
        }
      });
    });
  }

  /**
   * Create a new agent log file with descriptive filename
   * @param {string} agentId - Unique agent identifier
   * @param {string} instructions - Agent instructions/prompt
   * @returns {Promise<string>} - Log file path
   */
  async createAgentLog(agentId, instructions) {
    if (!this.initialized) {
      throw new Error('AgentLogManager not initialized. Call initialize() first.');
    }

    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    try {
      const logPath = AgentLogManager.generateLogFilePath(
        agentId,
        instructions,
        this.logsDir,
        this.sanitizePrompt.bind(this),
      );

      // Create write stream with append mode
      const stream = fs.createWriteStream(logPath, { flags: 'a' });
      const startTime = new Date().toISOString();

      // Store stream information
      this.streams.set(agentId, {
        stream,
        logPath,
        instructions,
        startTime,
      });

      // Write initial log entry and ensure file creation
      const initialEntry = AgentLogManager.createInitialLogEntry(
        agentId,
        startTime,
        instructions,
        logPath,
      );
      await AgentLogManager.writeLogLine(stream, initialEntry);

      logger.info('Agent log file created', { agentId, logPath });
      return logPath;
    } catch (error) {
      logger.error('Failed to create agent log', {
        agentId,
        error: error.message,
      });
      throw new Error(`Failed to create agent log for ${agentId}: ${error.message}`);
    }
  }

  /**
   * Write a structured log entry to the agent's log file and emit streaming event
   * @param {string} agentId - Agent identifier
   * @param {Object} entry - Log entry object
   * @returns {Promise<void>}
   */
  async writeLogEntry(agentId, entry) {
    if (!agentId) {
      logger.error('Cannot write log entry: Agent ID is required');
      return;
    }

    const streamInfo = this.streams.get(agentId);
    if (!streamInfo) {
      logger.error('Cannot write log entry: No active stream for agent', { agentId });
      return;
    }

    try {
      // Ensure required fields are present
      const logEntry = {
        timestamp: entry.timestamp || new Date().toISOString(),
        agentId,
        type: entry.type || 'info',
        source: entry.source || 'napoleon',
        content: entry.content || '',
        metadata: entry.metadata || {},
      };

      // Write JSON entry with newline
      const logLine = `${JSON.stringify(logEntry)}\n`;
      streamInfo.stream.write(logLine);

      // Flush immediately for real-time monitoring
      if (typeof streamInfo.stream.flush === 'function') {
        streamInfo.stream.flush();
      }

      // Broadcast real-time event if agent has active subscriptions
      if (this.activeSubscriptions.has(agentId)) {
        this.emit('log-entry', {
          agentId,
          entry: {
            id: `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: logEntry.timestamp,
            content: logEntry.content,
            type: logEntry.type,
            source: logEntry.source,
            metadata: logEntry.metadata,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to write log entry', {
        agentId,
        error: error.message,
      });
      // Don't throw - continue agent operation
    }
  }

  /**
   * Terminate agent log and clean up resources
   * @param {string} agentId - Agent identifier
   * @returns {Promise<string|null>} - Final log file path or null if not found
   */
  async terminateAgentLog(agentId) {
    if (!agentId) {
      logger.error('Cannot terminate log: Agent ID is required');
      return null;
    }

    const streamInfo = this.streams.get(agentId);
    if (!streamInfo) {
      logger.warn('Cannot terminate log: No active stream for agent', { agentId });
      return null;
    }

    try {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime) - new Date(streamInfo.startTime);

      // Write termination log entry
      const terminationEntry = {
        timestamp: endTime,
        agentId,
        type: 'system',
        source: 'napoleon',
        content: 'Agent log session terminated',
        metadata: {
          event: 'agent_termination',
          duration,
          sessionStart: streamInfo.startTime,
          sessionEnd: endTime,
        },
      };

      await this.writeLogEntry(agentId, terminationEntry);

      // Close stream and cleanup
      return new Promise((resolve, reject) => {
        streamInfo.stream.end((error) => {
          if (error) {
            logger.error('Error closing agent log stream', {
              agentId,
              error: error.message,
            });
            reject(new Error(`Failed to close log stream for ${agentId}: ${error.message}`));
          } else {
            const { logPath } = streamInfo;
            this.streams.delete(agentId);
            // Clean up streaming subscription
            this.activeSubscriptions.delete(agentId);
            logger.info('Agent log terminated successfully', { agentId, logPath });
            resolve(logPath);
          }
        });
      });
    } catch (error) {
      // Clean up even if termination entry fails
      try {
        streamInfo.stream.destroy();
        this.streams.delete(agentId);
        // Clean up streaming subscription
        this.activeSubscriptions.delete(agentId);
      } catch (cleanupError) {
        logger.error('Error during stream cleanup', {
          agentId,
          error: cleanupError.message,
        });
      }

      logger.error('Failed to terminate agent log', {
        agentId,
        error: error.message,
      });
      throw new Error(`Failed to terminate agent log for ${agentId}: ${error.message}`);
    }
  }

  /**
   * Get the current log file path for an active agent
   * @param {string} agentId - Agent identifier
   * @returns {string|null} - Log file path or null if not found
   */
  getLogPath(agentId) {
    if (!agentId) {
      return null;
    }

    const streamInfo = this.streams.get(agentId);
    return streamInfo ? streamInfo.logPath : null;
  }

  /**
   * Sanitize prompt text for use in filename
   * @param {string} instructions - Raw instructions/prompt
   * @returns {string} - Sanitized prompt suitable for filename
   */
  sanitizePrompt(instructions) {
    if (!instructions || typeof instructions !== 'string') {
      return 'no-prompt';
    }

    // Remove special characters, keep alphanumeric, spaces, hyphens, underscores, periods,
    // forward/back slashes
    let sanitized = instructions
      .replace(/[^a-zA-Z0-9\s\-_./\\]/g, '')
      .trim();

    // Replace slashes, spaces and multiple consecutive characters with single hyphens
    sanitized = sanitized
      .replace(/[/\\]/g, '-') // Convert slashes to hyphens first
      .replace(/\s+/g, '-') // Convert spaces to hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Limit length and convert to lowercase
    if (sanitized.length > this.maxPromptLength) {
      sanitized = sanitized.substring(0, this.maxPromptLength);
      // Ensure we don't end with a hyphen after truncation
      sanitized = sanitized.replace(/-+$/, '');
    }

    sanitized = sanitized.toLowerCase();

    // Ensure we have something meaningful
    if (!sanitized || sanitized.length === 0) {
      return 'no-prompt';
    }

    return sanitized;
  }

  /**
   * Get information about currently active agent logs
   * @returns {Array} - Array of active agent log information
   */
  getActiveAgents() {
    const active = [];
    this.streams.forEach((streamInfo, agentId) => {
      active.push({
        agentId,
        logPath: streamInfo.logPath,
        startTime: streamInfo.startTime,
        instructions: streamInfo.instructions,
      });
    });
    return active;
  }

  /**
   * Check if agent log manager is properly initialized
   * @returns {boolean} - True if initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Subscribe to real-time log events for a specific agent
   * @param {string} agentId - Agent identifier
   */
  subscribeToAgent(agentId) {
    if (!agentId) {
      logger.error('Cannot subscribe: Agent ID is required');
      return;
    }

    this.activeSubscriptions.add(agentId);
    logger.debug('Subscribed to real-time logs for agent', { agentId });
  }

  /**
   * Unsubscribe from real-time log events for a specific agent
   * @param {string} agentId - Agent identifier
   */
  unsubscribeFromAgent(agentId) {
    if (!agentId) {
      logger.error('Cannot unsubscribe: Agent ID is required');
      return;
    }

    this.activeSubscriptions.delete(agentId);
    logger.debug('Unsubscribed from real-time logs for agent', { agentId });
  }

  /**
   * Get list of agents with active streaming subscriptions
   * @returns {Array<string>} - Array of agent IDs with active subscriptions
   */
  getActiveSubscriptions() {
    return Array.from(this.activeSubscriptions);
  }

  /**
   * Check if an agent has active streaming subscription
   * @param {string} agentId - Agent identifier
   * @returns {boolean} - True if agent has active subscription
   */
  hasActiveSubscription(agentId) {
    return this.activeSubscriptions.has(agentId);
  }
}

module.exports = AgentLogManager;
