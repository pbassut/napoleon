// Jest global setup for timer cleanup and async handle prevention

// Set NODE_ENV to test if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Mock process.stdout.write to prevent terminal control sequences
// from interfering with Jest's async operation detection
const originalWrite = process.stdout.write;
const originalExit = process.exit;

// Mock Winston logger explicitly to prevent file handle leaks
jest.mock('./src/utils/logger', () => {
  const mockLogger = {
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
    child: jest.fn(() => mockLogger),
    isLevelEnabled: jest.fn(() => true),
    level: 'info'
  };
  return mockLogger;
});

// Global beforeEach to ensure clean state
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Set required environment variables for testing
  process.env.ANTHROPIC_API_KEY = 'test-api-key';
  
  // Mock process operations to prevent async handles
  process.stdout.write = jest.fn();
  process.exit = jest.fn();
});

// Global afterEach to clean up resources
afterEach(() => {
  // Clear all timers after each test
  jest.clearAllTimers();
  
  // Run any pending timers to completion
  if (jest.isMockFunction(jest.runOnlyPendingTimers)) {
    jest.runOnlyPendingTimers();
  }
  
  // Only use real timers if they weren't explicitly set by the test
  if (!global.__jestUsingFakeTimers) {
    jest.useRealTimers();
  }
  
  // Restore original process methods
  process.stdout.write = originalWrite;
  process.exit = originalExit;
  
  // Clean up any remaining resources
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global teardown to clean up any remaining handles  
afterAll(async () => {
  // Clear any lingering timers before teardown
  jest.clearAllTimers();
  jest.useRealTimers();
  
  // Force close any remaining file descriptors or handles
  if (global.gc) {
    global.gc();
  }
  
  // Wait briefly for cleanup
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });
});

// Set a shorter timeout for tests
jest.setTimeout(10000);