// Jest global setup for timer cleanup
afterEach(() => {
  // Clear all timers after each test
  jest.clearAllTimers();
  
  // Run any pending timers to completion
  if (jest.isMockFunction(jest.runOnlyPendingTimers)) {
    jest.runOnlyPendingTimers();
  }
  
  // Ensure we're using real timers for the next test
  jest.useRealTimers();
  
  // Clean up any remaining resources
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Global beforeEach to ensure clean state
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Set a shorter timeout for tests
jest.setTimeout(10000);