const AgentManager = require('../src/core/agent-manager');
const { EnvironmentValidationError } = require('../src/utils/errors');

// Mock dependencies
jest.mock('../src/core/config');
jest.mock('../src/utils/logger');
jest.mock('fs');
jest.mock('child_process');

describe('AgentManager Input Validation', () => {
  let agentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    agentManager = new AgentManager();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('validateInstructions', () => {
    it('should accept valid instructions', () => {
      const validInstructions = 'Help me implement a new feature for the project';
      const result = agentManager.validateInstructions(validInstructions);
      expect(result).toBe(validInstructions);
    });

    it('should reject null instructions', () => {
      expect(() => agentManager.validateInstructions(null)).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions(null)).toThrow('Instructions must be a non-empty string');
    });

    it('should reject undefined instructions', () => {
      expect(() => agentManager.validateInstructions(undefined)).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions(undefined)).toThrow('Instructions must be a non-empty string');
    });

    it('should reject non-string instructions', () => {
      expect(() => agentManager.validateInstructions(123)).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions({})).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions([])).toThrow(EnvironmentValidationError);
    });

    it('should accept short instructions (no minimum length)', () => {
      expect(() => agentManager.validateInstructions('hi')).not.toThrow();
      expect(() => agentManager.validateInstructions('x')).not.toThrow();
      expect(() => agentManager.validateInstructions('test')).not.toThrow();
    });

    it('should reject instructions that are too long', () => {
      const longInstructions = 'a'.repeat(5001);
      expect(() => agentManager.validateInstructions(longInstructions)).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions(longInstructions)).toThrow('Agent instructions must be less than 5000 characters');
    });

    it('should reject instructions with dangerous shell metacharacters', () => {
      const dangerousInputs = [
        'rm -rf /; echo "dangerous"',
        'ls | grep something',
        'echo `whoami`',
        'test && rm file',
        'test $ variable',
      ];

      dangerousInputs.forEach(input => {
        expect(() => agentManager.validateInstructions(input)).toThrow(EnvironmentValidationError);
        expect(() => agentManager.validateInstructions(input)).toThrow('Instructions contain potentially dangerous characters');
      });
    });

    it('should reject instructions with directory traversal attempts', () => {
      const traversalInputs = [
        'Help me access ../../../etc/passwd',
        'Check the file at ..\\..\\windows\\system32',
        'Look at the ../config directory',
      ];

      traversalInputs.forEach(input => {
        expect(() => agentManager.validateInstructions(input)).toThrow(EnvironmentValidationError);
        expect(() => agentManager.validateInstructions(input)).toThrow('Instructions contain potentially dangerous characters');
      });
    });

    it('should reject instructions starting with dash (option-like)', () => {
      expect(() => agentManager.validateInstructions('-help with this task')).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions('-help with this task')).toThrow('Instructions contain potentially dangerous characters');
    });

    it('should reject instructions with null bytes', () => {
      expect(() => agentManager.validateInstructions('test\0injection')).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions('test\0injection')).toThrow('Instructions contain potentially dangerous characters');
    });

    it('should reject instructions with invalid control characters', () => {
      expect(() => agentManager.validateInstructions('test\x01control')).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateInstructions('test\x7Fdelete')).toThrow(EnvironmentValidationError);
    });

    it('should accept instructions with allowed special characters', () => {
      const validInputs = [
        'Help me implement a feature with JSON',
        'Create a function that returns true or false',
        'Add support for file.txt and config.json',
        'Implement this: console.log Hello World',
        'Use the path /usr/local/bin for installation',
        'Check the URL https://example.com/api',
        'cat file > output',
        'cat file < input',
        'Show me values where x < 5',
        'Display results where y > 10',
      ];

      validInputs.forEach(input => {
        expect(() => agentManager.validateInstructions(input)).not.toThrow();
      });
    });

    it('should trim whitespace from instructions', () => {
      const instruction = '   Help me implement a new feature   ';
      const result = agentManager.validateInstructions(instruction);
      expect(result).toBe('Help me implement a new feature');
    });
  });

  describe('validateOptions', () => {
    it('should return empty object for null options', () => {
      const result = agentManager.validateOptions(null);
      expect(result).toEqual({});
    });

    it('should return empty object for undefined options', () => {
      const result = agentManager.validateOptions(undefined);
      expect(result).toEqual({});
    });

    it('should return empty object for non-object options', () => {
      expect(agentManager.validateOptions('string')).toEqual({});
      expect(agentManager.validateOptions(123)).toEqual({});
      expect(agentManager.validateOptions(true)).toEqual({});
    });

    it('should return empty object for valid empty options', () => {
      const result = agentManager.validateOptions({});
      expect(result).toEqual({});
    });

    it('should validate working directory when provided', () => {
      const fs = require('fs');
      const path = require('path');
      
      // Mock fs.statSync to return directory stats
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => true
      });
      
      const options = { workingDirectory: '/valid/path' };
      const result = agentManager.validateOptions(options);
      
      expect(result.workingDirectory).toBe(path.resolve('/valid/path'));
      expect(fs.statSync).toHaveBeenCalledWith(path.resolve('/valid/path'));
    });

    it('should reject non-directory working directory', () => {
      const fs = require('fs');
      
      // Mock fs.statSync to return file stats
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => false
      });
      
      const options = { workingDirectory: '/path/to/file' };
      expect(() => agentManager.validateOptions(options)).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateOptions(options)).toThrow('Working directory is not a valid directory');
    });

    it('should reject inaccessible working directory', () => {
      const fs = require('fs');
      
      // Mock fs.statSync to throw error
      fs.statSync = jest.fn().mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      
      const options = { workingDirectory: '/nonexistent/path' };
      expect(() => agentManager.validateOptions(options)).toThrow(EnvironmentValidationError);
      expect(() => agentManager.validateOptions(options)).toThrow('Working directory is not accessible');
    });

    it('should ignore unknown options', () => {
      const fs = require('fs');
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => true
      });
      
      const options = { 
        workingDirectory: '/valid/path',
        unknownOption: 'value',
        anotherOption: 123
      };
      const result = agentManager.validateOptions(options);
      
      expect(result).toHaveProperty('workingDirectory');
      expect(result).not.toHaveProperty('unknownOption');
      expect(result).not.toHaveProperty('anotherOption');
    });
  });
});