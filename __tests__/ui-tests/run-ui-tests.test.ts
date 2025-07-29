import { TestRunner } from '../../src/ui-tests/framework/TestRunner';
import { runAllUITests } from '../../src/ui-tests/run-ui-tests';

// Mock the TestRunner and test suites
jest.mock('../../src/ui-tests/framework/TestRunner');
jest.mock('../../src/ui-tests/tests/framework-validation.test', () => ({
  frameworkValidationTestSuite: {
    name: 'Framework Validation',
    tests: [
      { name: 'test1', fn: jest.fn() },
      { name: 'test2', fn: jest.fn() }
    ]
  }
}));
jest.mock('../../src/ui-tests/tests/navigation.test', () => ({
  navigationTestSuite: {
    name: 'Navigation',
    tests: [
      { name: 'nav1', fn: jest.fn() },
      { name: 'nav2', fn: jest.fn() },
      { name: 'nav3', fn: jest.fn() }
    ]
  }
}));
jest.mock('../../src/ui-tests/tests/agent-management.test', () => ({
  agentManagementTestSuite: {
    name: 'Agent Management',
    tests: [
      { name: 'agent1', fn: jest.fn() }
    ]
  }
}));
jest.mock('../../src/ui-tests/tests/ui-state.test', () => ({
  uiStateTestSuite: {
    name: 'UI State',
    tests: [
      { name: 'state1', fn: jest.fn() },
      { name: 'state2', fn: jest.fn() }
    ]
  }
}));

// Mock console and process methods to suppress output during tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('Process exit called');
});

describe('UI Tests Runner', () => {
  let mockRunnerInstance: jest.Mocked<TestRunner>;

  beforeEach(() => {
    // Only clear TestRunner mocks, not console mocks
    jest.mocked(TestRunner).mockClear();
    
    // Clear console mock call history but keep the mocks active
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
    
    // Create mock instance
    mockRunnerInstance = {
      runSuite: jest.fn()
    } as any;
    
    (TestRunner as jest.MockedClass<typeof TestRunner>).mockImplementation(() => mockRunnerInstance);
  });

  afterEach(() => {
    // Only clear TestRunner related mocks
    jest.mocked(TestRunner).mockClear();
  });

  describe('runAllUITests function', () => {
    it('should create TestRunner instance', async () => {
      mockRunnerInstance.runSuite.mockResolvedValue(undefined);

      await runAllUITests();

      expect(TestRunner).toHaveBeenCalledTimes(1);
    });

    it('should log startup message', async () => {
      mockRunnerInstance.runSuite.mockResolvedValue(undefined);

      await runAllUITests();

      // Debug: Check if mock was called at all
      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('🚀 Starting Napoleon UI Tests\n');
    });

    it('should run all test suites', async () => {
      mockRunnerInstance.runSuite.mockResolvedValue(undefined);

      await runAllUITests();

      expect(mockRunnerInstance.runSuite).toHaveBeenCalledTimes(4);
    });

    it('should run suites in correct order', async () => {
      mockRunnerInstance.runSuite.mockResolvedValue(undefined);

      await runAllUITests();

      const calls = mockRunnerInstance.runSuite.mock.calls;
      expect(calls[0][0].name).toBe('Framework Validation');
      expect(calls[1][0].name).toBe('Navigation');
      expect(calls[2][0].name).toBe('Agent Management');
      expect(calls[3][0].name).toBe('UI State');
    });

    it('should count total passed tests correctly', async () => {
      mockRunnerInstance.runSuite.mockResolvedValue(undefined);

      await runAllUITests();

      expect(mockConsoleLog).toHaveBeenCalledWith('   Total Tests: 8');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Passed: 8');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Failed: 0');
    });

    it('should handle suite execution errors and count failures', async () => {
      const error = new Error('Suite failed: 2 test(s) failed');
      mockRunnerInstance.runSuite
        .mockResolvedValueOnce(undefined) // First suite passes
        .mockRejectedValueOnce(error)     // Second suite fails
        .mockResolvedValueOnce(undefined) // Third suite passes
        .mockResolvedValueOnce(undefined); // Fourth suite passes

      await runAllUITests();

      expect(mockConsoleLog).toHaveBeenCalledWith('   Total Tests: 8');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Passed: 6');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Failed: 2');
    });

    it('should handle non-Error objects in catch block', async () => {
      const nonError = 'String error';
      mockRunnerInstance.runSuite
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(nonError);

      await runAllUITests();

      // Should still complete without crashing
      expect(mockConsoleLog).toHaveBeenCalledWith('   Total Tests: 8');
    });

    it('should display summary with timing information', async () => {
      mockRunnerInstance.runSuite.mockResolvedValue(undefined);

      await runAllUITests();

      expect(mockConsoleLog).toHaveBeenCalledWith('\n📈 Overall Summary:');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Total Tests: 8');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Passed: 8');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Failed: 0');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/   Total Duration: \d+\.\d{2}s/));
    });

    it('should exit with code 1 when tests fail', async () => {
      const error = new Error('Suite failed: 1 test(s) failed');
      mockRunnerInstance.runSuite
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(error);

      await expect(runAllUITests()).rejects.toThrow('Process exit called');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should not exit when all tests pass', async () => {
      mockRunnerInstance.runSuite.mockResolvedValue(undefined);

      await runAllUITests();

      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('should handle multiple failed suites', async () => {
      const error1 = new Error('Suite failed: 1 test(s) failed');
      const error2 = new Error('Suite failed: 3 test(s) failed');
      
      mockRunnerInstance.runSuite
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await runAllUITests();

      expect(mockConsoleLog).toHaveBeenCalledWith('   Failed: 4');
      expect(mockConsoleLog).toHaveBeenCalledWith('   Passed: 4');
    });

    it('should handle regex match failure gracefully', async () => {
      const error = new Error('Suite failed but no count');
      mockRunnerInstance.runSuite
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(error);

      await runAllUITests();

      // Should not crash and should still show summary
      expect(mockConsoleLog).toHaveBeenCalledWith('\n📈 Overall Summary:');
    });

    it('should calculate timing correctly', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));

      mockRunnerInstance.runSuite.mockImplementation(async () => {
        jest.advanceTimersByTime(1500); // Advance by 1.5 seconds
        return undefined;
      });

      const promise = runAllUITests();
      jest.runAllTimers();
      await promise;

      expect(mockConsoleLog).toHaveBeenCalledWith('   Total Duration: 6.00s');

      jest.useRealTimers();
    });
  });

  describe('Module execution', () => {
    it('should be callable as a module', () => {
      // Test that the function is exported and can be imported
      expect(typeof runAllUITests).toBe('function');
    });

    it('should handle direct execution error gracefully', async () => {
      // Mock require.main to simulate direct execution
      const originalMain = require.main;
      require.main = module;

      const error = new Error('Test execution error');
      mockRunnerInstance.runSuite.mockRejectedValue(error);

      // Import and run the module
      const runUITestsModule = require('../../src/ui-tests/run-ui-tests');

      // Should handle errors without crashing
      expect(runUITestsModule.runAllUITests).toBeDefined();

      // Restore original main
      require.main = originalMain;
    });
  });

  describe('Error handling', () => {
    it('should handle async errors in suite execution', async () => {
      const asyncError = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Async suite error: 2 test(s) failed')), 10);
      });

      mockRunnerInstance.runSuite
        .mockResolvedValueOnce(undefined)
        .mockImplementationOnce(() => asyncError);

      await runAllUITests();

      expect(mockConsoleLog).toHaveBeenCalledWith('   Failed: 2');
    });

    it('should handle malformed error messages', async () => {
      const malformedError = new Error('This error has no test count pattern');
      mockRunnerInstance.runSuite
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(malformedError);

      await runAllUITests();

      // Should not add to failed count if pattern doesn't match
      expect(mockConsoleLog).toHaveBeenCalledWith('   Failed: 0');
    });

    it('should handle zero failed tests in error message', async () => {
      const zeroFailedError = new Error('Suite completed: 0 test(s) failed');
      mockRunnerInstance.runSuite
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(zeroFailedError);

      await runAllUITests();

      expect(mockConsoleLog).toHaveBeenCalledWith('   Failed: 0');
    });
  });
});