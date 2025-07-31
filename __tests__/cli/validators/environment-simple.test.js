/**
 * Simplified tests for CLI environment validator
 */

// Mock all external dependencies
jest.mock('child_process');
jest.mock('../../../src/core/git-status-checker');
jest.mock('../../../src/core/startup-warning-display');
jest.mock('../../../src/core/api-key-setup-guide');

const { validateGitWorkingTree, validateApiKey } = require('../../../src/cli/validators/environment');
const { EnvironmentValidationError, ConfigurationError } = require('../../../src/utils/errors');
const GitStatusChecker = require('../../../src/core/git-status-checker');
const StartupWarningDisplay = require('../../../src/core/startup-warning-display');
const ApiKeySetupGuide = require('../../../src/core/api-key-setup-guide');

// Mock console methods to avoid noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

describe('Environment Validator - Simplified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Suppress console output in tests
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  describe('validateGitWorkingTree', () => {
    let mockGitChecker;
    let mockWarningDisplay;

    beforeEach(() => {
      mockGitChecker = {
        validateGitRepository: jest.fn(),
        checkWorkingTreeStatus: jest.fn(),
      };
      GitStatusChecker.mockImplementation(() => mockGitChecker);

      mockWarningDisplay = {
        displayGitValidationError: jest.fn(),
        displayNonGitRepoError: jest.fn(),
      };
      StartupWarningDisplay.mockImplementation(() => mockWarningDisplay);

      // Mock process.exit to prevent actual exit
      jest.spyOn(process, 'exit').mockImplementation(() => {});
    });

    afterEach(() => {
      process.exit.mockRestore();
    });

    it('should validate git repository successfully', async () => {
      const mockRepositoryValidation = {
        isValid: true,
        message: 'Repository is valid',
      };
      
      const mockGitStatus = {
        isClean: true,
        uncommittedFiles: [],
        untrackedFiles: [],
      };

      mockGitChecker.validateGitRepository.mockResolvedValue(mockRepositoryValidation);
      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue(mockGitStatus);

      const result = await validateGitWorkingTree();

      expect(result).toEqual(mockGitStatus);
      expect(mockGitChecker.validateGitRepository).toHaveBeenCalled();
      expect(mockGitChecker.checkWorkingTreeStatus).toHaveBeenCalled();
    });

    it('should handle invalid git repository', async () => {
      const mockRepositoryValidation = {
        isValid: false,
        message: 'Not a git repository',
        error: 'NOT_GIT_REPO',
      };

      mockGitChecker.validateGitRepository.mockResolvedValue(mockRepositoryValidation);

      await expect(validateGitWorkingTree()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateGitWorkingTree()).rejects.toThrow('Not a git repository');
      
      expect(mockWarningDisplay.displayGitValidationError).toHaveBeenCalledWith(mockRepositoryValidation);
    });

    it('should handle dirty working tree (commented out functionality)', async () => {
      const mockRepositoryValidation = {
        isValid: true,
        message: 'Repository is valid',
      };
      
      const mockGitStatus = {
        isClean: false,
        uncommittedFiles: ['file1.js'],
        untrackedFiles: ['file2.js'],
      };

      mockGitChecker.validateGitRepository.mockResolvedValue(mockRepositoryValidation);
      mockGitChecker.checkWorkingTreeStatus.mockResolvedValue(mockGitStatus);

      // Since git working tree warnings are disabled, should still pass
      const result = await validateGitWorkingTree();
      expect(result).toEqual(mockGitStatus);
    });

    it('should handle "Not in a git repository" error', async () => {
      mockGitChecker.validateGitRepository.mockRejectedValue(
        new Error('Not in a git repository')
      );

      await expect(validateGitWorkingTree()).rejects.toBeTruthy();
      
      expect(mockWarningDisplay.displayNonGitRepoError).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should rethrow other errors', async () => {
      const testError = new Error('Some other error');
      mockGitChecker.validateGitRepository.mockRejectedValue(testError);

      await expect(validateGitWorkingTree()).rejects.toThrow(testError);
    });

    it('should handle git checker throwing during working tree check', async () => {
      const mockRepositoryValidation = {
        isValid: true,
        message: 'Repository is valid',
      };

      mockGitChecker.validateGitRepository.mockResolvedValue(mockRepositoryValidation);
      mockGitChecker.checkWorkingTreeStatus.mockRejectedValue(
        new Error('Git status check failed')
      );

      await expect(validateGitWorkingTree()).rejects.toThrow('Git status check failed');
    });
  });

  describe('validateApiKey', () => {
    let mockSetupGuide;
    let originalEnv;

    beforeEach(() => {
      originalEnv = process.env.ANTHROPIC_API_KEY;
      
      mockSetupGuide = {
        displaySetupInstructions: jest.fn(),
        displayFormatError: jest.fn(),
      };
      ApiKeySetupGuide.mockImplementation(() => mockSetupGuide);
    });

    afterEach(() => {
      if (originalEnv) {
        process.env.ANTHROPIC_API_KEY = originalEnv;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    it('should validate API key successfully', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';

      const result = await validateApiKey();

      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***f-1234');
      expect(console.log).toHaveBeenCalledWith('✅ API key validated: sk-ant-***f-1234');
    });

    it('should handle missing API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(validateApiKey()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateApiKey()).rejects.toThrow('API key not found in environment variables');
      
      expect(mockSetupGuide.displaySetupInstructions).toHaveBeenCalled();
    });

    it('should handle invalid API key format - too short', async () => {
      process.env.ANTHROPIC_API_KEY = 'short';

      await expect(validateApiKey()).rejects.toThrow(ConfigurationError);
      await expect(validateApiKey()).rejects.toThrow('Invalid API key format');
      
      expect(mockSetupGuide.displayFormatError).toHaveBeenCalled();
    });

    it('should handle invalid API key format - wrong prefix', async () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-key-format-but-long-enough';

      await expect(validateApiKey()).rejects.toThrow(ConfigurationError);
      await expect(validateApiKey()).rejects.toThrow('Invalid API key format');
      
      expect(mockSetupGuide.displayFormatError).toHaveBeenCalled();
    });

    it('should handle empty string API key', async () => {
      process.env.ANTHROPIC_API_KEY = ''; // Empty string

      await expect(validateApiKey()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateApiKey()).rejects.toThrow('API key not found in environment variables');
      
      expect(mockSetupGuide.displaySetupInstructions).toHaveBeenCalled();
    });

    it('should mask API key correctly for different lengths', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-short-test-key';

      const result = await validateApiKey();

      expect(result.isValid).toBe(true);
      expect(result.maskedKey).toBe('sk-ant-***st-key');
    });
  });
});