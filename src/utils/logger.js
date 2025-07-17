const winston = require('winston');
const path = require('path');
const os = require('os');
const fs = require('fs');

const logDir = path.join(os.homedir(), '.add-manager', 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Determine if we're running in terminal UI mode
const isTerminalUI = process.env.TERMINAL_UI_MODE === 'true'
                     || process.argv.includes('start')
                     || process.argv.some((arg) => arg.includes('add-manager.js'));

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'add-manager' },
  transports: [],
});

// Add console transport only if NOT in terminal UI mode
if (!isTerminalUI) {
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

module.exports = logger;
