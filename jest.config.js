module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/__tests__/**/*.ts',
    '**/__tests__/**/*.tsx',
    '**/?(*.)+(spec|test).js',
    '**/?(*.)+(spec|test).ts',
    '**/?(*.)+(spec|test).tsx'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/archived-blessed-tests/',
    '/__tests__/ui.test.js',
    '/__tests__/agent-detail-view.test.js',
    '/__tests__/agent-detail-view-logging.test.js',
    '/__tests__/__mocks__/'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.ts',
    'src/**/*.tsx',
    'bin/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.test.ts',
    '!src/**/*.spec.js',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
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
  detectOpenHandles: true,
  // Transform ES modules in node_modules for testing
  transformIgnorePatterns: [
    'node_modules/(?!(ink|ansi-escapes|cli-cursor|is-ci|signal-exit)/)'
  ],
  // Mock Claude Code SDK to avoid ES module import issues
  moduleNameMapper: {
    '^@anthropic-ai/claude-code$': '<rootDir>/__tests__/__mocks__/@anthropic-ai/claude-code.js',
    '^ink$': '<rootDir>/__tests__/__mocks__/ink.js',
    '^ink-testing-library$': '<rootDir>/__tests__/__mocks__/ink-testing-library.js'
  }
};