const { execSync } = require('child_process');
const { validateGitWorkingTree, validateEnvironment } = require('../../../src/cli/validators/environment');
const GitStatusChecker = require('../../../src/core/git-status-checker');
const StartupWarningDisplay = require('../../../src/core/startup-warning-display');
const ApiKeyValidator = require('../../../src/core/api-key-validator');
const ApiKeySetupGuide = require('../../../src/core/api-key-setup-guide');
const { EnvironmentValidationError } = require('../../../src/utils/errors');

// Mock dependencies
jest.mock('../../../src/core/git-status-checker', () => jest.fn().mockImplementation(() => ({
  validateGitRepository: jest.fn(),
  checkWorkingTreeStatus: jest.fn(),
})));
jest.mock('../../../src/core/startup-warning-display', () => jest.fn().mockImplementation(() => ({
  displayGitValidationError: jest.fn(),
  displayGitWarning: jest.fn(),
  displayExitMessage: jest.fn(),
  displayContinueMessage: jest.fn(),
  displayNonGitRepoError: jest.fn(),
})));
jest.mock('../../../src/core/api-key-validator', () => jest.fn().mockImplementation(() => ({
  validateApiKey: jest.fn(),
})));
jest.mock('../../../src/core/api-key-setup-guide', () => jest.fn().mockImplementation(() => ({
  displaySetupInstructions: jest.fn(),
  displayFormatError: jest.fn(),
})));
jest.mock('child_process');
jest.mock('../../../src/utils/logger');

// Mock console and process
const originalConsole = console;
const originalProcess = process;

beforeEach(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  process.exit = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  process.exit = originalProcess.exit;
});

describe.skip('Git Working Tree Validation', () => {
  let mockGitChecker;
  let mockWarningDisplay;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get fresh mock instances
    mockGitChecker = new GitStatusChecker();
    mockWarningDisplay = new StartupWarningDisplay();

    console.log('mockGitChecker:', mockGitChecker);
    console.log('mockGitChecker.validateGitRepository:', mockGitChecker.validateGitRepository);

    // Set up default successful git status
    if (mockGitChecker.validateGitRepository) {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });
    }
    if (mockGitChecker.checkWorkingTreeStatus) {
      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue({
        isClean: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: [], untracked: [], staged: [] },
      });
    }

    // Setup default successful environment mocks
    execSync.mockImplementation((cmd) => {
      if (cmd.includes('git --version')) {
        return 'git version 2.30.0';
      }
      if (cmd.includes('claude --version')) {
        return 'claude 1.0.0';
      }
      return '';
    });

    // Note: API key validation mocks are set up in jest.mock() at the top
    // The environment validator uses ApiKeyValidator internally
  });

  describe('validateGitWorkingTree', () => {
    it('should pass validation for clean git repository', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue({
        isClean: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: [], untracked: [], staged: [] },
      });

      const result = await validateGitWorkingTree();

      expect(result.isClean).toBe(true);
      expect(mockGitChecker.validateGitRepository).toHaveBeenCalled();
      expect(mockGitChecker.checkWorkingTreeStatus).toHaveBeenCalled();
      expect(mockWarningDisplay.displayGitWarning).not.toHaveBeenCalled();
    });

    it('should show warning and exit when user chooses to resolve issues', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue({
        isClean: false,
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file.js'], untracked: [], staged: [] },
      });

      mockWarningDisplay.displayGitWarning.mockResolvedValue('exit');

      await validateGitWorkingTree();

      expect(mockWarningDisplay.displayGitWarning).toHaveBeenCalled();
      expect(mockWarningDisplay.displayExitMessage).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should continue when user chooses to proceed anyway', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue({
        isClean: false,
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file.js'], untracked: [], staged: [] },
      });

      mockWarningDisplay.displayGitWarning.mockResolvedValue('continue');
      mockWarningDisplay.displayContinueMessage.mockResolvedValue();

      const result = await validateGitWorkingTree();

      expect(mockWarningDisplay.displayGitWarning).toHaveBeenCalled();
      expect(mockWarningDisplay.displayContinueMessage).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Continuing with dirty working tree'));
      expect(result.isClean).toBe(false);
    });

    it('should handle git not available error', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'GIT_NOT_AVAILABLE',
        message: 'Git is not available in system PATH',
      });

      await expect(validateGitWorkingTree()).rejects.toThrow(EnvironmentValidationError);

      expect(mockWarningDisplay.displayGitValidationError).toHaveBeenCalledWith({
        isValid: false,
        error: 'GIT_NOT_AVAILABLE',
        message: 'Git is not available in system PATH',
      });
    });

    it('should handle not in git repository error', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'NOT_IN_GIT_REPO',
        message: 'Current directory is not in a git repository',
      });

      await expect(validateGitWorkingTree()).rejects.toThrow(EnvironmentValidationError);

      expect(mockWarningDisplay.displayGitValidationError).toHaveBeenCalled();
    });

    it('should handle git directory not accessible error', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'GIT_DIR_NOT_ACCESSIBLE',
        message: 'Git directory is not accessible',
      });

      await expect(validateGitWorkingTree()).rejects.toThrow(EnvironmentValidationError);

      expect(mockWarningDisplay.displayGitValidationError).toHaveBeenCalled();
    });

    it('should handle generic git status check errors', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockGitChecker.checkWorkingTreeStatus.mockRejectedValue(
        new Error('Not in a git repository'),
      );

      await expect(validateGitWorkingTree()).rejects.toThrow();

      expect(mockWarningDisplay.displayNonGitRepoError).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('validateEnvironment integration', () => {
    beforeEach(() => {
      // Set Node.js version to valid
      Object.defineProperty(process, 'version', {
        value: '18.0.0',
        configurable: true,
      });

      // Mock environment variable
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-valid-key-12345';
    });

    it('should include git working tree validation in environment validation', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue({
        isClean: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: [], untracked: [], staged: [] },
      });

      await expect(validateEnvironment()).resolves.not.toThrow();

      expect(mockGitChecker.validateGitRepository).toHaveBeenCalled();
      expect(mockGitChecker.checkWorkingTreeStatus).toHaveBeenCalled();
    });

    it('should fail environment validation if git working tree validation fails', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'NOT_IN_GIT_REPO',
        message: 'Current directory is not in a git repository',
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);

      expect(mockWarningDisplay.displayGitValidationError).toHaveBeenCalled();
    });

    it('should allow environment validation to continue if user chooses to proceed with dirty tree', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue({
        isClean: false,
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file.js'], untracked: [], staged: [] },
      });

      mockWarningDisplay.displayGitWarning.mockResolvedValue('continue');
      mockWarningDisplay.displayContinueMessage.mockResolvedValue();

      await expect(validateEnvironment()).resolves.not.toThrow();

      expect(mockWarningDisplay.displayGitWarning).toHaveBeenCalled();
      expect(mockWarningDisplay.displayContinueMessage).toHaveBeenCalled();
    });
  });

  describe('performance validation', () => {
    it('should complete git working tree validation within performance requirements', async () => {
      mockGitChecker.validateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue({
        isClean: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: [], untracked: [], staged: [] },
      });

      const startTime = Date.now();
      await validateGitWorkingTree();
      const endTime = Date.now();

      // Should complete quickly (well under 2 seconds since it's mocked)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
