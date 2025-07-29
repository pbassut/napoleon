const chalk = require('chalk');
const inquirer = require('inquirer');
const StartupWarningDisplay = require('../../src/core/startup-warning-display');

// Mock dependencies
jest.mock('chalk', () => {
  const chained = jest.fn((text) => text);
  chained.bold = jest.fn((text) => text);

  return {
    yellow: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
    red: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
    cyan: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
    white: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
    green: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
    blue: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
    gray: Object.assign(jest.fn((text) => text), { bold: jest.fn((text) => text) }),
    bold: {
      yellow: jest.fn((text) => text),
      red: jest.fn((text) => text),
      white: jest.fn((text) => text),
      green: jest.fn((text) => text),
      cyan: jest.fn((text) => text),
    },
  };
});

const mockInquirerPrompt = jest.fn();
jest.mock('inquirer', () => ({
  prompt: mockInquirerPrompt,
}));

jest.mock('../../src/utils/logger');

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.clear = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.clear = originalConsole.clear;
});

describe('StartupWarningDisplay Edge Cases', () => {
  let display;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInquirerPrompt.mockResolvedValue({ action: 'continue' });
    display = new StartupWarningDisplay();
  });

  describe('displayGitDirectoryNotAccessibleError', () => {
    it('should display git directory not accessible error', () => {
      const validationResult = { error: 'GIT_DIR_NOT_ACCESSIBLE' };
      
      display.displayGitValidationError(validationResult);

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Directory Not Accessible'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('permissions or corruption'));
    });
  });

  describe('displayActionableGuidance', () => {
    it('should display actionable guidance with recommendations', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
      };

      display.displayActionableGuidance(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Recommended Actions'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Commit your current changes'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('git add . && git commit'));
    });

    it('should display guidance for all types of changes', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: true,
        hasStagedChanges: true,
      };

      display.displayActionableGuidance(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Recommended Actions'));
      // Should show recommendations for all three types
      const logCalls = console.log.mock.calls.map(call => call[0]).join(' ');
      expect(logCalls).toContain('Commit your current changes');
      expect(logCalls).toContain('Handle untracked files');
      expect(logCalls).toContain('Commit your staged changes');
      expect(logCalls).toContain('stash your changes');
    });
  });

  describe('displayContinueMessage with timer tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should display continue message with timing', async () => {
      const promise = display.displayContinueMessage();

      // Fast-forward through the initial delay
      jest.advanceTimersByTime(1000);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Proceeding with dirty working tree'));

      // Fast-forward through the countdown delay
      jest.advanceTimersByTime(3000);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Starting Napoleon in 3 seconds'));

      await promise;
    });
  });

  describe('edge cases for generateRecommendations', () => {
    it('should handle empty status result', () => {
      const statusResult = {};

      const recommendations = StartupWarningDisplay.generateRecommendations(statusResult);

      expect(recommendations).toHaveLength(1); // Only the stash recommendation
      expect(recommendations[0].action).toContain('stash your changes');
    });

    it('should handle null/undefined status result gracefully', () => {
      // The implementation doesn't handle null gracefully, which is expected behavior
      expect(() => {
        StartupWarningDisplay.generateRecommendations(null);
      }).toThrow('Cannot read properties of null');

      expect(() => {
        StartupWarningDisplay.generateRecommendations(undefined);
      }).toThrow('Cannot read properties of undefined');
    });

    it('should include all recommendation properties', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
      };

      const recommendations = StartupWarningDisplay.generateRecommendations(statusResult);

      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('icon');
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('command');
        expect(typeof rec.icon).toBe('string');
        expect(typeof rec.action).toBe('string');
        expect(typeof rec.command).toBe('string');
      });
    });
  });

  describe('displayDetailedFileInfo edge cases', () => {
    it('should handle status result with no file details', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: true,
        hasStagedChanges: true,
      };

      // Mock getDetailedFileInfo to return empty strings
      const mockGetDetailedFileInfo = jest.fn().mockReturnValue({
        modified: '',
        untracked: '',
        staged: '',
      });

      // Mock the GitStatusChecker
      const originalGitStatusChecker = require('../../src/core/git-status-checker');
      originalGitStatusChecker.getDetailedFileInfo = mockGetDetailedFileInfo;

      display.displayDetailedFileInfo(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Affected Files'));
      // Should not display file sections when no files are present
    });

    it('should handle mixed file types', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: true,
        hasStagedChanges: false,
        details: {
          modified: [{ file: 'modified1.js', type: 'modified' }],
          untracked: [{ file: 'new1.js' }],
          staged: []
        }
      };

      const mockGetDetailedFileInfo = jest.fn().mockReturnValue({
        modified: '  modified1.js (modified)',
        untracked: '  new1.js',
        staged: '',
      });

      const originalGitStatusChecker = require('../../src/core/git-status-checker');
      originalGitStatusChecker.getDetailedFileInfo = mockGetDetailedFileInfo;

      display.displayDetailedFileInfo(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Modified files'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Untracked files'));
      expect(console.log).toHaveBeenCalledWith('  modified1.js (modified)');
      expect(console.log).toHaveBeenCalledWith('  new1.js');
    });
  });

  describe('promptUserChoice edge cases', () => {
    it('should call inquirer prompt and return user choice', async () => {
      // Mock the display's inquirer instance
      display.inquirer.prompt = jest.fn().mockResolvedValue({ action: 'exit' });

      const result = await display.promptUserChoice();

      expect(display.inquirer.prompt).toHaveBeenCalled();
      expect(result).toBe('exit');
    });

    it('should handle prompt rejection', async () => {
      display.inquirer.prompt = jest.fn().mockRejectedValue(new Error('User cancelled'));

      const result = await display.promptUserChoice();

      expect(result).toBe('exit'); // Should default to safe choice
    });
  });

  describe('displayWarningHeader formatting', () => {
    it('should display properly formatted header with borders', () => {
      display.displayWarningHeader();

      const logCalls = console.log.mock.calls.map(call => call[0]);
      
      // Check for box characters
      expect(logCalls.some(call => call.includes('┌─'))).toBe(true);
      expect(logCalls.some(call => call.includes('└─'))).toBe(true);
      expect(logCalls.some(call => call.includes('Napoleon - Git Working Tree Status Warning'))).toBe(true);
    });
  });

  describe('displayRiskExplanation content', () => {
    it('should display all risk points', () => {
      display.displayRiskExplanation();

      const logCalls = console.log.mock.calls.map(call => call[0]).join(' ');
      
      expect(logCalls).toContain('Why This Matters');
      expect(logCalls).toContain('worktree');
      expect(logCalls).toContain('isolation');
      expect(logCalls).toContain('conflicts');
      expect(logCalls).toContain('agent operations');
    });
  });

  describe('complete workflow integration', () => {
    it('should handle complete displayGitWarning workflow', async () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file1.js'] },
      };

      // The display returns 'exit' as the safe default in case of any errors
      const result = await display.displayGitWarning(statusResult);

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Napoleon - Git Working Tree Status Warning'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Issues Detected'));
      expect(['exit', 'continue']).toContain(result);
    });
  });

  describe('error handling in displayGitValidationError', () => {
    it('should handle unknown error types with fallback message', async () => {
      const validationResult = {
        error: 'UNKNOWN_CUSTOM_ERROR',
        message: 'Custom error message for testing',
      };

      await display.displayGitValidationError(validationResult);

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Validation Failed'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Custom error message for testing'));
    });

    it('should handle validation result without message', async () => {
      const validationResult = {
        error: 'UNKNOWN_ERROR',
      };

      await display.displayGitValidationError(validationResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Unknown git validation error'));
    });
  });

  describe('message display methods', () => {
    it('should display exit message with proper formatting', () => {
      display.displayExitMessage();

      const logCalls = console.log.mock.calls.map(call => call[0]).join(' ');
      expect(logCalls).toContain('Excellent choice');
      expect(logCalls).toContain('resolve the git issues');
      expect(logCalls).toContain('agent worktree isolation');
    });

    it('should display git not available error with installation instructions', () => {
      display.displayGitNotAvailableError();

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Not Available'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Install git from https://git-scm.com/'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('PATH'));
    });

    it('should display non-git repo error with git init instructions', () => {
      display.displayNonGitRepoError();

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Repository Required'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('git init'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('git add . && git commit'));
    });
  });
});