const winston = require('winston');
const path = require('path');
const os = require('os');

const logDir = path.join(os.homedir(), '.add-manager', 'logs');

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'add-manager' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

// Add file transport only if log directory exists
const fs = require('fs');

if (fs.existsSync(logDir)) {
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
  }));

  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
  }));
}

module.exports = logger;
