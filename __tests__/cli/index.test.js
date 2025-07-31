/**
 * Tests for CLI Index Module
 */

// Mock all dependencies BEFORE requiring them
jest.mock('../../src/core/config', () => ({
  initializeSessionStorage: jest.fn().mockResolvedValue(),
  loadConfig: jest.fn().mockReturnValue({ logDir: '/test/logs' })
}));
jest.mock('../../src/cli/validators/environment', () => ({
  validateEnvironment: jest.fn().mockResolvedValue(),
  validateGitWorkingTree: jest.fn().mockResolvedValue(),
  validateApiKey: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/utils/logger');

const { initializeApplication } = require('../../src/cli/index');
const { initializeSessionStorage, loadConfig } = require('../../src/core/config');
const { validateEnvironment } = require('../../src/cli/validators/environment');
const logger = require('../../src/utils/logger');

// Mock dynamic import
const mockTerminalUIClass = {
  initialize: jest.fn(),
};
const mockTerminalUIModule = {
  default: jest.fn(() => mockTerminalUIClass)
};

// Mock the dynamic import function
jest.doMock('../../src/ui/index.ts', () => mockTerminalUIModule, { virtual: true });



describe('CLI Index', () => {
  let mockProgram;
  let originalStdout;
  let originalStderr;
  let mockStdout;
  let mockStderr;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.TERMINAL_UI_MODE;
    
    // Mock program object
    mockProgram = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockReturnThis(),
    };

    // Mock stdout and stderr
    originalStdout = process.stdout.write;
    originalStderr = process.stderr.write;
    mockStdout = jest.fn();
    mockStderr = jest.fn();
    process.stdout.write = mockStdout;
    process.stderr.write = mockStderr;

    // Reset all mocks to their default successful state
    validateEnvironment.mockReset().mockResolvedValue();
    initializeSessionStorage.mockReset().mockResolvedValue();
    loadConfig.mockReset().mockReturnValue({ logDir: '/test/logs' });
    
    // Mock logger methods
    logger.info = jest.fn();
    logger.error = jest.fn();
    
    // Reset TerminalUI mocks
    mockTerminalUIClass.initialize.mockReset().mockResolvedValue();
    mockTerminalUIModule.default.mockReset().mockReturnValue(mockTerminalUIClass);
    

  });

  afterEach(() => {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    // Reset terminal UI mocks for each test
    mockTerminalUIClass.initialize.mockReset().mockResolvedValue();
    mockTerminalUIModule.default.mockReset().mockReturnValue(mockTerminalUIClass);
  });

  describe('initializeApplication', () => {
    describe('Basic initialization', () => {
      it('should initialize application successfully', async () => {
        await initializeApplication(mockProgram);

        expect(validateEnvironment).toHaveBeenCalled();
        expect(initializeSessionStorage).toHaveBeenCalled();
        expect(mockProgram.name).toHaveBeenCalledWith('napoleon');
        expect(mockProgram.description).toHaveBeenCalledWith('Agent Driven Development Manager - CLI tool for managing multiple Claude Code SDK sessions');
        expect(mockProgram.version).toHaveBeenCalledWith('1.0.12');
        expect(logger.info).toHaveBeenCalledWith('CLI application initialized successfully');
      });

      it('should setup start command', async () => {
        await initializeApplication(mockProgram);

        expect(mockProgram.command).toHaveBeenCalledWith('start');
        expect(mockProgram.description).toHaveBeenCalledWith('Start the Napoleon terminal interface');
        expect(mockProgram.action).toHaveBeenCalled();
      });

      it('should setup status command', async () => {
        await initializeApplication(mockProgram);

        expect(mockProgram.command).toHaveBeenCalledWith('status');
        expect(mockProgram.description).toHaveBeenCalledWith('Show current agent status');
        expect(mockProgram.action).toHaveBeenCalled();
      });

      it('should setup default action', async () => {
        await initializeApplication(mockProgram);

        // Default action should be called (the last action call)
        expect(mockProgram.action).toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should log initialization errors', async () => {
        const environmentError = new Error('Environment validation failed');
        validateEnvironment.mockRejectedValue(environmentError);

        await expect(initializeApplication(mockProgram)).rejects.toThrow('Environment validation failed');
        expect(logger.error).toHaveBeenCalledWith('Failed to initialize CLI application', { error: environmentError.message });
      });

      it('should log configuration errors', async () => {
        const configError = new Error('Configuration error');
        initializeSessionStorage.mockRejectedValue(configError);

        await expect(initializeApplication(mockProgram)).rejects.toThrow('Configuration error');
        expect(logger.error).toHaveBeenCalledWith('Failed to initialize CLI application', { error: configError.message });
      });

      it('should rethrow other types of errors', async () => {
        const genericError = new Error('Generic error');
        initializeSessionStorage.mockRejectedValue(genericError);

        await expect(initializeApplication(mockProgram)).rejects.toThrow('Generic error');
        expect(logger.error).toHaveBeenCalledWith('Failed to initialize CLI application', { error: genericError.message });
      });
    });
  });

  describe('Command Actions', () => {
    let startAction;
    let statusAction;
    let defaultAction;

    beforeEach(async () => {
      await initializeApplication(mockProgram);

      // Extract the action functions from the mock calls
      const actionCalls = mockProgram.action.mock.calls;
      startAction = actionCalls[0][0]; // start command action
      statusAction = actionCalls[1][0]; // status command action
      defaultAction = actionCalls[2][0]; // default action
    });

    describe('Start command action', () => {
      it.skip('should start terminal UI successfully', async () => {
        await startAction();

        expect(process.env.TERMINAL_UI_MODE).toBe('true');
        expect(mockTerminalUIModule.default).toHaveBeenCalled();
        expect(mockTerminalUIClass.initialize).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('Terminal UI started successfully');
      });

      it.skip('should handle terminal UI start errors', async () => {
        const uiError = new Error('UI failed to start');
        mockTerminalUIClass.initialize.mockRejectedValue(uiError);

        // Mock process.exit to avoid actually exiting
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

        await startAction();

        expect(logger.error).toHaveBeenCalledWith('Failed to start terminal UI', { 
          error: uiError.message, 
          stack: uiError.stack 
        });
        expect(mockStderr).toHaveBeenCalledWith(`Failed to start terminal interface: ${uiError.message}\n`);
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
      });

      it('should handle dynamic import errors', async () => {
        const importError = new Error('Module not found');
        
        // We need to mock the import to fail
        jest.doMock('../../src/ui/index.ts', () => {
          throw importError;
        }, { virtual: true });

        // Mock process.exit to avoid actually exiting
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

        // Re-require the module to get the updated import behavior
        jest.resetModules();
        const { initializeApplication: newInitializeApplication } = require('../../src/cli/index');
        
        await newInitializeApplication(mockProgram);
        const newStartAction = mockProgram.action.mock.calls[0][0];
        
        await newStartAction();

        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
      });
    });

    describe('Status command action', () => {
      it('should show status information', async () => {
        const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await statusAction();

        expect(mockConsoleLog).toHaveBeenCalledWith('Agent Status:');
        expect(mockConsoleLog).toHaveBeenCalledWith('No active agents');

        mockConsoleLog.mockRestore();
      });
    });

    describe('Default action', () => {
      it.skip('should start terminal UI as default action', async () => {
        await defaultAction();

        expect(process.env.TERMINAL_UI_MODE).toBe('true');
        expect(mockTerminalUIClass.initialize).toHaveBeenCalled();
      });
    });
  });




});