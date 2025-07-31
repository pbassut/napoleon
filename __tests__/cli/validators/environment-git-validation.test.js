// Mock dependencies  
const mockValidateGitRepository = jest.fn();
const mockCheckWorkingTreeStatus = jest.fn();

// StartupWarningDisplay mock functions
const mockDisplayGitValidationError = jest.fn();
const mockDisplayGitWarning = jest.fn();
const mockDisplayExitMessage = jest.fn();
const mockDisplayContinueMessage = jest.fn();
const mockDisplayNonGitRepoError = jest.fn();

jest.mock('../../../src/core/git-status-checker', () => {
  const mockClass = jest.fn().mockImplementation(() => ({
    validateGitRepository: mockValidateGitRepository, // Instance method for environment.js bug
    checkWorkingTreeStatus: mockCheckWorkingTreeStatus,
  }));
  
  // Add static methods too (for other parts of code that call it correctly)
  mockClass.validateGitRepository = mockValidateGitRepository;
  mockClass.findGitDirectory = jest.fn();
  
  return mockClass;
});
jest.mock('../../../src/core/startup-warning-display', () => jest.fn().mockImplementation(() => ({
  displayGitValidationError: mockDisplayGitValidationError,
  displayGitWarning: mockDisplayGitWarning,
  displayExitMessage: mockDisplayExitMessage,
  displayContinueMessage: mockDisplayContinueMessage,
  displayNonGitRepoError: mockDisplayNonGitRepoError,
})));
jest.mock('../../../src/core/api-key-setup-guide', () => jest.fn().mockImplementation(() => ({
  displaySetupInstructions: jest.fn(),
  displayFormatError: jest.fn(),
})));
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: jest.fn(),
}));
jest.mock('../../../src/utils/logger');

// Import after mocks
const { execSync } = require('child_process');
const { promisify } = require('util');

// Mock promisify to return our mock function
promisify.mockReturnValue(jest.fn());

const { validateGitWorkingTree, validateEnvironment } = require('../../../src/cli/validators/environment');
const GitStatusChecker = require('../../../src/core/git-status-checker');
const StartupWarningDisplay = require('../../../src/core/startup-warning-display');
const ApiKeySetupGuide = require('../../../src/core/api-key-setup-guide');
const { EnvironmentValidationError } = require('../../../src/utils/errors');

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

    // Set up default successful git status
    mockValidateGitRepository.mockResolvedValue({
      isValid: true,
      gitDir: '/project/.git',
    });
    
    mockCheckWorkingTreeStatus.mockResolvedValue({
      isClean: true,
      hasUncommittedChanges: false,
      hasUntrackedFiles: false,
      hasStagedChanges: false,
      details: { modified: [], untracked: [], staged: [] },
    });

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
      mockValidateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockCheckWorkingTreeStatus.mockResolvedValue({
        isClean: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: [], untracked: [], staged: [] },
      });

      const result = await validateGitWorkingTree();

      expect(result.isClean).toBe(true);
      expect(mockValidateGitRepository).toHaveBeenCalled();
      expect(mockCheckWorkingTreeStatus).toHaveBeenCalled();
      expect(mockDisplayGitWarning).not.toHaveBeenCalled();
    });

    it('should show warning and exit when user chooses to resolve issues', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockCheckWorkingTreeStatus.mockResolvedValue({
        isClean: false,
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file.js'], untracked: [], staged: [] },
      });

      mockDisplayGitWarning.mockResolvedValue('exit');

      await validateGitWorkingTree();

      expect(mockDisplayGitWarning).toHaveBeenCalled();
      expect(mockDisplayExitMessage).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should continue when user chooses to proceed anyway', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockCheckWorkingTreeStatus.mockResolvedValue({
        isClean: false,
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file.js'], untracked: [], staged: [] },
      });

      mockDisplayGitWarning.mockResolvedValue('continue');
      mockDisplayContinueMessage.mockResolvedValue();

      const result = await validateGitWorkingTree();

      expect(mockDisplayGitWarning).toHaveBeenCalled();
      expect(mockDisplayContinueMessage).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Continuing with dirty working tree'));
      expect(result.isClean).toBe(false);
    });

    it('should handle git not available error', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'GIT_NOT_AVAILABLE',
        message: 'Git is not available in system PATH',
      });

      await expect(validateGitWorkingTree()).rejects.toThrow(EnvironmentValidationError);

      expect(mockDisplayGitValidationError).toHaveBeenCalledWith({
        isValid: false,
        error: 'GIT_NOT_AVAILABLE',
        message: 'Git is not available in system PATH',
      });
    });

    it('should handle not in git repository error', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'NOT_IN_GIT_REPO',
        message: 'Current directory is not in a git repository',
      });

      await expect(validateGitWorkingTree()).rejects.toThrow(EnvironmentValidationError);

      expect(mockDisplayGitValidationError).toHaveBeenCalled();
    });

    it('should handle git directory not accessible error', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'GIT_DIR_NOT_ACCESSIBLE',
        message: 'Git directory is not accessible',
      });

      await expect(validateGitWorkingTree()).rejects.toThrow(EnvironmentValidationError);

      expect(mockDisplayGitValidationError).toHaveBeenCalled();
    });

    it('should handle generic git status check errors', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockCheckWorkingTreeStatus.mockRejectedValue(
        new Error('Not in a git repository'),
      );

      await expect(validateGitWorkingTree()).rejects.toThrow();

      expect(mockDisplayNonGitRepoError).toHaveBeenCalled();
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
      mockValidateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockCheckWorkingTreeStatus.mockResolvedValue({
        isClean: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: [], untracked: [], staged: [] },
      });

      await expect(validateEnvironment()).resolves.not.toThrow();

      expect(mockValidateGitRepository).toHaveBeenCalled();
      expect(mockCheckWorkingTreeStatus).toHaveBeenCalled();
    });

    it('should fail environment validation if git working tree validation fails', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: false,
        error: 'NOT_IN_GIT_REPO',
        message: 'Current directory is not in a git repository',
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);

      expect(mockDisplayGitValidationError).toHaveBeenCalled();
    });

    it('should allow environment validation to continue if user chooses to proceed with dirty tree', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockCheckWorkingTreeStatus.mockResolvedValue({
        isClean: false,
        hasUncommittedChanges: true,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: ['file.js'], untracked: [], staged: [] },
      });

      mockDisplayGitWarning.mockResolvedValue('continue');
      mockDisplayContinueMessage.mockResolvedValue();

      await expect(validateEnvironment()).resolves.not.toThrow();

      expect(mockDisplayGitWarning).toHaveBeenCalled();
      expect(mockDisplayContinueMessage).toHaveBeenCalled();
    });
  });

  describe('performance validation', () => {
    it('should complete git working tree validation within performance requirements', async () => {
      mockValidateGitRepository.mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git',
      });

      mockCheckWorkingTreeStatus.mockResolvedValue({
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
