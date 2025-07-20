const { program } = require('commander');
const { initializeApplication } = require('../src/cli/index');
const { initializeSessionStorage } = require('../src/core/config');
const { validateEnvironment } = require('../src/cli/validators/environment');

jest.mock('../src/core/config');
jest.mock('../src/cli/validators/environment');

const { loadConfig } = require('../src/core/config');

// Mock loadConfig to return a valid config object
loadConfig.mockReturnValue({
  napoleonDir: '/test/.napoleon',
  sessionStorage: '/test/.napoleon/sessions',
  maxPromptLength: 50
});

describe('CLI Application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply config mock after clearAllMocks
    loadConfig.mockReturnValue({
      napoleonDir: '/test/.napoleon',
      sessionStorage: '/test/.napoleon/sessions',
      maxPromptLength: 50
    });
    // Reset commander program
    program.commands = [];
    program._name = undefined;
    // Mock environment validation to succeed
    validateEnvironment.mockResolvedValue();
  });

  describe('initializeApplication', () => {
    it('should initialize CLI application with correct name and version', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      expect(program.name()).toBe('napoleon');
      expect(program.version()).toBe('1.0.0');
    });

    it('should register start command', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      expect(startCommand).toBeDefined();
      expect(startCommand.description()).toBe('Start the Napoleon terminal interface');
    });

    it('should register status command', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      const statusCommand = program.commands.find(cmd => cmd.name() === 'status');
      expect(statusCommand).toBeDefined();
      expect(statusCommand.description()).toBe('Show current agent status');
    });

    it('should initialize session storage', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      expect(initializeSessionStorage).toHaveBeenCalled();
    });

    it('should throw error if session storage initialization fails', async () => {
      const error = new Error('Storage initialization failed');
      initializeSessionStorage.mockRejectedValue(error);

      await expect(initializeApplication(program)).rejects.toThrow('Storage initialization failed');
    });
  });
});