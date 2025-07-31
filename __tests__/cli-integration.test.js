const { program } = require('commander');
const { initializeApplication } = require('../src/cli/index');
const TerminalUI = require('../src/ui/index');

jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn(),
  initializeSessionStorage: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/core/api-key-setup-guide', () => {
  return jest.fn().mockImplementation(() => ({
    displayFormatError: jest.fn(),
    displayMissingApiKeyMessage: jest.fn(),
    displaySetupInstructions: jest.fn()
  }));
});
jest.mock('../src/core/git-status-checker', () => {
  return jest.fn().mockImplementation(() => ({
    validateGitRepository: jest.fn().mockResolvedValue({ isValid: true })
  }));
});
jest.mock('../src/core/startup-warning-display', () => {
  return jest.fn().mockImplementation(() => ({
    displayWarnings: jest.fn()
  }));
});
jest.mock('../src/cli/validators/environment', () => ({
  validateEnvironment: jest.fn().mockResolvedValue(),
  validateApiKey: jest.fn().mockResolvedValue(),
  validateGitWorkingTree: jest.fn().mockResolvedValue()
}));
jest.mock('../src/ui/index', () => {
  return jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
  }));
});

const { loadConfig, initializeSessionStorage } = require('../src/core/config');
const { validateEnvironment } = require('../src/cli/validators/environment');

describe('CLI Integration with Terminal UI', () => {
  let mockTerminalUI;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply config mock after clearAllMocks
    loadConfig.mockReturnValue({
      napoleonDir: '/test/.napoleon',
      sessionStorage: '/test/.napoleon/sessions',
      maxPromptLength: 50
    });
    jest.useFakeTimers();
    
    // Mock session storage
    initializeSessionStorage.mockResolvedValue();
    
    // Reset commander program
    program.commands = [];
    program._name = undefined;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('start command integration', () => {
    it('should register start command correctly', async () => {
      await initializeApplication(program);

      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      expect(startCommand).toBeDefined();
      expect(startCommand.description()).toBe('Start the Napoleon terminal interface');
    });

    it('should have TerminalUI available in CLI module', () => {
      // Test that the TerminalUI module can be required
      const TerminalUIModule = require('../src/ui/index');
      expect(TerminalUIModule).toBeDefined();
      expect(typeof TerminalUIModule).toBe('function');
    });
  });

  describe('command descriptions', () => {
    it('should have correct description for start command', async () => {
      await initializeApplication(program);

      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      expect(startCommand.description()).toBe('Start the Napoleon terminal interface');
    });
  });
});