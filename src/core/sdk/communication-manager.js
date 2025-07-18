const { query } = require('@anthropic-ai/claude-code');
const { EnvironmentValidationError, ConfigurationError } = require('../../utils/errors');
const logger = require('../../utils/logger');

/**
 * SDK Communication Manager
 * Handles Claude Code SDK operations with session management and recovery
 */
class SDKCommunicationManager {
  constructor() {
    this.sessions = new Map();
    this.logger = logger;
  }

  /**
   * Initialize SDK session for an agent
   * @param {string} agentId - Unique identifier for the agent
   * @param {string} workingDirectory - Working directory for the agent
   * @returns {Promise<Object>} Session object with SDK configuration
   */
  async initializeSDKSession(agentId, workingDirectory) {
    try {
      if (this.sessions.has(agentId)) {
        throw new ConfigurationError(
          `SDK session already exists for agent ${agentId}`,
          'SDK_SESSION_EXISTS',
          'Terminate existing session before creating new one',
        );
      }

      // Validate working directory
      if (!workingDirectory || typeof workingDirectory !== 'string') {
        throw new EnvironmentValidationError(
          'Working directory must be a valid string path',
          'INVALID_WORKING_DIRECTORY',
          'Provide a valid working directory path',
        );
      }

      // Create session object with SDK configuration
      const session = {
        agentId,
        workingDirectory,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastMessageId: null,
        lastActivity: new Date().toISOString(),
        abortController: new AbortController(),
        messageHistory: [],
        options: {
          maxTurns: 10,
          workingDirectory,
        },
      };

      // Store session
      this.sessions.set(agentId, session);

      this.logger.info('SDK session initialized', {
        agentId,
        workingDirectory,
        sessionId: agentId,
      });

      return session;
    } catch (error) {
      this.logger.error('Failed to initialize SDK session', {
        agentId,
        workingDirectory,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute query using Claude Code SDK
   * @param {string} agentId - Agent identifier
   * @param {string} prompt - Query prompt to send
   * @param {Object} options - Additional options for the query
   * @returns {Promise<Array>} Array of messages from SDK
   */
  async executeQuery(agentId, prompt, options = {}) {
    try {
      const session = this.sessions.get(agentId);
      if (!session) {
        throw new ConfigurationError(
          `No SDK session found for agent ${agentId}`,
          'SDK_SESSION_NOT_FOUND',
          'Initialize SDK session before executing queries',
        );
      }

      if (!session.isActive) {
        throw new ConfigurationError(
          `SDK session for agent ${agentId} is not active`,
          'SDK_SESSION_INACTIVE',
          'Reinitialize SDK session to continue',
        );
      }

      // Validate prompt
      if (!prompt || typeof prompt !== 'string') {
        throw new EnvironmentValidationError(
          'Prompt must be a non-empty string',
          'INVALID_PROMPT',
          'Provide a valid prompt string',
        );
      }

      // Merge options with session defaults
      const queryOptions = {
        ...session.options,
        ...options,
        abortController: session.abortController,
      };

      this.logger.info('Executing SDK query', {
        agentId,
        promptLength: prompt.length,
        options: queryOptions,
      });

      const messages = [];

      // Execute query using Claude Code SDK
      for await (const message of query({
        prompt,
        ...queryOptions,
      })) {
        messages.push(message);

        // Update session with message info
        session.lastMessageId = message.id || Date.now().toString();
        session.lastActivity = new Date().toISOString();
        session.messageHistory.push({
          id: session.lastMessageId,
          timestamp: session.lastActivity,
          type: 'response',
          content: message.content || JSON.stringify(message),
        });
      }

      // Keep message history manageable
      if (session.messageHistory.length > 100) {
        session.messageHistory = session.messageHistory.slice(-100);
      }

      this.logger.info('SDK query completed', {
        agentId,
        messageCount: messages.length,
        lastMessageId: session.lastMessageId,
      });

      return messages;
    } catch (error) {
      this.logger.error('Failed to execute SDK query', {
        agentId,
        error: error.message,
      });

      // Update session status on error
      const session = this.sessions.get(agentId);
      if (session) {
        session.lastActivity = new Date().toISOString();
        session.messageHistory.push({
          id: Date.now().toString(),
          timestamp: session.lastActivity,
          type: 'error',
          content: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Handle SDK message for processing
   * @param {string} agentId - Agent identifier
   * @param {Object} message - Message object from SDK
   * @returns {Object} Processed message object
   */
  handleSDKMessage(agentId, message) {
    try {
      const session = this.sessions.get(agentId);
      if (!session) {
        this.logger.warn('Received message for unknown agent', { agentId });
        return null;
      }

      // Process and normalize message
      const processedMessage = {
        id: message.id || Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: message.type || 'info',
        content: message.content || JSON.stringify(message),
        agentId,
      };

      // Update session tracking
      session.lastMessageId = processedMessage.id;
      session.lastActivity = processedMessage.timestamp;
      session.messageHistory.push({
        id: processedMessage.id,
        timestamp: processedMessage.timestamp,
        type: 'processed',
        content: processedMessage.content,
      });

      this.logger.debug('SDK message processed', {
        agentId,
        messageId: processedMessage.id,
        type: processedMessage.type,
      });

      return processedMessage;
    } catch (error) {
      this.logger.error('Failed to handle SDK message', {
        agentId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Terminate SDK session for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Promise<boolean>} Success status
   */
  async terminateSession(agentId) {
    try {
      const session = this.sessions.get(agentId);
      if (!session) {
        this.logger.warn('Attempted to terminate non-existent session', { agentId });
        return false;
      }

      // Abort any ongoing operations
      if (session.abortController) {
        session.abortController.abort();
      }

      // Mark session as inactive
      session.isActive = false;
      session.lastActivity = new Date().toISOString();

      // Remove from active sessions
      this.sessions.delete(agentId);

      this.logger.info('SDK session terminated', {
        agentId,
        sessionDuration: Date.now() - new Date(session.createdAt).getTime(),
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to terminate SDK session', {
        agentId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get session information for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} Session object or null if not found
   */
  getSession(agentId) {
    return this.sessions.get(agentId) || null;
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of active session objects
   */
  getActiveSessions() {
    return Array.from(this.sessions.values()).filter((session) => session.isActive);
  }

  /**
   * Session recovery using lastMessageId tracking
   * @param {string} agentId - Agent identifier
   * @param {string} lastMessageId - Last known message ID
   * @returns {Promise<boolean>} Recovery success status
   */
  async recoverSession(agentId, lastMessageId) {
    try {
      const session = this.sessions.get(agentId);
      if (!session) {
        this.logger.warn('Cannot recover non-existent session', { agentId });
        return false;
      }

      // Check if recovery is needed
      if (session.lastMessageId === lastMessageId) {
        this.logger.debug('Session already up to date', { agentId, lastMessageId });
        return true;
      }

      // Mark session for recovery
      session.lastMessageId = lastMessageId;
      session.lastActivity = new Date().toISOString();
      session.messageHistory.push({
        id: Date.now().toString(),
        timestamp: session.lastActivity,
        type: 'recovery',
        content: `Session recovered from message ${lastMessageId}`,
      });

      this.logger.info('Session recovery completed', {
        agentId,
        lastMessageId,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to recover session', {
        agentId,
        lastMessageId,
        error: error.message,
      });
      return false;
    }
  }
}

module.exports = SDKCommunicationManager;
