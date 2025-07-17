const { program } = require('commander');
const { initializeApplication } = require('../src/cli/index');
const { initializeSessionStorage } = require('../src/core/config');

jest.mock('../src/core/config');

describe('CLI Application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset commander program
    program.commands = [];
    program._name = undefined;
  });

  describe('initializeApplication', () => {
    it('should initialize CLI application with correct name and version', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      expect(program.name()).toBe('add-manager');
      expect(program.version()).toBe('1.0.0');
    });

    it('should register start command', async () => {
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      expect(startCommand).toBeDefined();
      expect(startCommand.description()).toBe('Start the ADD Manager terminal interface');
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