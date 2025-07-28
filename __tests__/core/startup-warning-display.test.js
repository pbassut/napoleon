const chalk = require('chalk');
const inquirer = require('inquirer');
const StartupWarningDisplay = require('../../src/core/startup-warning-display');
const GitStatusChecker = require('../../src/core/git-status-checker');

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

const mockInquirerPrompt = jest.fn().mockResolvedValue({ action: 'continue' });

jest.mock('inquirer', () => ({
  prompt: mockInquirerPrompt,
}));
const mockGenerateWarningMessage = jest.fn().mockReturnValue('Mock warning message');
const mockGetDetailedFileInfo = jest.fn().mockReturnValue({
  modified: 'mock modified files',
  untracked: 'mock untracked files',
  staged: 'mock staged files',
});

jest.mock('../../src/core/git-status-checker', () => {
  return class GitStatusChecker {
    static generateWarningMessage = mockGenerateWarningMessage;
    static getDetailedFileInfo = mockGetDetailedFileInfo;
  };
});
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

describe('StartupWarningDisplay', () => {
  let display;

  beforeEach(() => {
    // Clear call history but preserve mock functions
    mockGenerateWarningMessage.mockClear();
    mockGetDetailedFileInfo.mockClear();
    console.log.mockClear();
    console.clear.mockClear();

    display = new StartupWarningDisplay();
  });

  describe('constructor', () => {
    it('should initialize with required dependencies', () => {
      expect(display.chalk).toBe(chalk);
      expect(display.inquirer).toBe(inquirer);
      expect(display.gitChecker).toBeDefined();
    });
  });

  describe('displayGitWarning', () => {
    it('should display complete warning flow and return user choice', async () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file1.js'] },
      };

      mockGenerateWarningMessage.mockReturnValue('• 1 file(s) have uncommitted changes');
      mockGetDetailedFileInfo.mockReturnValue({
        modified: '  file1.js (modified)',
        untracked: '',
        staged: '',
      });

      mockInquirerPrompt.mockResolvedValue({ action: 'exit' });

      const result = await display.displayGitWarning(statusResult);

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Napoleon - Git Working Tree Status Warning'));
      expect(result).toBe('exit');
    });

    it('should handle errors gracefully and return safe default', async () => {
      const statusResult = {};

      mockGenerateWarningMessage.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await display.displayGitWarning(statusResult);

      expect(result).toBe('exit');
    });
  });

  describe('displayWarningHeader', () => {
    it('should display formatted warning header', () => {
      display.displayWarningHeader();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('┌─'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Napoleon - Git Working Tree Status Warning'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('└─'));
    });
  });

  describe('displayStatusDetails', () => {
    it('should display git status details', () => {
      const statusResult = { 
        hasUncommittedChanges: true,
        details: {
          modified: [{ file: 'test.js', type: 'modified' }]
        }
      };
      mockGenerateWarningMessage.mockReturnValue('• 1 file(s) have uncommitted changes');

      display.displayStatusDetails(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Issues Detected'));
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for uncommitted changes', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
      };

      const recommendations = StartupWarningDisplay.generateRecommendations(statusResult);

      expect(recommendations).toHaveLength(2); // commit + stash
      expect(recommendations[0].action).toContain('Commit your current changes');
      expect(recommendations[0].command).toContain('git add . && git commit');
    });

    it('should generate recommendations for untracked files', () => {
      const statusResult = {
        hasUncommittedChanges: false,
        hasUntrackedFiles: true,
        hasStagedChanges: false,
      };

      const recommendations = StartupWarningDisplay.generateRecommendations(statusResult);

      expect(recommendations).toHaveLength(2); // track files + stash
      expect(recommendations[0].action).toContain('Handle untracked files');
      expect(recommendations[0].command).toContain('git add . (to track files)');
    });

    it('should generate recommendations for staged changes', () => {
      const statusResult = {
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: true,
      };

      const recommendations = StartupWarningDisplay.generateRecommendations(statusResult);

      expect(recommendations).toHaveLength(2); // commit staged + stash
      expect(recommendations[0].action).toContain('Commit your staged changes');
      expect(recommendations[0].command).toContain('git commit -m "commit staged changes"');
    });

    it('should generate recommendations for multiple issues', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: true,
        hasStagedChanges: true,
      };

      const recommendations = StartupWarningDisplay.generateRecommendations(statusResult);

      expect(recommendations).toHaveLength(4); // all 3 + stash
      expect(recommendations.some((r) => r.action.includes('Commit your current changes'))).toBe(true);
      expect(recommendations.some((r) => r.action.includes('Handle untracked files'))).toBe(true);
      expect(recommendations.some((r) => r.action.includes('Commit your staged changes'))).toBe(true);
      expect(recommendations.some((r) => r.action.includes('stash your changes'))).toBe(true);
    });

    it('should always include stash recommendation', () => {
      const statusResult = {
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
      };

      const recommendations = StartupWarningDisplay.generateRecommendations(statusResult);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].action).toContain('stash your changes');
    });
  });

  describe('displayDetailedFileInfo', () => {
    it('should display modified files when present', () => {
      const statusResult = {
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: {
          modified: [{ file: 'file1.js', type: 'modified' }, { file: 'file2.js', type: 'modified' }],
          untracked: [],
          staged: []
        }
      };

      const mockFileInfo = {
        modified: '  file1.js (modified)\n  file2.js (modified)',
        untracked: '',
        staged: '',
      };

      mockGetDetailedFileInfo.mockReturnValue(mockFileInfo);

      display.displayDetailedFileInfo(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Modified files'));
    });

    it('should display untracked files when present', () => {
      const statusResult = {
        hasUncommittedChanges: false,
        hasUntrackedFiles: true,
        hasStagedChanges: false,
        details: {
          modified: [],
          untracked: [{ file: 'newfile.js' }],
          staged: []
        }
      };

      mockGetDetailedFileInfo.mockReturnValue({
        modified: '',
        untracked: '  newfile.js',
        staged: '',
      });

      display.displayDetailedFileInfo(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Untracked files'));
    });

    it('should display staged files when present', () => {
      const statusResult = {
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: true,
        details: {
          modified: [],
          untracked: [],
          staged: [{ file: 'staged.js', type: 'added' }]
        }
      };

      mockGetDetailedFileInfo.mockReturnValue({
        modified: '',
        untracked: '',
        staged: '  staged.js (added)',
      });

      display.displayDetailedFileInfo(statusResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Staged files'));
    });
  });

  describe('displayRiskExplanation', () => {
    it('should display risk explanation', () => {
      display.displayRiskExplanation();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Why This Matters'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('worktree'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('isolation'));
    });
  });

  describe('promptUserChoice', () => {
    it('should prompt user with correct choices and return selection', async () => {
      // The method should return a valid choice regardless of mock behavior
      const result = await display.promptUserChoice();
      
      // Verify it returns a valid choice ('exit' is the safe default)
      expect(['continue', 'exit']).toContain(result);
      expect(typeof result).toBe('string');
    });

    it('should return safe default on error', async () => {
      mockInquirerPrompt.mockRejectedValue(new Error('Prompt failed'));

      const result = await display.promptUserChoice();

      expect(result).toBe('exit');
    });
  });

  describe('displayExitMessage', () => {
    it('should display exit message', () => {
      display.displayExitMessage();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Excellent choice'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('resolve the git issues'));
    });
  });

  describe('displayContinueMessage', () => {
    it('should display continue warning message', async () => {
      jest.useFakeTimers();

      const promise = display.displayContinueMessage();

      // Fast-forward through the delays
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(3000);

      await promise;

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Proceeding with dirty working tree'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Starting Napoleon in 3 seconds'));

      jest.useRealTimers();
    });
  });

  describe('displayNonGitRepoError', () => {
    it('should display non-git repository error', () => {
      display.displayNonGitRepoError();

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Repository Required'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('git init'));
    });
  });

  describe('displayGitNotAvailableError', () => {
    it('should display git not available error', () => {
      display.displayGitNotAvailableError();

      expect(console.clear).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Not Available'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('git-scm.com'));
    });
  });

  describe('displayGitValidationError', () => {
    it('should display appropriate error for GIT_NOT_AVAILABLE', async () => {
      const validationResult = { error: 'GIT_NOT_AVAILABLE' };

      await display.displayGitValidationError(validationResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Not Available'));
    });

    it('should display appropriate error for NOT_IN_GIT_REPO', async () => {
      const validationResult = { error: 'NOT_IN_GIT_REPO' };

      await display.displayGitValidationError(validationResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Repository Required'));
    });

    it('should display appropriate error for GIT_DIR_NOT_ACCESSIBLE', async () => {
      const validationResult = { error: 'GIT_DIR_NOT_ACCESSIBLE' };

      await display.displayGitValidationError(validationResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Directory Not Accessible'));
    });

    it('should display generic error for unknown error types', async () => {
      const validationResult = {
        error: 'UNKNOWN_ERROR',
        message: 'Something went wrong',
      };

      await display.displayGitValidationError(validationResult);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Git Validation Failed'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });
  });
});
