const { program } = require('commander');
const { initializeApplication } = require('../src/cli/index');

// Mock all dependencies
jest.mock('../src/core/config', () => ({
  loadConfig: jest.fn().mockReturnValue({
    napoleonDir: '/test/.napoleon',
    sessionStorage: '/test/.napoleon/sessions',
    maxPromptLength: 50
  }),
  initializeSessionStorage: jest.fn().mockResolvedValue(),
}));

jest.mock('../src/cli/validators/environment', () => ({
  validateEnvironment: jest.fn().mockResolvedValue(),
}));

jest.mock('../src/core/api-key-validator', () => {
  return jest.fn().mockImplementation(() => ({
    validateApiKey: jest.fn().mockResolvedValue(),
  }));
});

jest.mock('../src/ui/index.ts', () => ({
  default: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(),
  })),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('CLI Default Action', () => {
  let originalEnv;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Save and mock environment variables
    originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    
    // Reset commander program
    program.commands = [];
    program._name = undefined;
    program._defaultCommandAction = undefined;
  });
  
  afterEach(() => {
    // Restore environment variables
    if (originalEnv) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it('should set default action to start terminal UI', async () => {
    await initializeApplication(program);
    
    // Check that default action is set (Commander.js uses _actionHandler for default actions)
    const hasDefaultAction = program._actionHandler || program._defaultCommandAction || program._action;
    expect(hasDefaultAction).toBeDefined();
    expect(typeof hasDefaultAction).toBe('function');
  });

  it('should still register start command alongside default action', async () => {
    await initializeApplication(program);
    
    const startCommand = program.commands.find(cmd => cmd.name() === 'start');
    expect(startCommand).toBeDefined();
    expect(startCommand.description()).toBe('Start the Napoleon terminal interface');
  });

  it('should register all expected commands', async () => {
    await initializeApplication(program);
    
    const commandNames = program.commands.map(cmd => cmd.name());
    expect(commandNames).toContain('start');
    expect(commandNames).toContain('status');
    expect(commandNames).toContain('logs');
  });
});