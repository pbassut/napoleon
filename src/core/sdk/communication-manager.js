// const { query } = require('@anthropic-ai/claude-code'); // Moved to method to support mocking
const fs = require('fs');
const path = require('path');
const { EnvironmentValidationError, ConfigurationError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const toolUsageTracker = require('../tool-usage-tracker');

/**
 * SDK Communication Manager
 * Handles Claude Code SDK operations with session management and recovery
 */
class SDKCommunicationManager {
  constructor(agentLogManager = null) {
    this.sessions = new Map();
    this.logger = logger;
    this.agentLogManager = agentLogManager;
  }

  /**
   * Initialize SDK session for an agent
   * @param {string} agentId - Unique identifier for the agent
   * @param {string} workingDirectory - Working directory for the agent
   * @returns {Promise<Object>} Session object with SDK configuration
   */
  async initializeSDKSession(agentId, workingDirectory) {
    const startTime = Date.now();

    try {
      this.logger.info('Starting SDK session initialization', {
        agentId,
        workingDirectory,
        timestamp: new Date().toISOString(),
      });

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

      // Validate working directory exists and is accessible
      const workingDirExists = fs.existsSync(workingDirectory);
      const isDirectory = workingDirExists && fs.statSync(workingDirectory).isDirectory();

      this.logger.info('Working directory validation', {
        agentId,
        workingDirectory,
        workingDirExists,
        isDirectory,
        timestamp: new Date().toISOString(),
      });

      if (!workingDirExists || !isDirectory) {
        throw new EnvironmentValidationError(
          `Working directory does not exist or is not accessible: ${workingDirectory}`,
          'WORKING_DIRECTORY_NOT_FOUND',
          'Ensure worktree was created successfully before SDK initialization',
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
          workingDirectory,
          cwd: workingDirectory, // Also pass as cwd in case SDK expects this parameter
        },
      };

      // Store session
      this.sessions.set(agentId, session);

      const duration = Date.now() - startTime;

      this.logger.info('SDK session initialized successfully', {
        agentId,
        workingDirectory,
        sessionId: agentId,
        duration: `${duration}ms`,
        workingDirValidated: true,
        timestamp: new Date().toISOString(),
      });

      return session;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error('Failed to initialize SDK session', {
        agentId,
        workingDirectory,
        error: error.message,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Execute query using Claude Code SDK - returns all messages at once
   * @param {string} agentId - Agent identifier
   * @param {string} prompt - Query prompt to send
   * @param {Object} options - Additional options for the query
   * @returns {Promise<Array>} Array of messages from SDK
   */
  async executeQuery(agentId, prompt, options = {}) {
    const startTime = Date.now();
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
      // Use the claude executable from the worktree's node_modules
      const claudeExecutable = path.join(session.workingDirectory, 'node_modules', '.bin', 'claude');

      const queryOptions = {
        permissionMode: 'bypassPermissions',
        pathToClaudeCodeExecutable: claudeExecutable,
        cwd: session.workingDirectory,
        ...session.options,
        ...options,
        abortController: session.abortController,
      };

      // Log SDK request with full prompt for debugging
      if (this.agentLogManager) {
        try {
          await this.agentLogManager.writeLogEntry(agentId, {
            type: 'sdk_request',
            source: 'claude_sdk',
            content: JSON.stringify({
              prompt,
              options: {
                model: queryOptions.model,
                maxTokens: queryOptions.maxTokens,
                temperature: queryOptions.temperature,
              },
            }, null, 2),
            metadata: {
              promptLength: prompt.length,
              model: queryOptions.model || 'default',
              maxTokens: queryOptions.maxTokens,
              temperature: queryOptions.temperature,
              requestTimestamp: new Date().toISOString(),
              requestStartTime: startTime,
            },
          });
        } catch (logError) {
          // Non-blocking: continue SDK operation if logging fails
          this.logger.warn('Failed to log SDK request', {
            agentId,
            error: logError.message,
          });
        }
      }

      this.logger.info('Executing SDK query', {
        agentId,
        promptLength: prompt.length,
        options: queryOptions,
        promptPreview: prompt,
      });

      this.logger.debug('SDK: Starting query execution with detailed monitoring', {
        agentId,
        sessionActive: session.isActive,
        hasAbortController: !!session.abortController,
        abortSignal: session.abortController?.signal?.aborted || 'no-signal',
        workingDirectory: queryOptions.workingDirectory,
      });

      const messages = [];
      let tokenUsage = { input: 0, output: 0, total: 0 };

      // Execute query using Claude Code SDK
      this.logger.debug('SDK: Executing query with Claude Code SDK', {
        agentId,
        promptLength: prompt.length,
        options: queryOptions,
        permissionMode: queryOptions.permissionMode,
        workingDirectory: queryOptions.workingDirectory,
        cwd: queryOptions.cwd,
        pathToClaudeCodeExecutable: queryOptions.pathToClaudeCodeExecutable,
      });

      const { query } = require('@anthropic-ai/claude-code');
      const queryResponse = query({
        prompt,
        options: queryOptions,
      });

      this.logger.debug('SDK: Query response object created, starting message iteration', {
        agentId,
        responseType: typeof queryResponse,
        queryResponseValue: queryResponse,
        hasAsyncIterator: queryResponse && Symbol.asyncIterator in queryResponse,
      });

      // Process streaming response
      const messageIterator = queryResponse[Symbol.asyncIterator]();
      this.logger.debug('SDK: Message iterator created, getting first message', { agentId });

      let iteratorResult = await messageIterator.next();
      this.logger.debug('SDK: First iterator result received', {
        agentId,
        done: iteratorResult.done,
        hasValue: !!iteratorResult.value,
        valueType: typeof iteratorResult.value,
      });

      let messageCount = 0;
      while (!iteratorResult.done) {
        const message = iteratorResult.value;
        messageCount += 1;
        messages.push(message);

        this.logger.debug('SDK: Processing message', {
          agentId,
          messageIndex: messageCount,
          messageType: message.type,
          messageId: message.id,
          hasContent: !!message.content,
          contentLength: message.content?.length || 0,
        });

        // Update token usage if available
        if (message.usage) {
          tokenUsage = message.usage;
          this.logger.debug('SDK: Token usage updated', {
            agentId,
            tokenUsage,
          });
        }

        // Log each response message (AC2) - non-blocking
        this.logSDKResponse(agentId, message, startTime, messages.length - 1, messages.length);

        // Track TodoWrite tool usage
        this.trackToolUsage(agentId, message);

        // Update session with message info
        session.lastMessageId = message.id || Date.now().toString();
        session.lastActivity = new Date().toISOString();
        session.messageHistory.push({
          id: session.lastMessageId,
          timestamp: session.lastActivity,
          type: 'response',
          content: message.content || JSON.stringify(message),
        });

        // Get next message
        this.logger.debug('SDK: Requesting next message from iterator', {
          agentId,
          currentMessageCount: messageCount,
          currentMessageType: message.type,
        });

        // eslint-disable-next-line no-await-in-loop
        iteratorResult = await messageIterator.next();

        this.logger.debug('SDK: Next iterator result received', {
          agentId,
          done: iteratorResult.done,
          hasValue: !!iteratorResult.value,
          messageCount: messageCount + 1,
        });
      }

      this.logger.debug('SDK: Message iteration completed', {
        agentId,
        totalMessages: messageCount,
        finalTokenUsage: tokenUsage,
      });

      // Keep message history manageable
      if (session.messageHistory.length > 100) {
        session.messageHistory = session.messageHistory.slice(-100);
      }

      // Log final summary (AC4)
      if (this.agentLogManager) {
        try {
          const totalDuration = Date.now() - startTime;
          await this.agentLogManager.writeLogEntry(agentId, {
            type: 'sdk_summary',
            source: 'claude_sdk',
            content: 'SDK query completed successfully',
            metadata: {
              totalDuration,
              messageCount: messages.length,
              finalTokenUsage: tokenUsage,
              costEstimate: SDKCommunicationManager.calculateCostEstimate(tokenUsage),
              averageResponseTime: messages.length > 0 ? totalDuration / messages.length : 0,
              performanceWarning: totalDuration > 30000,
            },
          });

          // Log performance warning if request took too long
          if (totalDuration > 30000) {
            await this.agentLogManager.writeLogEntry(agentId, {
              type: 'sdk_warning',
              source: 'claude_sdk',
              content: `Slow SDK request detected: ${totalDuration}ms (threshold: 30000ms)`,
              metadata: {
                duration: totalDuration,
                threshold: 30000,
                promptLength: prompt.length,
                messageCount: messages.length,
              },
            });
          }
        } catch (logError) {
          // Non-blocking: continue SDK operation if logging fails
          this.logger.warn('Failed to log SDK summary', {
            agentId,
            error: logError.message,
          });
        }
      }

      this.logger.info('SDK query completed', {
        agentId,
        messageCount: messages.length,
        lastMessageId: session.lastMessageId,
        duration: Date.now() - startTime,
      });

      return messages;
    } catch (error) {
      const errorSession = this.sessions.get(agentId);

      this.logger.error('SDK: Query execution failed with error', {
        agentId,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        errorStack: error.stack,
        duration: Date.now() - startTime,
        promptLength: prompt?.length || 0,
        abortSignal: errorSession?.abortController?.signal?.aborted || 'no-signal',
        errorType: SDKCommunicationManager.classifySDKError(error),
      });

      // Log SDK errors with complete context (AC3)
      if (this.agentLogManager) {
        try {
          await this.agentLogManager.writeLogEntry(agentId, {
            type: 'sdk_error',
            source: 'claude_sdk',
            content: `SDK Error: ${error.message}`,
            metadata: {
              error: error.name,
              message: error.message,
              stack: error.stack,
              duration: Date.now() - startTime,
              promptLength: prompt.length,
              requestOptions: options,
              requestTimestamp: new Date().toISOString(),
              errorType: SDKCommunicationManager.classifySDKError(error),
            },
          });
        } catch (logError) {
          // Non-blocking: continue error handling if logging fails
          this.logger.warn('Failed to log SDK error', {
            agentId,
            error: logError.message,
          });
        }
      }

      this.logger.error('Failed to execute SDK query', {
        agentId,
        error: error.message,
        duration: Date.now() - startTime,
      });

      if (errorSession) {
        errorSession.lastActivity = new Date().toISOString();
        errorSession.messageHistory.push({
          id: Date.now().toString(),
          timestamp: errorSession.lastActivity,
          type: 'error',
          content: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Execute query using Claude Code SDK - yields messages in real-time
   * @param {string} agentId - Agent identifier
   * @param {string} prompt - Query prompt to send
   * @param {Object} options - Additional options for the query
   * @returns {AsyncGenerator<Object>} Async generator that yields messages from SDK
   */
  async* executeQueryStream(agentId, prompt, options = {}) {
    const startTime = Date.now();
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
      // Use the claude executable from the worktree's node_modules
      const claudeExecutable = require('path').join(session.workingDirectory, 'node_modules', '.bin', 'claude');

      const queryOptions = {
        permissionMode: 'bypassPermissions',
        pathToClaudeCodeExecutable: claudeExecutable,
        cwd: session.workingDirectory,
        ...session.options,
        ...options,
        abortController: session.abortController,
      };

      // Log SDK request with full prompt for debugging
      if (this.agentLogManager) {
        try {
          await this.agentLogManager.writeLogEntry(agentId, {
            type: 'sdk_request',
            source: 'claude_sdk',
            content: JSON.stringify({
              prompt,
              options: {
                model: queryOptions.model,
                maxTokens: queryOptions.maxTokens,
                temperature: queryOptions.temperature,
              },
            }, null, 2),
            metadata: {
              promptLength: prompt.length,
              model: queryOptions.model || 'default',
              maxTokens: queryOptions.maxTokens,
              temperature: queryOptions.temperature,
              requestTimestamp: new Date().toISOString(),
              requestStartTime: startTime,
            },
          });
        } catch (logError) {
          // Non-blocking: continue SDK operation if logging fails
          this.logger.warn('Failed to log SDK request', {
            agentId,
            error: logError.message,
          });
        }
      }

      this.logger.info('Executing SDK query stream', {
        agentId,
        promptLength: prompt.length,
        options: queryOptions,
        promptPreview: prompt,
      });

      this.logger.debug('SDK: Starting streaming query execution', {
        agentId,
        sessionActive: session.isActive,
        hasAbortController: !!session.abortController,
        abortSignal: session.abortController?.signal?.aborted || 'no-signal',
        workingDirectory: queryOptions.workingDirectory,
      });

      let messageCount = 0;
      let tokenUsage = { input: 0, output: 0, total: 0 };

      // Execute query using Claude Code SDK
      this.logger.debug('SDK: Executing streaming query with Claude Code SDK', {
        agentId,
        promptLength: prompt.length,
        options: queryOptions,
        permissionMode: queryOptions.permissionMode,
        workingDirectory: queryOptions.workingDirectory,
        cwd: queryOptions.cwd,
        pathToClaudeCodeExecutable: queryOptions.pathToClaudeCodeExecutable,
      });

      const { query } = require('@anthropic-ai/claude-code');
      const queryResponse = query({
        prompt,
        options: queryOptions,
      });

      this.logger.debug('SDK: Query response object created for streaming', {
        agentId,
        responseType: typeof queryResponse,
        hasAsyncIterator: Symbol.asyncIterator in queryResponse,
      });

      // Process streaming response and yield messages immediately
      for await (const message of queryResponse) {
        messageCount++;

        this.logger.debug('SDK: Processing streaming message', {
          agentId,
          messageIndex: messageCount,
          messageType: message.type,
          messageId: message.id,
          hasContent: !!message.content,
          contentLength: message.content?.length || 0,
        });

        // Update token usage if available
        if (message.usage) {
          tokenUsage = message.usage;
          this.logger.debug('SDK: Token usage updated', {
            agentId,
            tokenUsage,
          });
        }

        // Log each response message (AC2) - non-blocking
        this.logSDKResponse(agentId, message, startTime, messageCount - 1, messageCount);

        // Track TodoWrite tool usage
        this.trackToolUsage(agentId, message);

        // Update session with message info
        session.lastMessageId = message.id || Date.now().toString();
        session.lastActivity = new Date().toISOString();
        session.messageHistory.push({
          id: session.lastMessageId,
          timestamp: session.lastActivity,
          type: 'response',
          content: message.content || JSON.stringify(message),
        });

        // Yield message immediately for real-time processing
        yield message;
      }

      this.logger.debug('SDK: Streaming iteration completed', {
        agentId,
        totalMessages: messageCount,
        finalTokenUsage: tokenUsage,
      });

      // Keep message history manageable
      if (session.messageHistory.length > 100) {
        session.messageHistory = session.messageHistory.slice(-100);
      }

      // Log final summary (AC4)
      if (this.agentLogManager) {
        try {
          const totalDuration = Date.now() - startTime;
          await this.agentLogManager.writeLogEntry(agentId, {
            type: 'sdk_summary',
            source: 'claude_sdk',
            content: 'SDK streaming query completed successfully',
            metadata: {
              totalDuration,
              messageCount,
              finalTokenUsage: tokenUsage,
              costEstimate: SDKCommunicationManager.calculateCostEstimate(tokenUsage),
              averageResponseTime: messageCount > 0 ? totalDuration / messageCount : 0,
              performanceWarning: totalDuration > 30000,
            },
          });

          // Log performance warning if request took too long
          if (totalDuration > 30000) {
            await this.agentLogManager.writeLogEntry(agentId, {
              type: 'sdk_warning',
              source: 'claude_sdk',
              content: `Slow SDK streaming request detected: ${totalDuration}ms (threshold: 30000ms)`,
              metadata: {
                duration: totalDuration,
                threshold: 30000,
                promptLength: prompt.length,
                messageCount,
              },
            });
          }
        } catch (logError) {
          // Non-blocking: continue SDK operation if logging fails
          this.logger.warn('Failed to log SDK summary', {
            agentId,
            error: logError.message,
          });
        }
      }

      this.logger.info('SDK streaming query completed', {
        agentId,
        messageCount,
        lastMessageId: session.lastMessageId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const errorSession = this.sessions.get(agentId);

      this.logger.error('SDK: Streaming query execution failed with error', {
        agentId,
        error: error.message,
        errorName: error.name,
        errorCode: error.code,
        errorStack: error.stack,
        duration: Date.now() - startTime,
        promptLength: prompt?.length || 0,
        abortSignal: errorSession?.abortController?.signal?.aborted || 'no-signal',
        errorType: SDKCommunicationManager.classifySDKError(error),
      });

      // Log SDK errors with complete context (AC3)
      if (this.agentLogManager) {
        try {
          await this.agentLogManager.writeLogEntry(agentId, {
            type: 'sdk_error',
            source: 'claude_sdk',
            content: `SDK Streaming Error: ${error.message}`,
            metadata: {
              error: error.name,
              message: error.message,
              stack: error.stack,
              duration: Date.now() - startTime,
              promptLength: prompt.length,
              requestOptions: options,
              requestTimestamp: new Date().toISOString(),
              errorType: SDKCommunicationManager.classifySDKError(error),
            },
          });
        } catch (logError) {
          // Non-blocking: continue error handling if logging fails
          this.logger.warn('Failed to log SDK error', {
            agentId,
            error: logError.message,
          });
        }
      }

      this.logger.error('Failed to execute SDK streaming query', {
        agentId,
        error: error.message,
        duration: Date.now() - startTime,
      });

      if (errorSession) {
        errorSession.lastActivity = new Date().toISOString();
        errorSession.messageHistory.push({
          id: Date.now().toString(),
          timestamp: errorSession.lastActivity,
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

  /**
   * Log SDK response message with non-blocking error handling
   * @param {string} agentId - Agent identifier
   * @param {Object} message - Response message from SDK
   * @param {number} startTime - Request start timestamp
   * @param {number} messageIndex - Index of current message
   * @param {number} totalMessages - Total message count
   * @private
   */
  logSDKResponse(agentId, message, startTime, messageIndex, totalMessages) {
    if (this.agentLogManager) {
      // Use setImmediate for non-blocking async operation
      setImmediate(async () => {
        try {
          await this.agentLogManager.writeLogEntry(agentId, {
            type: 'sdk_response',
            source: 'claude_sdk',
            content: JSON.stringify(message, null, 2),
            metadata: {
              messageId: message.id,
              duration: Date.now() - startTime,
              tokenUsage: message.usage,
              model: message.model,
              messageIndex,
              totalMessages,
            },
          });
        } catch (logError) {
          // Non-blocking: continue SDK operation if logging fails
          this.logger.warn('Failed to log SDK response', {
            agentId,
            messageId: message.id,
            error: logError.message,
          });
        }
      });
    }
  }

  /**
   * Calculate cost estimate based on token usage
   * @param {Object} tokenUsage - Token usage object with input/output counts
   * @returns {Object} Cost estimation details
   * @private
   */
  static calculateCostEstimate(tokenUsage) {
    if (!tokenUsage || typeof tokenUsage !== 'object') {
      return { estimated: false, error: 'Invalid token usage data' };
    }

    // Claude 3.5 Sonnet pricing (as of 2024)
    const inputCostPer1K = 0.003; // $3 per 1M tokens
    const outputCostPer1K = 0.015; // $15 per 1M tokens

    const inputTokens = tokenUsage.input || 0;
    const outputTokens = tokenUsage.output || 0;

    const inputCost = (inputTokens / 1000) * inputCostPer1K;
    const outputCost = (outputTokens / 1000) * outputCostPer1K;
    const totalCost = inputCost + outputCost;

    return {
      estimated: true,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost: parseFloat(inputCost.toFixed(6)),
      outputCost: parseFloat(outputCost.toFixed(6)),
      totalCost: parseFloat(totalCost.toFixed(6)),
      currency: 'USD',
      note: 'Estimated based on Claude 3.5 Sonnet pricing',
    };
  }

  /**
   * Classify SDK error types for better categorization
   * @param {Error} error - The error object to classify
   * @returns {string} Error classification
   * @private
   */
  static classifySDKError(error) {
    if (!error || !error.message) {
      return 'unknown_error';
    }

    const message = error.message.toLowerCase();
    const name = error.name ? error.name.toLowerCase() : '';

    // Network and connection errors
    if (message.includes('network') || message.includes('connection')
        || message.includes('timeout') || message.includes('econnreset')
        || message.includes('enotfound') || name.includes('network')) {
      return 'connection_error';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication')
        || message.includes('api key') || message.includes('forbidden')
        || error.status === 401 || error.status === 403) {
      return 'authentication_error';
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')
        || error.status === 429) {
      return 'rate_limit_error';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')
        || message.includes('malformed') || error.status === 400) {
      return 'validation_error';
    }

    // Abort/cancellation errors
    if (message.includes('abort') || message.includes('cancel')
        || name.includes('abort')) {
      return 'request_cancelled';
    }

    // Server errors
    if (error.status >= 500 || message.includes('internal server')
        || message.includes('service unavailable')) {
      return 'server_error';
    }

    // SDK-specific errors
    if (name.includes('sdk') || message.includes('claude')
        || message.includes('anthropic')) {
      return 'sdk_error';
    }

    return 'unknown_error';
  }

  /**
   * Track tool usage from SDK messages
   * @param {string} agentId - The agent ID
   * @param {Object} message - The SDK message object
   */
  trackToolUsage(agentId, message) {
    try {
      // Check if message contains tool_use content
      if (message.content && Array.isArray(message.content)) {
        const toolUse = message.content.find((item) => item.type === 'tool_use');
        if (toolUse && toolUse.name === 'TodoWrite') {
          // Initialize tool tracking for this agent
          toolUsageTracker.initializeAgent(agentId);

          // Track the TodoWrite usage
          toolUsageTracker.trackTodoWrite(agentId, toolUse, message);

          // Log tool tracking success
          this.logger.debug('TodoWrite usage tracked', {
            agentId,
            toolId: toolUse.id,
            messageId: message.id,
            todoCount: toolUse.input?.todos?.length || 0,
          });
        }
      }
    } catch (error) {
      // Non-blocking: tool tracking failures shouldn't break SDK operation
      this.logger.warn('Failed to track tool usage', {
        agentId,
        error: error.message,
        messageId: message.id,
      });
    }
  }
}

module.exports = SDKCommunicationManager;
