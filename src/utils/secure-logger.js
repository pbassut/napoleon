const winston = require('winston');
const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Secure Logger with API key sanitization
 * Extends winston logger with sensitive data protection
 */
class SecureLogger {
  constructor() {
    this.sensitivePatterns = [
      /sk-ant-[a-zA-Z0-9\-_]+/gi, // Anthropic API keys
      /ANTHROPIC_API_KEY[=:]\s*[^\s]+/gi, // Environment variable assignments
      /CLAUDE_API_KEY[=:]\s*[^\s]+/gi, // Alternative env var name
      /CLAUDE_CODE_API_KEY\s*[=:]\s*[^\s]+/gi, // Alternative env var name with flexible spacing
    ];

    this.logDir = path.join(os.homedir(), '.napoleon', 'logs');

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Determine if we're running in terminal UI mode
    this.isTerminalUI = process.env.TERMINAL_UI_MODE === 'true'
                        || process.argv.includes('start')
                        || process.argv.some((arg) => arg.includes('napoleon.js'));

    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({
          timestamp, level, message, ...meta
        }) => {
          // Sanitize sensitive information
          const sanitizedMessage = this.sanitizeMessage(message);
          const sanitizedMeta = this.sanitizeObject(meta);

          return JSON.stringify({
            timestamp,
            level,
            message: sanitizedMessage,
            ...sanitizedMeta,
          });
        }),
      ),
      defaultMeta: { service: 'napoleon' },
      transports: [],
    });

    // Add console transport only if NOT in terminal UI mode
    if (!this.isTerminalUI) {
      this.winston.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, ...meta }) => {
            const sanitizedMessage = this.sanitizeMessage(message);
            const metaStr = Object.keys(meta).length > 0
              ? ` ${JSON.stringify(this.sanitizeObject(meta))}`
              : '';
            return `${level}: ${sanitizedMessage}${metaStr}`;
          }),
        ),
      }));
    }

    // Always add file transports for persistent logging
    this.winston.add(new winston.transports.File({
      filename: path.join(this.logDir, 'error.log'),
      level: 'error',
    }));

    this.winston.add(new winston.transports.File({
      filename: path.join(this.logDir, 'combined.log'),
    }));
  }

  /**
   * Sanitize message string to remove sensitive information
   * @param {string} message - Message to sanitize
   * @returns {string} Sanitized message
   */
  sanitizeMessage(message) {
    if (typeof message !== 'string') {
      return message;
    }

    let sanitized = message;

    this.sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Sanitize object properties recursively
   * @param {Object} obj - Object to sanitize
   * @returns {Object} Sanitized object
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => {
        if (typeof item === 'string') {
          return this.sanitizeMessage(item);
        } if (typeof item === 'object') {
          return this.sanitizeObject(item);
        }
        return item;
      });
    }

    const sanitized = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeMessage(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Log info level message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.winston.info(message, meta);
  }

  /**
   * Log error level message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    this.winston.error(message, meta);
  }

  /**
   * Log debug level message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.winston.debug(message, meta);
  }

  /**
   * Log warn level message
   * @param {string} message - Message to log
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.winston.warn(message, meta);
  }

  /**
   * Test if message contains sensitive information
   * @param {string} message - Message to test
   * @returns {boolean} True if sensitive content detected
   */
  hasSensitiveContent(message) {
    if (typeof message !== 'string') {
      return false;
    }

    return this.sensitivePatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Get current sensitive patterns for testing
   * @returns {Array} Array of regex patterns
   */
  getSensitivePatterns() {
    return this.sensitivePatterns.map((pattern) => pattern.source);
  }
}

// Create singleton instance
const secureLogger = new SecureLogger();

module.exports = secureLogger;
