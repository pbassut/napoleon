/**
 * SDK Types and Interfaces for Claude Code SDK Integration
 *
 * This module defines the types and interfaces for integrating with the
 * @anthropic-ai/claude-code SDK, providing type safety and documentation
 * for SDK interactions.
 */

/**
 * SDK Status enumeration for agent sessions
 */
const SDKStatus = {
  INACTIVE: 'inactive',
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

/**
 * SDK Message types for communication
 */
const SDKMessageType = {
  QUERY: 'query',
  RESPONSE: 'response',
  ERROR: 'error',
  STATUS: 'status',
};

/**
 * SDK Error types for better error handling
 */
const SDKErrorType = {
  CONNECTION_ERROR: 'connection_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  VALIDATION_ERROR: 'validation_error',
  INTERNAL_ERROR: 'internal_error',
};

/**
 * Creates a new SDK session configuration object
 *
 * @param {Object} options - Configuration options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} [options.model] - Model to use (default: claude-3-sonnet-20240229)
 * @param {number} [options.maxTokens] - Maximum tokens for responses
 * @param {number} [options.temperature] - Temperature for responses (0-1)
 * @returns {Object} SDK session configuration
 */
function createSDKSessionConfig(options = {}) {
  const {
    apiKey,
    model = 'claude-3-sonnet-20240229',
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  if (!apiKey) {
    throw new Error('API key is required for SDK session configuration');
  }

  return {
    apiKey,
    model,
    maxTokens,
    temperature,
    metadata: {
      source: 'napoleon-agent-manager',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Generates a unique message ID
 *
 * @returns {string} Unique message ID
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a new SDK message object
 *
 * @param {string} type - Message type from SDKMessageType
 * @param {string} content - Message content
 * @param {Object} [metadata] - Optional metadata
 * @returns {Object} SDK message object
 */
function createSDKMessage(type, content, metadata = {}) {
  return {
    id: generateMessageId(),
    type,
    content,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      source: 'napoleon-agent-manager',
    },
  };
}

/**
 * Creates a new SDK error object
 *
 * @param {string} type - Error type from SDKErrorType
 * @param {string} message - Error message
 * @param {Error} [originalError] - Original error if wrapping
 * @returns {Object} SDK error object
 */
function createSDKError(type, message, originalError = null) {
  return {
    type,
    message,
    timestamp: new Date().toISOString(),
    originalError: originalError ? {
      name: originalError.name,
      message: originalError.message,
      stack: originalError.stack,
    } : null,
  };
}

/**
 * Validates SDK session configuration
 *
 * @param {Object} config - SDK session configuration
 * @returns {boolean} True if configuration is valid
 * @throws {Error} If configuration is invalid
 */
function validateSDKSessionConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('SDK session configuration must be an object');
  }

  if (!config.apiKey || typeof config.apiKey !== 'string') {
    throw new Error('SDK session configuration must include a valid API key');
  }

  if (config.apiKey.length < 10) {
    throw new Error('SDK API key appears to be invalid (too short)');
  }

  if (config.maxTokens !== undefined && (typeof config.maxTokens !== 'number' || config.maxTokens < 1)) {
    throw new Error('SDK maxTokens must be a positive number');
  }

  if (config.temperature !== undefined && (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 1)) {
    throw new Error('SDK temperature must be a number between 0 and 1');
  }

  return true;
}

/**
 * Validates SDK message format
 *
 * @param {Object} message - SDK message object
 * @returns {boolean} True if message is valid
 * @throws {Error} If message is invalid
 */
function validateSDKMessage(message) {
  if (!message || typeof message !== 'object') {
    throw new Error('SDK message must be an object');
  }

  if (!message.id || typeof message.id !== 'string') {
    throw new Error('SDK message must have a valid ID');
  }

  if (!message.type || !Object.values(SDKMessageType).includes(message.type)) {
    throw new Error(`SDK message type must be one of: ${Object.values(SDKMessageType).join(', ')}`);
  }

  if (!message.content || typeof message.content !== 'string') {
    throw new Error('SDK message must have valid content');
  }

  return true;
}

/**
 * Generates a unique session ID
 *
 * @returns {string} Unique session ID
 */
function generateSDKSessionId() {
  return `sdk_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Transforms legacy session data to SDK format
 *
 * @param {Object} legacySession - Legacy session data
 * @returns {Object} SDK-compatible session data
 */
function transformLegacySessionToSDK(legacySession) {
  if (!legacySession || typeof legacySession !== 'object') {
    throw new Error('Legacy session data must be an object');
  }

  return {
    ...legacySession,
    sdkStatus: SDKStatus.INACTIVE,
    sdkSessionId: generateSDKSessionId(),
    lastMessageId: null,
    sdkConfig: null,
    sdkMetadata: {
      migratedFrom: 'legacy-session',
      migrationDate: new Date().toISOString(),
      version: '2.0.0',
    },
  };
}

/**
 * Checks if the current environment has the required SDK dependencies
 *
 * @returns {Object} Environment check results
 */
function checkSDKEnvironment() {
  const checks = {
    nodeVersion: process.version,
    nodeVersionValid: false,
    apiKeyPresent: false,
    sdkPackagePresent: false,
    errors: [],
  };

  // Check Node.js version (should be >= 18.0.0)
  try {
    const nodeVersion = process.version.replace('v', '');
    const [major] = nodeVersion.split('.').map(Number);
    checks.nodeVersionValid = major >= 18;

    if (!checks.nodeVersionValid) {
      checks.errors.push(`Node.js version ${process.version} is not supported. Requires >= 18.0.0`);
    }
  } catch (error) {
    checks.errors.push(`Failed to check Node.js version: ${error.message}`);
  }

  // Check for API key environment variable
  checks.apiKeyPresent = !!(process.env.ANTHROPIC_API_KEY
    && process.env.ANTHROPIC_API_KEY.length > 0);
  if (!checks.apiKeyPresent) {
    checks.errors.push('ANTHROPIC_API_KEY environment variable is not set');
  }

  // Check for SDK package availability
  try {
    require.resolve('@anthropic-ai/claude-code');
    checks.sdkPackagePresent = true;
  } catch (error) {
    checks.sdkPackagePresent = false;
    checks.errors.push('@anthropic-ai/claude-code package is not installed');
  }

  return checks;
}

module.exports = {
  // Enums
  SDKStatus,
  SDKMessageType,
  SDKErrorType,

  // Factory functions
  createSDKSessionConfig,
  createSDKMessage,
  createSDKError,

  // Validation functions
  validateSDKSessionConfig,
  validateSDKMessage,

  // Utility functions
  generateMessageId,
  generateSDKSessionId,
  transformLegacySessionToSDK,
  checkSDKEnvironment,
};
