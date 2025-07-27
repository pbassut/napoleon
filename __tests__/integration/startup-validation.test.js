const { validateEnvironment } = require('../../src/cli/validators/environment');
const { initializeApplication } = require('../../src/cli/index');
const { EnvironmentValidationError, ConfigurationError } = require('../../src/utils/errors');

// Mock dependencies
jest.mock('child_process');
jest.mock('../../src/core/config');
jest.mock('../../src/utils/logger');
jest.mock('../../src/core/git-status-checker');
jest.mock('../../src/core/startup-warning-display');

const { execSync } = require('child_process');
const { initializeSessionStorage, loadConfig } = require('../../src/core/config');
const GitStatusChecker = require('../../src/core/git-status-checker');
const StartupWarningDisplay = require('../../src/core/startup-warning-display');

describe('Startup Validation Integration', () => {
  let originalEnv;
  let consoleSpy;
  let processExitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply config mock after clearAllMocks
    loadConfig.mockReturnValue({
      napoleonDir: '/test/.napoleon',
      sessionStorage: '/test/.napoleon/sessions',
      maxPromptLength: 50
    });
    originalEnv = { ...process.env };
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Default successful mocks
    execSync.mockImplementation((cmd) => {
      if (cmd.includes('git --version')) {
        return 'git version 2.30.0';
      }
      if (cmd.includes('claude --version')) {
        return 'claude 1.0.0';
      }
      return '';
    });

    initializeSessionStorage.mockResolvedValue();

    // Setup git status checker mocks for clean repository by default
    const mockGitChecker = {
      validateGitRepository: jest.fn().mockResolvedValue({
        isValid: true,
        gitDir: '/project/.git'
      }),
      checkWorkingTreeStatus: jest.fn().mockResolvedValue({
        isClean: true,
        hasUncommittedChanges: false,
        hasUntrackedFiles: false,
        hasStagedChanges: false,
        details: { modified: [], untracked: [], staged: [] }
      })
    };
    GitStatusChecker.mockImplementation(() => mockGitChecker);

    // Setup warning display mocks
    const mockWarningDisplay = {
      displayGitValidationError: jest.fn(),
      displayGitWarning: jest.fn(),
      displayExitMessage: jest.fn(),
      displayContinueMessage: jest.fn(),
      displayNonGitRepoError: jest.fn()
    };
    StartupWarningDisplay.mockImplementation(() => mockWarningDisplay);
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    processExitSpy.mockRestore();
  });

  describe('validateEnvironment', () => {
    it('should pass all validations with valid environment', async () => {
      // Setup valid environment
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';
      
      // Mock API key validator
      const mockValidator = {
        validateApiKey: jest.fn().mockResolvedValue({
          isValid: true,
          maskedKey: 'sk-ant-***abc123'
        })
      };
      ApiKeyValidator.mockImplementation(() => mockValidator);

      await expect(validateEnvironment()).resolves.not.toThrow();
      
      expect(mockValidator.validateApiKey).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ API key validated')
      );
    });

    it('should fail validation with unsupported Node.js version', async () => {
      // Mock Node.js version check
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: '16.0.0',
        configurable: true
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      expect(processExitSpy).not.toHaveBeenCalled(); // Should not exit in test

      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        configurable: true
      });
    });

    it('should fail validation when git is not found', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('git --version')) {
          throw new Error('Command not found');
        }
        return '';
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
    });

    it('should fail validation with missing API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;
      delete process.env.CLAUDE_CODE_API_KEY;

      const mockValidator = {
        validateApiKey: jest.fn().mockRejectedValue(
          new EnvironmentValidationError(
            'API key not found in environment variables',
            'API_KEY_NOT_FOUND',
            'Set ANTHROPIC_API_KEY environment variable'
          )
        )
      };
      const mockSetupGuide = {
        displaySetupInstructions: jest.fn()
      };
      
      ApiKeyValidator.mockImplementation(() => mockValidator);
      ApiKeySetupGuide.mockImplementation(() => mockSetupGuide);

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      expect(mockSetupGuide.displaySetupInstructions).toHaveBeenCalled();
    });

    it('should fail validation with invalid API key format', async () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-key-format';

      const mockValidator = {
        validateApiKey: jest.fn().mockRejectedValue(
          new ConfigurationError(
            'Invalid API key format: API key appears too short',
            'INVALID_API_KEY_FORMAT',
            'Please check your API key format'
          )
        )
      };
      const mockSetupGuide = {
        displayFormatError: jest.fn()
      };
      
      ApiKeyValidator.mockImplementation(() => mockValidator);
      ApiKeySetupGuide.mockImplementation(() => mockSetupGuide);

      await expect(validateEnvironment()).rejects.toThrow(ConfigurationError);
      expect(mockSetupGuide.displayFormatError).toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key successfully', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';

      const mockValidator = {
        validateApiKey: jest.fn().mockResolvedValue({
          isValid: true,
          maskedKey: 'sk-ant-***abc123'
        })
      };
      ApiKeyValidator.mockImplementation(() => mockValidator);

      const result = await validateApiKey();

      expect(result.isValid).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ API key validated')
      );
    });
  });

  describe('initializeApplication integration', () => {
    let mockProgram;

    beforeEach(() => {
      mockProgram = {
        name: jest.fn().mockReturnThis(),
        description: jest.fn().mockReturnThis(),
        version: jest.fn().mockReturnThis(),
        command: jest.fn().mockReturnThis(),
        action: jest.fn().mockReturnThis(),
        help: jest.fn()
      };
    });

    it('should initialize application successfully with valid environment', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';

      const mockValidator = {
        validateApiKey: jest.fn().mockResolvedValue({
          isValid: true,
          maskedKey: 'sk-ant-***abc123'
        })
      };
      ApiKeyValidator.mockImplementation(() => mockValidator);

      await expect(initializeApplication(mockProgram)).resolves.not.toThrow();

      expect(mockProgram.name).toHaveBeenCalledWith('napoleon');
      expect(mockProgram.description).toHaveBeenCalled();
      expect(mockProgram.version).toHaveBeenCalledWith('1.0.0');
      expect(initializeSessionStorage).toHaveBeenCalled();
    });

    it('should handle environment validation failure gracefully', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const mockValidator = {
        validateApiKey: jest.fn().mockRejectedValue(
          new EnvironmentValidationError(
            'API key not found in environment variables',
            'API_KEY_NOT_FOUND',
            'Set ANTHROPIC_API_KEY environment variable'
          )
        )
      };
      const mockSetupGuide = {
        displaySetupInstructions: jest.fn()
      };
      
      ApiKeyValidator.mockImplementation(() => mockValidator);
      ApiKeySetupGuide.mockImplementation(() => mockSetupGuide);

      // Mock process.exit to actually exit the process flow
      processExitSpy.mockImplementation((code) => {
        throw new Error(`Process exit called with code ${code}`);
      });

      try {
        await initializeApplication(mockProgram);
      } catch (error) {
        expect(error.message).toContain('Process exit called with code 1');
      }

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('\n❌ Napoleon startup failed');
    });

    it('should handle configuration validation failure gracefully', async () => {
      process.env.ANTHROPIC_API_KEY = 'invalid-key';

      const mockValidator = {
        validateApiKey: jest.fn().mockRejectedValue(
          new ConfigurationError(
            'Invalid API key format',
            'INVALID_API_KEY_FORMAT',
            'Please check your API key format'
          )
        )
      };
      const mockSetupGuide = {
        displayFormatError: jest.fn()
      };
      
      ApiKeyValidator.mockImplementation(() => mockValidator);
      ApiKeySetupGuide.mockImplementation(() => mockSetupGuide);

      // Mock process.exit to actually exit the process flow
      processExitSpy.mockImplementation((code) => {
        throw new Error(`Process exit called with code ${code}`);
      });

      try {
        await initializeApplication(mockProgram);
      } catch (error) {
        expect(error.message).toContain('Process exit called with code 1');
      }

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('\n❌ Napoleon startup failed');
    });

    it('should re-throw non-validation errors', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';

      const mockValidator = {
        validateApiKey: jest.fn().mockResolvedValue({
          isValid: true,
          maskedKey: 'sk-ant-***abc123'
        })
      };
      ApiKeyValidator.mockImplementation(() => mockValidator);

      // Mock session storage to fail
      const storageError = new Error('Storage initialization failed');
      initializeSessionStorage.mockRejectedValue(storageError);

      await expect(initializeApplication(mockProgram)).rejects.toThrow('Storage initialization failed');
    });
  });

  describe('startup performance', () => {
    it('should complete startup validation within performance requirements', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890abcdef-1234';

      const mockValidator = {
        validateApiKey: jest.fn().mockResolvedValue({
          isValid: true,
          maskedKey: 'sk-ant-***abc123'
        })
      };
      ApiKeyValidator.mockImplementation(() => mockValidator);

      const startTime = Date.now();
      await validateEnvironment();
      const endTime = Date.now();

      // Should complete within 2 seconds (2000ms) as per requirements
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('security validation', () => {
    it('should not expose API key values in any outputs', async () => {
      const apiKey = 'sk-ant-api03-real-secret-key-that-should-be-hidden-12345';
      process.env.ANTHROPIC_API_KEY = apiKey;

      const mockValidator = {
        validateApiKey: jest.fn().mockResolvedValue({
          isValid: true,
          maskedKey: 'sk-ant-***12345'
        })
      };
      ApiKeyValidator.mockImplementation(() => mockValidator);

      await validateEnvironment();

      // Check all console outputs to ensure no API key leakage
      const allConsoleCalls = [
        ...consoleSpy.log.mock.calls,
        ...consoleSpy.warn.mock.calls,
        ...consoleSpy.error.mock.calls
      ].flat().join(' ');

      expect(allConsoleCalls).not.toContain(apiKey);
      expect(allConsoleCalls).toContain('sk-ant-***12345');
    });
  });
});