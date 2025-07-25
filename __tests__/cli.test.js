const { program } = require('commander');
const { initializeApplication } = require('../src/cli/index');

jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn(),
  initializeSessionStorage: jest.fn(),
}));
// Mock dependencies of validators
jest.mock('../src/core/api-key-validator', () => {
  return jest.fn().mockImplementation(() => ({
    validateApiKey: jest.fn().mockResolvedValue(),
  }));
});

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

const { loadConfig } = require('../src/core/config');

// Mock loadConfig to return a valid config object
loadConfig.mockReturnValue({
  napoleonDir: '/test/.napoleon',
  sessionStorage: '/test/.napoleon/sessions',
  maxPromptLength: 50
});

describe('CLI Application', () => {
  let originalEnv;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Save and mock environment variables
    originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    
    // Get mocked functions
    const { loadConfig, initializeSessionStorage } = require('../src/core/config');
    const { validateEnvironment } = require('../src/cli/validators/environment');
    
    // Re-apply config mock after clearAllMocks
    loadConfig.mockReturnValue({
      napoleonDir: '/test/.napoleon',
      sessionStorage: '/test/.napoleon/sessions',
      maxPromptLength: 50
    });
    
    // Re-apply initializeSessionStorage mock after clearAllMocks
    initializeSessionStorage.mockResolvedValue();
    
    // Reset commander program
    program.commands = [];
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
      const { initializeSessionStorage } = require('../src/core/config');
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      expect(program.name()).toBe('napoleon');
      expect(program.version()).toBe('1.0.0');
    });

    it('should register start command', async () => {
      const { initializeSessionStorage } = require('../src/core/config');
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      expect(startCommand).toBeDefined();
      expect(startCommand.description()).toBe('Start the Napoleon terminal interface');
    });

    it('should register status command', async () => {
      const { initializeSessionStorage } = require('../src/core/config');
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      const statusCommand = program.commands.find(cmd => cmd.name() === 'status');
      expect(statusCommand).toBeDefined();
      expect(statusCommand.description()).toBe('Show current agent status');
    });

    it('should initialize session storage', async () => {
      const { initializeSessionStorage } = require('../src/core/config');
      initializeSessionStorage.mockResolvedValue();

      await initializeApplication(program);

      expect(initializeSessionStorage).toHaveBeenCalled();
    });

    it('should throw error if session storage initialization fails', async () => {
      const { initializeSessionStorage } = require('../src/core/config');
      const error = new Error('Storage initialization failed');
      initializeSessionStorage.mockRejectedValue(error);

      await expect(initializeApplication(program)).rejects.toThrow('Storage initialization failed');
    });
  });
});