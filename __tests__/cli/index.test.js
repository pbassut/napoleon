/**
 * Tests for CLI Index Module
 */

const { initializeApplication } = require('../../src/cli/index');
const { initializeSessionStorage, loadConfig } = require('../../src/core/config');
const { validateEnvironment } = require('../../src/cli/validators/environment');
const logger = require('../../src/utils/logger');

// Mock all dependencies
jest.mock('../../src/core/config');
jest.mock('../../src/cli/validators/environment', () => ({
  validateEnvironment: jest.fn(),
  validateGitWorkingTree: jest.fn(),
  validateApiKey: jest.fn(),
}));
jest.mock('../../src/utils/logger');

// Mock dynamic import
const mockTerminalUIClass = {
  initialize: jest.fn(),
};
const mockTerminalUIModule = {
  default: jest.fn(() => mockTerminalUIClass)
};

// Mock the ES module import
jest.mock('../../src/ui/index.ts', () => mockTerminalUIModule, { virtual: true });

// Mock LogsCommand
const mockLogsCommand = {
  listLogs: jest.fn(),
  viewLog: jest.fn(),
  searchLogs: jest.fn(),
  searchByPrompt: jest.fn(),
};
const MockLogsCommandClass = jest.fn(() => mockLogsCommand);

jest.mock('../../src/cli/commands/logs', () => MockLogsCommandClass);

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

    // Setup default mocks
    validateEnvironment.mockResolvedValue();
    initializeSessionStorage.mockResolvedValue();
    loadConfig.mockReturnValue({ logDir: '/test/logs' });
    
    // Mock logger methods
    logger.info = jest.fn();
    logger.error = jest.fn();
    
    mockTerminalUIClass.initialize.mockResolvedValue();
  });

  afterEach(() => {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  });

  describe('initializeApplication', () => {
    describe('Basic initialization', () => {
      it('should initialize application successfully', async () => {
        await initializeApplication(mockProgram);

        expect(validateEnvironment).toHaveBeenCalled();
        expect(initializeSessionStorage).toHaveBeenCalled();
        expect(mockProgram.name).toHaveBeenCalledWith('napoleon');
        expect(mockProgram.description).toHaveBeenCalledWith('Agent Driven Development Manager - CLI tool for managing multiple Claude Code SDK sessions');
        expect(mockProgram.version).toHaveBeenCalledWith('1.0.0');
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

      it('should setup logs list command', async () => {
        await initializeApplication(mockProgram);

        expect(mockProgram.command).toHaveBeenCalledWith('logs list');
        expect(mockProgram.description).toHaveBeenCalledWith('List all agent logs');
        expect(mockProgram.option).toHaveBeenCalledWith('-l, --limit <number>', 'limit number of logs shown', expect.any(Function));
        expect(mockProgram.option).toHaveBeenCalledWith('-f, --format <format>', 'output format (table|json)', 'table');
      });

      it('should setup logs view command', async () => {
        await initializeApplication(mockProgram);

        expect(mockProgram.command).toHaveBeenCalledWith('logs view <identifier>');
        expect(mockProgram.description).toHaveBeenCalledWith('View a specific log file');
        expect(mockProgram.option).toHaveBeenCalledWith('-t, --tail <number>', 'show last N lines', expect.any(Function));
        expect(mockProgram.option).toHaveBeenCalledWith('-f, --follow', 'follow log file like tail -f');
        expect(mockProgram.option).toHaveBeenCalledWith('-r, --raw', 'show raw log entries without formatting');
      });

      it('should setup logs search command', async () => {
        await initializeApplication(mockProgram);

        expect(mockProgram.command).toHaveBeenCalledWith('logs search <term>');
        expect(mockProgram.description).toHaveBeenCalledWith('Search across all logs for a term');
        expect(mockProgram.option).toHaveBeenCalledWith('--from <date>', 'search from date (YYYY-MM-DD)');
        expect(mockProgram.option).toHaveBeenCalledWith('--to <date>', 'search to date (YYYY-MM-DD)');
        expect(mockProgram.option).toHaveBeenCalledWith('-c, --context <number>', 'lines of context around matches', expect.any(Function), 2);
      });

      it('should setup logs prompt command', async () => {
        await initializeApplication(mockProgram);

        expect(mockProgram.command).toHaveBeenCalledWith('logs prompt <keyword>');
        expect(mockProgram.description).toHaveBeenCalledWith('Find logs by prompt keywords');
        expect(mockProgram.option).toHaveBeenCalledWith('-l, --limit <number>', 'limit number of results', expect.any(Function));
      });

      it('should setup default action', async () => {
        await initializeApplication(mockProgram);

        // Default action should be called (the last action call)
        expect(mockProgram.action).toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should handle environment validation errors', async () => {
        const environmentError = new Error('Environment validation failed');
        environmentError.name = 'EnvironmentValidationError';
        validateEnvironment.mockRejectedValue(environmentError);

        // Mock process.exit to avoid actually exiting
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await initializeApplication(mockProgram);

        expect(logger.error).toHaveBeenCalledWith('Failed to initialize CLI application', { error: environmentError.message });
        expect(mockConsoleLog).toHaveBeenCalledWith('\n❌ Napoleon startup failed');
        expect(mockConsoleLog).toHaveBeenCalledWith('Please resolve the above issues and try again.\n');
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
        mockConsoleLog.mockRestore();
      });

      it('should handle configuration errors', async () => {
        const configError = new Error('Configuration error');
        configError.name = 'ConfigurationError';
        initializeSessionStorage.mockRejectedValue(configError);

        // Mock process.exit to avoid actually exiting
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

        await initializeApplication(mockProgram);

        expect(logger.error).toHaveBeenCalledWith('Failed to initialize CLI application', { error: configError.message });
        expect(mockConsoleLog).toHaveBeenCalledWith('\n❌ Napoleon startup failed');
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
        mockConsoleLog.mockRestore();
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
    let logsListAction;
    let logsViewAction;
    let logsSearchAction;
    let logsPromptAction;
    let defaultAction;

    beforeEach(async () => {
      await initializeApplication(mockProgram);

      // Extract the action functions from the mock calls
      const actionCalls = mockProgram.action.mock.calls;
      startAction = actionCalls[0][0]; // start command action
      statusAction = actionCalls[1][0]; // status command action
      logsListAction = actionCalls[2][0]; // logs list action
      logsViewAction = actionCalls[3][0]; // logs view action
      logsSearchAction = actionCalls[4][0]; // logs search action
      logsPromptAction = actionCalls[5][0]; // logs prompt action
      defaultAction = actionCalls[6][0]; // default action
    });

    describe('Start command action', () => {
      it('should start terminal UI successfully', async () => {
        await startAction();

        expect(process.env.TERMINAL_UI_MODE).toBe('true');
        expect(mockTerminalUIModule.default).toHaveBeenCalled();
        expect(mockTerminalUIClass.initialize).toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith('Terminal UI started successfully');
      });

      it('should handle terminal UI start errors', async () => {
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

    describe('Logs list command action', () => {
      it('should execute logs list command successfully', async () => {
        const options = { limit: 10, format: 'table' };

        await logsListAction(options);

        expect(loadConfig).toHaveBeenCalled();
        expect(MockLogsCommandClass).toHaveBeenCalledWith({ logDir: '/test/logs' });
        expect(mockLogsCommand.listLogs).toHaveBeenCalledWith(options);
      });

      it('should handle logs list command errors', async () => {
        const logsError = new Error('Logs command failed');
        mockLogsCommand.listLogs.mockRejectedValue(logsError);

        // Mock process.exit and console.error
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        await logsListAction({});

        expect(mockConsoleError).toHaveBeenCalledWith(`Error: ${logsError.message}`);
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
        mockConsoleError.mockRestore();
      });
    });

    describe('Logs view command action', () => {
      it('should execute logs view command successfully', async () => {
        const identifier = 'agent-123';
        const options = { tail: 50, follow: true, raw: false };

        await logsViewAction(identifier, options);

        expect(loadConfig).toHaveBeenCalled();
        expect(MockLogsCommandClass).toHaveBeenCalledWith({ logDir: '/test/logs' });
        expect(mockLogsCommand.viewLog).toHaveBeenCalledWith(identifier, options);
      });

      it('should handle logs view command errors', async () => {
        const viewError = new Error('View command failed');
        mockLogsCommand.viewLog.mockRejectedValue(viewError);

        // Mock process.exit and console.error
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        await logsViewAction('agent-123', {});

        expect(mockConsoleError).toHaveBeenCalledWith(`Error: ${viewError.message}`);
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
        mockConsoleError.mockRestore();
      });
    });

    describe('Logs search command action', () => {
      it('should execute logs search command successfully', async () => {
        const term = 'error';
        const options = { from: '2023-01-01', to: '2023-01-31', context: 5 };

        await logsSearchAction(term, options);

        expect(loadConfig).toHaveBeenCalled();
        expect(MockLogsCommandClass).toHaveBeenCalledWith({ logDir: '/test/logs' });
        expect(mockLogsCommand.searchLogs).toHaveBeenCalledWith(term, options);
      });

      it('should handle logs search command errors', async () => {
        const searchError = new Error('Search command failed');
        mockLogsCommand.searchLogs.mockRejectedValue(searchError);

        // Mock process.exit and console.error
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        await logsSearchAction('error', {});

        expect(mockConsoleError).toHaveBeenCalledWith(`Error: ${searchError.message}`);
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
        mockConsoleError.mockRestore();
      });
    });

    describe('Logs prompt command action', () => {
      it('should execute logs prompt command successfully', async () => {
        const keyword = 'test';
        const options = { limit: 20 };

        await logsPromptAction(keyword, options);

        expect(loadConfig).toHaveBeenCalled();
        expect(MockLogsCommandClass).toHaveBeenCalledWith({ logDir: '/test/logs' });
        expect(mockLogsCommand.searchByPrompt).toHaveBeenCalledWith(keyword, options);
      });

      it('should handle logs prompt command errors', async () => {
        const promptError = new Error('Prompt command failed');
        mockLogsCommand.searchByPrompt.mockRejectedValue(promptError);

        // Mock process.exit and console.error
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        await logsPromptAction('test', {});

        expect(mockConsoleError).toHaveBeenCalledWith(`Error: ${promptError.message}`);
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
        mockConsoleError.mockRestore();
      });
    });

    describe('Default action', () => {
      it('should start terminal UI as default action', async () => {
        await defaultAction();

        expect(process.env.TERMINAL_UI_MODE).toBe('true');
        expect(mockTerminalUIClass.initialize).toHaveBeenCalled();
      });
    });
  });

  describe('Option parsing functions', () => {
    it('should parse limit option correctly', async () => {
      await initializeApplication(mockProgram);

      // Get the limit option parser from the mock calls
      const limitOptionCall = mockProgram.option.mock.calls.find(call => 
        call[0] === '-l, --limit <number>'
      );
      const limitParser = limitOptionCall[2];

      expect(limitParser('10')).toBe(10);
      expect(limitParser('50')).toBe(50);
      expect(limitParser('abc')).toBe(NaN);
    });

    it('should parse tail option correctly', async () => {
      await initializeApplication(mockProgram);

      // Get the tail option parser from the mock calls
      const tailOptionCall = mockProgram.option.mock.calls.find(call => 
        call[0] === '-t, --tail <number>'
      );
      const tailParser = tailOptionCall[2];

      expect(tailParser('25')).toBe(25);
      expect(tailParser('100')).toBe(100);
      expect(tailParser('invalid')).toBe(NaN);
    });

    it('should parse context option correctly', async () => {
      await initializeApplication(mockProgram);

      // Get the context option parser from the mock calls
      const contextOptionCall = mockProgram.option.mock.calls.find(call => 
        call[0] === '-c, --context <number>'
      );
      const contextParser = contextOptionCall[2];

      expect(contextParser('3')).toBe(3);
      expect(contextParser('5')).toBe(5);
      expect(contextParser('text')).toBe(NaN);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing config gracefully', async () => {
      loadConfig.mockReturnValue(null);

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await initializeApplication(mockProgram);
      const logsListAction = mockProgram.action.mock.calls[2][0];

      await logsListAction({});

      expect(MockLogsCommandClass).toHaveBeenCalledWith(null);

      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should handle config loading errors', async () => {
      const configError = new Error('Config loading failed');
      loadConfig.mockImplementation(() => {
        throw configError;
      });

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      await initializeApplication(mockProgram);
      const logsListAction = mockProgram.action.mock.calls[2][0];

      await logsListAction({});

      expect(mockConsoleError).toHaveBeenCalledWith(`Error: ${configError.message}`);
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should handle empty options objects', async () => {
      await initializeApplication(mockProgram);
      const logsListAction = mockProgram.action.mock.calls[2][0];

      await logsListAction({});

      expect(mockLogsCommand.listLogs).toHaveBeenCalledWith({});
    });

    it('should handle undefined options', async () => {
      await initializeApplication(mockProgram);
      const logsViewAction = mockProgram.action.mock.calls[3][0];

      await logsViewAction('test-id', undefined);

      expect(mockLogsCommand.viewLog).toHaveBeenCalledWith('test-id', undefined);
    });
  });
});