const winston = require('winston');
const path = require('path');
const os = require('os');
const fs = require('fs');

const logDir = path.join(os.homedir(), '.napoleon', 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Determine if we're running in terminal UI mode
const isTerminalUI = process.env.TERMINAL_UI_MODE === 'true'
                     || process.argv.includes('start')
                     || process.argv.some((arg) => arg.includes('napoleon.js'));

// Check if logging should be disabled (useful for tests)
const isLoggingDisabled = process.env.DISABLE_LOGGING === 'true';

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'napoleon' },
  transports: [],
  // Disable logging completely if DISABLE_LOGGING is set
  silent: isLoggingDisabled,
});

// Add transports only if logging is not disabled
if (!isLoggingDisabled) {
  // Add console transport if NOT in terminal UI mode OR if LOG_TESTS is enabled
  if (!isTerminalUI || process.env.LOG_TESTS === 'true') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }));
  }

  // Always add file transports for persistent logging
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
  }));

  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
  }));
}

module.exports = logger;
