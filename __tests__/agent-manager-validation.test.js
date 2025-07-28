const fs = require('fs');
const AgentManager = require('../src/core/agent-manager');
const { EnvironmentValidationError } = require('../src/utils/errors');

// Mock dependencies
jest.mock('../src/core/config');
jest.mock('../src/utils/logger');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
  rmSync: jest.fn(),
}));
jest.mock('child_process');

describe('AgentManager Input Validation', () => {
  let agentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock file system for validation tests
    fs.statSync.mockImplementation((path) => {
      // Mock different paths for different test scenarios
      if (path.includes('valid') || path === '/valid/path') {
        return { isDirectory: () => true };
      }
      if (path.includes('file') || path === '/path/to/file') {
        return { isDirectory: () => false };
      }
      if (path.includes('nonexistent')) {
        throw new Error('ENOENT: no such file or directory');
      }
      // For any unhandled path, return a valid directory to be safe
      return { isDirectory: () => true };
    });

    agentManager = new AgentManager();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('validateInstructions', () => {
    it('should accept valid instructions', () => {
      const validInstructions = 'Help me implement a new feature for the project';
      const result = AgentManager.validateInstructions(validInstructions);
      expect(result).toBe(validInstructions);
    });

    it('should reject null instructions', () => {
      expect(() => AgentManager.validateInstructions(null)).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions(null)).toThrow('Instructions must be a non-empty string');
    });

    it('should reject undefined instructions', () => {
      expect(() => AgentManager.validateInstructions(undefined)).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions(undefined)).toThrow('Instructions must be a non-empty string');
    });

    it('should reject non-string instructions', () => {
      expect(() => AgentManager.validateInstructions(123)).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions({})).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions([])).toThrow(EnvironmentValidationError);
    });

    it('should accept short instructions (no minimum length)', () => {
      expect(() => AgentManager.validateInstructions('hi')).not.toThrow();
      expect(() => AgentManager.validateInstructions('x')).not.toThrow();
      expect(() => AgentManager.validateInstructions('test')).not.toThrow();
    });

    it('should reject instructions that are too long', () => {
      const longInstructions = 'a'.repeat(5001);
      expect(() => AgentManager.validateInstructions(longInstructions)).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions(longInstructions)).toThrow('Agent instructions must be less than 5000 characters');
    });

    it('should reject instructions with dangerous command substitution patterns', () => {
      const dangerousInputs = [
        'Execute this: $(rm -rf /)',
        'Run command: $(whoami)',
        'Process data: $(cat /etc/passwd)',
        'Test command: $(ls -la)',
      ];

      dangerousInputs.forEach((input) => {
        expect(() => AgentManager.validateInstructions(input)).toThrow(EnvironmentValidationError);
        expect(() => AgentManager.validateInstructions(input)).toThrow('Instructions contain potentially dangerous patterns');
      });
    });

    it('should reject instructions with directory traversal attempts', () => {
      const traversalInputs = [
        'Help me access ../../../etc/passwd',
        'Check the file at ..\\..\\windows\\system32',
        'Look at the ../config directory',
      ];

      traversalInputs.forEach((input) => {
        expect(() => AgentManager.validateInstructions(input)).toThrow(EnvironmentValidationError);
        expect(() => AgentManager.validateInstructions(input)).toThrow('Instructions contain potentially dangerous patterns');
      });
    });

    it('should reject instructions starting with dash (option-like)', () => {
      expect(() => AgentManager.validateInstructions('-help with this task')).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions('-help with this task')).toThrow('Instructions contain potentially dangerous patterns');
    });

    it('should reject instructions with null bytes', () => {
      expect(() => AgentManager.validateInstructions('test\0injection')).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions('test\0injection')).toThrow('Instructions contain potentially dangerous patterns');
    });

    it('should reject instructions with invalid control characters', () => {
      expect(() => AgentManager.validateInstructions('test\x01control')).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateInstructions('test\x7Fdelete')).toThrow(EnvironmentValidationError);
    });

    it('should accept instructions with code snippets and technical content', () => {
      const validInputs = [
        'Help me debug this function: `const result = getData();`',
        'Implement this code:\n```javascript\nconst data = process();\nif (data) {\n  console.log("Success");\n}\n```',
        'Run these shell commands: ls -la; cat file.txt | grep "pattern"',
        'Use pipe operator: data | transform | output',
        'Check command: echo $USER and $HOME variables',
        'Test logical operators: if condition && result',
        'Use backticks for inline code: `npm install express`',
        'Show semicolon usage: var a = 1; var b = 2;',
        'Pipeline example: input | filter | sort | output',
        'Variable usage: $HOME directory and $PATH settings',
      ];

      validInputs.forEach((input) => {
        expect(() => AgentManager.validateInstructions(input)).not.toThrow();
      });
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

      validInputs.forEach((input) => {
        expect(() => AgentManager.validateInstructions(input)).not.toThrow();
      });
    });

    it('should trim whitespace from instructions', () => {
      const instruction = '   Help me implement a new feature   ';
      const result = AgentManager.validateInstructions(instruction);
      expect(result).toBe('Help me implement a new feature');
    });
  });

  describe('validateOptions', () => {
    it('should return empty object for null options', () => {
      const result = AgentManager.validateOptions(null);
      expect(result).toEqual({});
    });

    it('should return empty object for undefined options', () => {
      const result = AgentManager.validateOptions(undefined);
      expect(result).toEqual({});
    });

    it('should return empty object for non-object options', () => {
      expect(AgentManager.validateOptions('string')).toEqual({});
      expect(AgentManager.validateOptions(123)).toEqual({});
      expect(AgentManager.validateOptions(true)).toEqual({});
    });

    it('should return empty object for valid empty options', () => {
      const result = AgentManager.validateOptions({});
      expect(result).toEqual({});
    });

    it('should validate working directory when provided', () => {
      const path = require('path');

      // Mock fs.statSync to return directory stats
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => true,
      });

      const options = { workingDirectory: '/valid/path' };
      const result = AgentManager.validateOptions(options);

      expect(result.workingDirectory).toBe(path.resolve('/valid/path'));
      expect(fs.statSync).toHaveBeenCalledWith(path.resolve('/valid/path'));
    });

    it('should reject non-directory working directory', () => {
      // Mock fs.statSync to return file stats
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => false,
      });

      const options = { workingDirectory: '/path/to/file' };
      expect(() => AgentManager.validateOptions(options)).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateOptions(options)).toThrow('Working directory is not a valid directory');
    });

    it('should reject inaccessible working directory', () => {
      // Mock fs.statSync to throw error
      fs.statSync = jest.fn().mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const options = { workingDirectory: '/nonexistent/path' };
      expect(() => AgentManager.validateOptions(options)).toThrow(EnvironmentValidationError);
      expect(() => AgentManager.validateOptions(options)).toThrow('Working directory is not accessible');
    });

    it('should ignore unknown options', () => {
      fs.statSync = jest.fn().mockReturnValue({
        isDirectory: () => true,
      });

      const options = {
        workingDirectory: '/valid/path',
        unknownOption: 'value',
        anotherOption: 123,
      };
      const result = AgentManager.validateOptions(options);

      expect(result).toHaveProperty('workingDirectory');
      expect(result).not.toHaveProperty('unknownOption');
      expect(result).not.toHaveProperty('anotherOption');
    });
  });
});
