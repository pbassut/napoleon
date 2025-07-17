module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'bin/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  // Global setup to ensure timers are cleaned up
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Force Node.js to use fake timers globally to prevent timer leaks
  fakeTimers: {
    enableGlobally: false // Let individual tests control timer mocking
  },
  // Add teardown timeout
  testTimeout: 10000,
  // Enable open handle detection to help Jest clean up properly
  detectOpenHandles: true
};