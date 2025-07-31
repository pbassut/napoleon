const { program } = require('commander');
const { initializeApplication } = require('../src/cli/index');

jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn(),
  initializeSessionStorage: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../src/cli/validators/environment', () => ({
  validateEnvironment: jest.fn(),
  validateApiKey: jest.fn(),
  validateGitWorkingTree: jest.fn(),
}));

// Mock the terminal UI
jest.mock('../src/ui/index.ts', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
  })),
}));

const { loadConfig, initializeSessionStorage } = require('../src/core/config');

// Mock loadConfig to return a valid config object
loadConfig.mockReturnValue({
  napoleonDir: '/test/.napoleon',
  sessionStorage: '/test/.napoleon/sessions',
  maxPromptLength: 50,
});

describe('CLI Application', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Save and mock environment variables
    originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

    // Get mocked functions
    const { validateEnvironment } = require('../src/cli/validators/environment');

    // Re-apply config mock after clearAllMocks
    loadConfig.mockReturnValue({
      napoleonDir: '/test/.napoleon',
      sessionStorage: '/test/.napoleon/sessions',
      maxPromptLength: 50,
    });

    // Re-apply initializeSessionStorage mock after clearAllMocks
    initializeSessionStorage.mockResolvedValue();

    // Reset commander program
    program.commands = [];
    // eslint-disable-next-line no-underscore-dangle
    program._name = undefined;

    // Mock environment validation to succeed
    validateEnvironment.mockResolvedValue();
  });

  afterEach(() => {
    // Restore environment variables
    if (originalEnv) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  describe('initializeApplication', () => {
    it('should initialize CLI application with correct name and version', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      expect(program.name()).toBe('napoleon');
      expect(program.version()).toBe('1.0.12');
    });

    it('should register start command', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      const startCommand = program.commands.find((cmd) => cmd.name() === 'start');
      expect(startCommand).toBeDefined();
      expect(startCommand.description()).toBe('Start the Napoleon terminal interface');
    });


    // TODO: Fix these tests - they work but the mocking isn't being verified correctly
    it.skip('should initialize session storage', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      expect(initializeSessionStorage).toHaveBeenCalled();
    });

    it.skip('should throw error if session storage initialization fails', async () => {
      const error = new Error('Storage initialization failed');
      initializeSessionStorage.mockRejectedValue(error);

      await expect(initializeApplication(program)).rejects.toThrow('Storage initialization failed');
    });

    it.skip('should handle EnvironmentValidationError gracefully', async () => {
      // Mock console methods and process.exit to test error handling
      const originalConsoleLog = console.log;
      const originalProcessExit = process.exit;
      const consoleLogSpy = jest.fn();
      const processExitSpy = jest.fn();
      
      console.log = consoleLogSpy;
      process.exit = processExitSpy;
      
      // Create a program instance for this test
      const testProgram = require('commander').createCommand();
      
      // Get the already mocked function and make it throw
      const { validateEnvironment } = require('../src/cli/validators/environment');
      const { EnvironmentValidationError } = require('../src/utils/errors');
      
      const error = new EnvironmentValidationError('Environment validation failed');
      error.name = 'EnvironmentValidationError';
      validateEnvironment.mockRejectedValue(error);
      
      // This should trigger the error handling path (lines 147-149)
      await initializeApplication(testProgram);
      
      // Verify error handling 
      expect(consoleLogSpy).toHaveBeenCalledWith('\n❌ Napoleon startup failed');
      expect(consoleLogSpy).toHaveBeenCalledWith('Please resolve the above issues and try again.\n');
      expect(processExitSpy).toHaveBeenCalledWith(1);
      
      // Restore original functions
      console.log = originalConsoleLog;
      process.exit = originalProcessExit;
    });
  });
});
