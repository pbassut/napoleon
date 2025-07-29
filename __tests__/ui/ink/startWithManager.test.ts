/**
 * Tests for startWithManager
 * Comprehensive coverage for Ink UI startup with AgentManager integration
 */

// Mock all external dependencies
jest.mock('ink', () => ({
  render: jest.fn(),
}));

jest.mock('react', () => ({
  createElement: jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock createApp - it's imported as createAppDefault
jest.mock('../../../src/ui/ink/createApp', () => {
  return jest.fn(() => Promise.resolve('MockedAppComponent'));
});

// Import mocked modules
import { render } from 'ink';
import React from 'react';
import logger from '../../../src/utils/logger';
import createAppDefault from '../../../src/ui/ink/createApp';
import startInkWithManager from '../../../src/ui/ink/startWithManager';

// Cast mocks for TypeScript
const mockRender = render as jest.MockedFunction<typeof render>;
const mockCreateElement = React.createElement as jest.MockedFunction<typeof React.createElement>;
const mockCreateAppDefault = createAppDefault as jest.MockedFunction<typeof createAppDefault>;

describe('startWithManager', () => {
  let mockAgentManager: any;
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];
  let mockProcess: any;
  
  // Console spy variables
  let consoleLogSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Save original environment
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];
    
    // Setup console spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    // Mock process stdin/stdout properties
    mockProcess = {
      stdin: {
        isTTY: true,
        setRawMode: jest.fn(),
      },
      stdout: {
        isTTY: true,
      },
      on: jest.fn(),
    };
    
    // Override process properties
    Object.defineProperty(process, 'stdin', {
      value: mockProcess.stdin,
      configurable: true,
    });
    
    Object.defineProperty(process, 'stdout', {
      value: mockProcess.stdout,
      configurable: true,
    });
    
    // Mock process.on for exit handler
    jest.spyOn(process, 'on').mockImplementation(() => process);
    
    // Setup default agent manager mock
    mockAgentManager = {
      getActiveAgents: jest.fn().mockReturnValue([]),
      initialize: jest.fn(),
      shutdown: jest.fn(),
    };
    
    // Setup default Ink render response
    mockRender.mockReturnValue({
      waitUntilExit: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
      unmount: jest.fn(),
      rerender: jest.fn(),
    });
    
    // Setup default createApp response
    mockCreateAppDefault.mockResolvedValue('MockedAppComponent' as any);
    
    // Setup default React.createElement
    mockCreateElement.mockReturnValue('MockedElement' as any);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    process.argv = originalArgv;
    
    // Restore console spies
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    
    jest.restoreAllMocks();
  });

  describe('Environment Detection - isInkSupported', () => {
    it('should return true when NAPOLEON_FORCE_INK is set', async () => {
      process.env.NAPOLEON_FORCE_INK = 'true';
      process.env.NODE_ENV = 'test'; // Would normally disable it
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
    });

    it('should return false when NAPOLEON_DISABLE_INK is set', async () => {
      process.env.NAPOLEON_DISABLE_INK = 'true';
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(mockRender).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🖥️  Napoleon Agent Manager');
    });

    it('should return false when stdin is not TTY', async () => {
      mockProcess.stdin.isTTY = false;
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('  • TTY Input: false');
    });

    it('should return false when stdout is not TTY', async () => {
      mockProcess.stdout.isTTY = false;
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('  • TTY Output: false');
    });

    it('should return false when setRawMode is not supported', async () => {
      mockProcess.stdin.setRawMode = undefined;
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Raw Mode: false');
    });

    it('should return false in CI environment', async () => {
      process.env.CI = 'true';
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🖥️  Napoleon Agent Manager');
    });

    it('should return false in CONTINUOUS_INTEGRATION environment', async () => {
      process.env.CONTINUOUS_INTEGRATION = 'true';
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🖥️  Napoleon Agent Manager');
    });

    it('should return false in test environment', async () => {
      process.env.NODE_ENV = 'test';
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Node Env: test');
    });

    it('should return false when NAPOLEON_TEST_MODE is set', async () => {
      process.env.NAPOLEON_TEST_MODE = 'true';
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🖥️  Napoleon Agent Manager');
    });
  });

  describe('Fallback UI', () => {
    beforeEach(() => {
      // Force fallback UI by disabling Ink
      process.env.NAPOLEON_DISABLE_INK = 'true';
    });

    it('should display fallback UI header correctly', async () => {
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🖥️  Napoleon Agent Manager');
      expect(consoleLogSpy).toHaveBeenCalledWith('==============================');
      expect(consoleLogSpy).toHaveBeenCalledWith('Interactive UI not available in this environment.');
    });

    it('should display environment details', async () => {
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Environment details:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • TTY Input: true');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • TTY Output: true');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Raw Mode: true');
    });

    it('should handle NODE_ENV not set', async () => {
      delete process.env.NODE_ENV;
      
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Node Env: not set');
    });

    it('should display "No agents" message when no agents are running', async () => {
      mockAgentManager.getActiveAgents.mockReturnValue([]);
      
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('No agents currently running.');
    });

    it('should list active agents', async () => {
      const mockAgents = [
        { name: 'Agent 1', status: 'running' },
        { name: 'Agent 2', status: 'idle' },
        { name: 'Agent 3', status: 'terminated' },
      ];
      mockAgentManager.getActiveAgents.mockReturnValue(mockAgents);
      
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Current agents:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  1. Agent 1 (running)');
      expect(consoleLogSpy).toHaveBeenCalledWith('  2. Agent 2 (idle)');
      expect(consoleLogSpy).toHaveBeenCalledWith('  3. Agent 3 (terminated)');
    });

    it('should handle agent listing errors', async () => {
      const error = new Error('Agent listing failed');
      mockAgentManager.getActiveAgents.mockImplementation(() => {
        throw error;
      });
      
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Could not list agents:', 'Agent listing failed');
    });

    it('should handle non-Error agent listing failures', async () => {
      mockAgentManager.getActiveAgents.mockImplementation(() => {
        throw 'String error';
      });
      
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Could not list agents:', 'String error');
    });

    it('should display available commands', async () => {
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Available commands:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  napoleon agent spawn "<instructions>" - Create a new agent');
      expect(consoleLogSpy).toHaveBeenCalledWith('  napoleon agent list                  - List all agents');
      expect(consoleLogSpy).toHaveBeenCalledWith('  napoleon agent terminate <id>        - Terminate an agent');
    });

    it('should display usage instructions', async () => {
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('For interactive UI, run Napoleon in a proper terminal environment.');
    });
  });

  describe('Ink UI Startup', () => {
    beforeEach(() => {
      // Enable Ink UI
      delete process.env.NAPOLEON_DISABLE_INK;
      delete process.env.NODE_ENV;
    });

    it('should successfully start Ink UI', async () => {
      await startInkWithManager(mockAgentManager);
      
      expect(logger.info).not.toHaveBeenCalledWith('Ink UI not supported in current environment, using fallback');
      expect(mockCreateAppDefault).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Ink UI closed');
    });

    it('should create React element with AgentManager', async () => {
      await startInkWithManager(mockAgentManager);
      
      expect(mockCreateElement).toHaveBeenCalledWith(
        'MockedAppComponent',
        { agentManager: mockAgentManager }
      );
    });

    it('should pass element to Ink render', async () => {
      const mockElement = 'MockedElement';
      mockCreateElement.mockReturnValue(mockElement);
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockRender).toHaveBeenCalledWith(mockElement, { debug: false });
    });

    it('should setup exit handler for cleanup', async () => {
      const mockClear = jest.fn();
      mockRender.mockReturnValue({
        waitUntilExit: jest.fn().mockResolvedValue(undefined),
        clear: mockClear,
        unmount: jest.fn(),
        rerender: jest.fn(),
      });
      
      await startInkWithManager(mockAgentManager);
      
      expect(process.on).toHaveBeenCalledWith('exit', expect.any(Function));
      
      // Simulate exit event
      const exitHandler = (process.on as jest.Mock).mock.calls.find(call => call[0] === 'exit')?.[1];
      if (exitHandler) {
        exitHandler();
        expect(mockClear).toHaveBeenCalled();
      }
    });

    it('should wait for app to exit', async () => {
      const mockWaitUntilExit = jest.fn().mockResolvedValue(undefined);
      mockRender.mockReturnValue({
        waitUntilExit: mockWaitUntilExit,
        clear: jest.fn(),
        unmount: jest.fn(),
        rerender: jest.fn(),
      });
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockWaitUntilExit).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Enable Ink UI
      delete process.env.NAPOLEON_DISABLE_INK;
      delete process.env.NODE_ENV;
    });

    it('should handle createApp errors', async () => {
      const createAppError = new Error('Failed to create app');
      mockCreateAppDefault.mockRejectedValue(createAppError);
      
      await expect(startInkWithManager(mockAgentManager)).rejects.toThrow('Failed to create app');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to start Ink UI with AgentManager',
        { error: 'Failed to create app' }
      );
    });

    it('should handle Ink render errors', async () => {
      const renderError = new Error('Render failed');
      mockRender.mockImplementation(() => {
        throw renderError;
      });
      
      await expect(startInkWithManager(mockAgentManager)).rejects.toThrow('Render failed');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to start Ink UI with AgentManager',
        { error: 'Render failed' }
      );
    });

    it.skip('should handle raw mode specific errors with fallback', async () => {
      const rawModeError = new Error('Raw mode is not supported on this terminal');
      mockRender.mockImplementation(() => {
        throw rawModeError;
      });
      
      await startInkWithManager(mockAgentManager);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to start Ink UI with AgentManager',
        { error: 'Raw mode is not supported on this terminal' }
      );
      expect(logger.info).toHaveBeenCalledWith('Attempting fallback UI due to raw mode issue');
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🖥️  Napoleon Agent Manager');
    });

    it('should handle waitUntilExit errors', async () => {
      const waitError = new Error('Wait failed');
      mockRender.mockReturnValue({
        waitUntilExit: jest.fn().mockRejectedValue(waitError),
        clear: jest.fn(),
        unmount: jest.fn(),
        rerender: jest.fn(),
      });
      
      await expect(startInkWithManager(mockAgentManager)).rejects.toThrow('Wait failed');
    });

    it.skip('should handle non-Error exceptions', async () => {
      mockRender.mockImplementation(() => {
        throw 'String error';
      });
      
      await expect(startInkWithManager(mockAgentManager)).rejects.toThrow('String error');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to start Ink UI with AgentManager',
        { error: 'String error' }
      );
    });

    it('should handle React.createElement errors', async () => {
      const createElementError = new Error('createElement failed');
      mockCreateElement.mockImplementation(() => {
        throw createElementError;
      });
      
      await expect(startInkWithManager(mockAgentManager)).rejects.toThrow('createElement failed');
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with proper environment', async () => {
      // Setup proper environment
      delete process.env.NAPOLEON_DISABLE_INK;
      delete process.env.NODE_ENV;
      delete process.env.CI;
      
      const mockWaitUntilExit = jest.fn().mockResolvedValue(undefined);
      const mockClear = jest.fn();
      
      mockRender.mockReturnValue({
        waitUntilExit: mockWaitUntilExit,
        clear: mockClear,
        unmount: jest.fn(),
        rerender: jest.fn(),
      });
      
      await startInkWithManager(mockAgentManager);
      
      // Verify the full flow
      expect(mockCreateAppDefault).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalledWith('MockedAppComponent', { agentManager: mockAgentManager });
      expect(mockRender).toHaveBeenCalledWith('MockedElement', { debug: false });
      expect(mockWaitUntilExit).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Ink UI closed');
    });

    it('should work end-to-end with fallback UI', async () => {
      // Force fallback
      mockProcess.stdin.isTTY = false;
      
      const mockAgents = [
        { name: 'Test Agent', status: 'running' }
      ];
      mockAgentManager.getActiveAgents.mockReturnValue(mockAgents);
      
      await startInkWithManager(mockAgentManager);
      
      // Verify fallback flow
      expect(mockCreateAppDefault).not.toHaveBeenCalled();
      expect(mockRender).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('\n🖥️  Napoleon Agent Manager');
      expect(consoleLogSpy).toHaveBeenCalledWith('  1. Test Agent (running)');
      expect(logger.info).toHaveBeenCalledWith('Ink UI not supported in current environment, using fallback');
    });

    it('should handle multiple environment factors', async () => {
      // Multiple disabling factors
      process.env.CI = 'true';
      process.env.NODE_ENV = 'test';
      mockProcess.stdin.isTTY = false;
      
      await startInkWithManager(mockAgentManager);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('  • TTY Input: false');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • Node Env: test');
    });
  });

  describe.skip('Edge Cases', () => {
    it('should handle undefined agent manager methods', async () => {
      const badAgentManager = {};
      
      // Force fallback UI
      process.env.NAPOLEON_DISABLE_INK = 'true';
      
      await expect(startInkWithManager(badAgentManager as any)).rejects.toThrow();
    });

    it('should handle process property changes during execution', async () => {
      // Start with TTY support
      delete process.env.NAPOLEON_DISABLE_INK;
      
      // Change process properties mid-execution
      const originalRender = mockRender.getMockImplementation();
      mockRender.mockImplementation((element) => {
        // Simulate environment change during render
        mockProcess.stdin.isTTY = false;
        return originalRender?.(element) || {
          waitUntilExit: jest.fn().mockResolvedValue(undefined),
          clear: jest.fn(),
          unmount: jest.fn(),
          rerender: jest.fn(),
        };
      });
      
      await startInkWithManager(mockAgentManager);
      
      expect(mockRender).toHaveBeenCalled();
    });

    it('should handle cleanup with missing clear function', async () => {
      delete process.env.NAPOLEON_DISABLE_INK;
      
      // Missing clear function
      mockRender.mockReturnValue({
        waitUntilExit: jest.fn().mockResolvedValue(undefined),
        clear: undefined,
        unmount: jest.fn(),
        rerender: jest.fn(),
      } as any);
      
      await startInkWithManager(mockAgentManager);
      
      // Should still setup exit handler
      expect(process.on).toHaveBeenCalledWith('exit', expect.any(Function));
      
      // Simulate exit - should not crash
      const exitHandler = (process.on as jest.Mock).mock.calls.find(call => call[0] === 'exit')?.[1];
      expect(() => exitHandler && exitHandler()).not.toThrow();
    });
  });
});