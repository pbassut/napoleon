/**
 * Tests for CLI environment validator
 */

// Mock all external dependencies
jest.mock('child_process');
jest.mock('util');
jest.mock('../../../src/core/git-status-checker');
jest.mock('../../../src/core/startup-warning-display');
jest.mock('../../../src/core/api-key-validator');
jest.mock('../../../src/core/api-key-setup-guide');

const { exec } = require('child_process');
const { promisify } = require('util');
const { validateEnvironment, validateGitWorkingTree, validateApiKey } = require('../../../src/cli/validators/environment');
const { EnvironmentValidationError, ConfigurationError } = require('../../../src/utils/errors');
const GitStatusChecker = require('../../../src/core/git-status-checker');
const StartupWarningDisplay = require('../../../src/core/startup-warning-display');
const ApiKeyValidator = require('../../../src/core/api-key-validator');
const ApiKeySetupGuide = require('../../../src/core/api-key-setup-guide');

// Mock console methods to avoid noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

describe('Environment Validator', () => {
  let mockExecAsync;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock promisify to return our mock function
    mockExecAsync = jest.fn();
    promisify.mockImplementation((fn) => {
      if (fn === exec) {
        return mockExecAsync;
      }
      return jest.fn();
    });
    
    // Suppress console output in tests
    console.warn = jest.fn();
    console.log = jest.fn();
    
    // Mock Node.js version to valid version
    Object.defineProperty(process, 'version', {
      value: 'v18.0.0',
      configurable: true,
    });
    
    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  describe('validateEnvironment', () => {
    it('should pass validation with valid Node.js and git versions', async () => {
      // Mock git and claude version checks
      mockExecAsync.mockImplementation((command, options) => {
        if (command === 'git --version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (command === 'claude --version') {
          return Promise.resolve({ stdout: 'claude 1.0.0' });
        }
        return Promise.reject(new Error(`Unknown command: ${command}`));
      });

      await expect(validateEnvironment()).resolves.not.toThrow();
    });

    it('should reject old Node.js versions', async () => {
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        configurable: true,
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateEnvironment()).rejects.toThrow('Node.js version v16.0.0 is not supported');
    });

    it('should reject old git versions', async () => {
      mockExecAsync.mockImplementation((command, options) => {
        if (command === 'git --version') {
          return Promise.resolve({ stdout: 'git version 2.10.0' });
        }
        if (command === 'claude --version') {
          return Promise.resolve({ stdout: 'claude 1.0.0' });
        }
        return Promise.reject(new Error(`Unknown command: ${command}`));
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateEnvironment()).rejects.toThrow('Git version 2.10.0 is not supported');
    });

    it('should handle git not found in PATH', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git --version') {
          return Promise.reject(new Error('git: command not found'));
        }
        if (command === 'claude --version') {
          return Promise.resolve({ stdout: 'claude 1.0.0' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateEnvironment()).rejects.toThrow('Git is not available in system PATH');
    });

    it('should handle invalid git version format', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git --version') {
          return Promise.resolve({ stdout: 'git version invalid' });
        }
        if (command === 'claude --version') {
          return Promise.resolve({ stdout: 'claude 1.0.0' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
    });

    it('should handle claude SDK not available gracefully', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git --version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (command === 'claude --version') {
          return Promise.reject(new Error('claude: command not found'));
        }
        return Promise.reject(new Error('Unknown command'));
      });

      // Should not throw since Claude SDK is optional
      await expect(validateEnvironment()).resolves.not.toThrow();
    });

    it('should handle exec timeout errors', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git --version') {
          return Promise.reject(new Error('Timeout'));
        }
        if (command === 'claude --version') {
          return Promise.resolve({ stdout: 'claude 1.0.0' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateEnvironment()).rejects.toThrow('Git is not available in system PATH');
    });

    it('should warn about missing Claude SDK in non-test environment', async () => {
      process.env.NODE_ENV = 'development';
      
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git --version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (command === 'claude --version') {
          return Promise.reject(new Error('claude: command not found'));
        }
        return Promise.reject(new Error('Unknown command'));
      });

      await validateEnvironment();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Warning: Claude Code SDK not found. Some features may be limited.'
      );
    });

    it('should validate multiple versions correctly', async () => {
      const testCases = [
        { git: '2.20.0', node: 'v18.0.0', shouldPass: true },
        { git: '2.35.1', node: 'v18.15.0', shouldPass: true },
        { git: '2.19.9', node: 'v18.0.0', shouldPass: false },
        { git: '2.20.0', node: 'v17.9.0', shouldPass: false },
      ];

      for (const testCase of testCases) {
        Object.defineProperty(process, 'version', {
          value: testCase.node,
          configurable: true,
        });

        mockExecAsync.mockImplementation((command) => {
          if (command === 'git --version') {
            return Promise.resolve({ stdout: `git version ${testCase.git}` });
          }
          if (command === 'claude --version') {
            return Promise.resolve({ stdout: 'claude 1.0.0' });
          }
          return Promise.reject(new Error('Unknown command'));
        });

        if (testCase.shouldPass) {
          await expect(validateEnvironment()).resolves.not.toThrow();
        } else {
          await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
        }
      }
    });
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
  });

  describe('validateApiKey', () => {
    let mockValidator;
    let mockSetupGuide;

    beforeEach(() => {
      mockValidator = {
        validateApiKey: jest.fn(),
      };
      ApiKeyValidator.mockImplementation(() => mockValidator);

      mockSetupGuide = {
        displaySetupInstructions: jest.fn(),
        displayFormatError: jest.fn(),
      };
      ApiKeySetupGuide.mockImplementation(() => mockSetupGuide);
    });

    it('should validate API key successfully', async () => {
      const mockResult = {
        isValid: true,
        maskedKey: 'sk-ant-...abc123',
      };

      mockValidator.validateApiKey.mockResolvedValue(mockResult);

      const result = await validateApiKey();

      expect(result).toEqual(mockResult);
      expect(console.log).toHaveBeenCalledWith('✅ API key validated: sk-ant-...abc123');
    });

    it('should handle missing API key', async () => {
      const mockResult = {
        isValid: false,
        error: 'API_KEY_MISSING',
        message: 'API key not found',
      };

      mockValidator.validateApiKey.mockResolvedValue(mockResult);

      await expect(validateApiKey()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateApiKey()).rejects.toThrow('API key not found in environment variables');
      
      expect(mockSetupGuide.displaySetupInstructions).toHaveBeenCalled();
    });

    it('should handle invalid API key format', async () => {
      const mockResult = {
        isValid: false,
        error: 'API_KEY_INVALID_FORMAT',
        message: 'Invalid format',
      };

      mockValidator.validateApiKey.mockResolvedValue(mockResult);

      await expect(validateApiKey()).rejects.toThrow(ConfigurationError);
      await expect(validateApiKey()).rejects.toThrow('Invalid API key format');
      
      expect(mockSetupGuide.displayFormatError).toHaveBeenCalled();
    });

    it('should handle other validation errors', async () => {
      const mockResult = {
        isValid: false,
        error: 'API_KEY_INVALID',
        message: 'API key is invalid',
      };

      mockValidator.validateApiKey.mockResolvedValue(mockResult);

      await expect(validateApiKey()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateApiKey()).rejects.toThrow('API key is invalid');
      
      expect(mockSetupGuide.displaySetupInstructions).not.toHaveBeenCalled();
    });

    it('should handle validator exceptions', async () => {
      mockValidator.validateApiKey.mockRejectedValue(new Error('Network error'));

      await expect(validateApiKey()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateApiKey()).rejects.toThrow('Failed to validate API key');
    });

    it('should rethrow EnvironmentValidationError and ConfigurationError', async () => {
      const envError = new EnvironmentValidationError('Test env error', 'TEST_ENV', 'Test hint');
      mockValidator.validateApiKey.mockRejectedValue(envError);

      await expect(validateApiKey()).rejects.toThrow(envError);

      const configError = new ConfigurationError('Test config error', 'TEST_CONFIG', 'Test hint');
      mockValidator.validateApiKey.mockRejectedValue(configError);

      await expect(validateApiKey()).rejects.toThrow(configError);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle Promise.allSettled with mixed results', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git --version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (command === 'claude --version') {
          // This will fail but should be ignored (optional)
          return Promise.reject(new Error('claude not found'));
        }
        return Promise.reject(new Error('Unknown command'));
      });

      await expect(validateEnvironment()).resolves.not.toThrow();
    });

    it('should handle multiple exec failures correctly', async () => {
      mockExecAsync.mockImplementation((command) => {
        // Both git and claude fail, but only git failure should cause rejection
        return Promise.reject(new Error('Command not found'));
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
    });

    it('should handle malformed git version output', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git --version') {
          return Promise.resolve({ stdout: 'some random output' });
        }
        if (command === 'claude --version') {
          return Promise.resolve({ stdout: 'claude 1.0.0' });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
    });
  });
});