module.exports = {
  testEnvironment: 'node',
  // Use jsdom for React hook tests
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '**/__tests__/**/*.test.js',
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.tsx',
        '**/__tests__/**/*.spec.js',
        '**/__tests__/**/*.spec.ts',
        '**/__tests__/**/*.spec.tsx',
        '!**/__tests__/**/hooks/**',
        '!**/__tests__/**/*hooks*.test.ts',
        '!**/__tests__/__mocks__/**',
      ],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
      },
      roots: ['<rootDir>/src', '<rootDir>/__tests__'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@anthropic-ai/claude-code$': '<rootDir>/__tests__/__mocks__/@anthropic-ai/claude-code.js',
        '^ink$': '<rootDir>/__tests__/__mocks__/ink.js',
        '^ink-testing-library$': '<rootDir>/__tests__/__mocks__/ink-testing-library.js',
        '^blessed$': '<rootDir>/__tests__/__mocks__/blessed.js',
      },
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/__tests__/**/hooks/**/*.test.ts',
        '**/__tests__/**/*hooks*.test.ts',
      ],
      transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
      },
      roots: ['<rootDir>/src', '<rootDir>/__tests__'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@anthropic-ai/claude-code$': '<rootDir>/__tests__/__mocks__/@anthropic-ai/claude-code.js',
        '^ink$': '<rootDir>/__tests__/__mocks__/ink.js',
        '^ink-testing-library$': '<rootDir>/__tests__/__mocks__/ink-testing-library.js',
        '^blessed$': '<rootDir>/__tests__/__mocks__/blessed.js',
      },
    },
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/__mocks__/',
    '/__tests__/utils/secure-logger.test.js',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.spec.js',
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.spec.tsx',
    '!**/__tests__/__mocks__/**',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.ts',
    'src/**/*.tsx',
    'bin/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.test.ts',
    '!src/**/*.spec.js',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 65.25,
      functions: 71.71,
      lines: 74.49,
      statements: 74.08,
    },
  },
  // Global setup to ensure timers are cleaned up
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Force Node.js to use fake timers globally to prevent timer leaks
  fakeTimers: {
    enableGlobally: false, // Let individual tests control timer mocking
  },
  // Add teardown timeout
  testTimeout: 10000,
  // Enable open handle detection to help Jest clean up properly
  detectOpenHandles: true,
  // Transform ES modules in node_modules for testing
  transformIgnorePatterns: [
    'node_modules/(?!(ink|ansi-escapes|cli-cursor|is-ci|signal-exit)/)',
  ],
};
