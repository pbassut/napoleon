const { program } = require('commander');
const { initializeApplication } = require('../src/cli/index');
const { initializeSessionStorage } = require('../src/core/config');
const { validateEnvironment } = require('../src/cli/validators/environment');
const TerminalUI = require('../src/ui/index');

jest.mock('../src/core/config');
jest.mock('../src/cli/validators/environment');
jest.mock('../src/ui/index');

const { loadConfig } = require('../src/core/config');

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
    
    // Mock TerminalUI
    mockTerminalUI = {
      initialize: jest.fn().mockResolvedValue(),
    };
    // TerminalUI is a module, not a constructor, so we mock its methods directly
    Object.assign(TerminalUI, mockTerminalUI);
    
    // Mock session storage
    initializeSessionStorage.mockResolvedValue();
    
    // Mock environment validation to succeed
    validateEnvironment.mockResolvedValue();
    
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