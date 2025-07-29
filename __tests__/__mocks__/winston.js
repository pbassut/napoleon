// Comprehensive winston mock
const winston = {
  format: {
    combine: jest.fn(() => 'combined-format'),
    timestamp: jest.fn(() => 'timestamp-format'),
    errors: jest.fn(() => 'errors-format'),
    printf: jest.fn((fn) => fn),
    colorize: jest.fn(() => 'colorize-format'),
    json: jest.fn(() => 'json-format'),
    simple: jest.fn(() => 'simple-format')
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
    log: jest.fn(),
    close: jest.fn(),
    end: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    configure: jest.fn(),
    child: jest.fn(),
    isLevelEnabled: jest.fn(() => true),
    level: 'info'
  }))
};

module.exports = winston;