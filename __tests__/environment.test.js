const { execSync } = require('child_process');
const { validateEnvironment } = require('../src/cli/validators/environment');
const { EnvironmentValidationError } = require('../src/utils/errors');

jest.mock('child_process');

describe('Environment Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEnvironment', () => {
    it('should pass validation with correct Node.js and git versions', async () => {
      // Mock Node.js version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        writable: false,
        configurable: true,
      });
      
      // Mock git version
      execSync.mockReturnValue('git version 2.20.0');

      await expect(validateEnvironment()).resolves.toBeUndefined();
      
      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: false,
        configurable: true,
      });
    });

    it('should throw error for unsupported Node.js version', async () => {
      // Mock old Node.js version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v14.0.0',
        writable: false,
        configurable: true,
      });
      
      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateEnvironment()).rejects.toThrow('Node.js version v14.0.0 is not supported');
      
      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: false,
        configurable: true,
      });
    });

    it('should throw error for unsupported git version', async () => {
      // Mock Node.js version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        writable: false,
        configurable: true,
      });
      
      // Mock old git version
      execSync.mockReturnValue('git version 2.19.0');

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateEnvironment()).rejects.toThrow('Git version 2.19.0 is not supported');
      
      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: false,
        configurable: true,
      });
    });

    it('should throw error when git is not found', async () => {
      // Mock Node.js version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        writable: false,
        configurable: true,
      });
      
      // Mock git not found
      execSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      await expect(validateEnvironment()).rejects.toThrow('Git is not available in system PATH');
      
      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: false,
        configurable: true,
      });
    });

    it('should handle malformed git version output', async () => {
      // Mock Node.js version
      const originalVersion = process.version;
      Object.defineProperty(process, 'version', {
        value: 'v16.0.0',
        writable: false,
        configurable: true,
      });
      
      // Mock malformed git version
      execSync.mockReturnValue('git version unknown');

      await expect(validateEnvironment()).rejects.toThrow(EnvironmentValidationError);
      
      // Restore original version
      Object.defineProperty(process, 'version', {
        value: originalVersion,
        writable: false,
        configurable: true,
      });
    });
  });
});