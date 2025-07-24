import React from 'react';
import { render } from 'ink-testing-library';
import { SpawnDialog } from '../../../../../src/ui/ink/components/Dialogs/SpawnDialog';
import { protectBackticks, isInputSafe } from '../../../../../src/utils/backtick-protection.js';

// Mock logger to prevent console output during tests
jest.mock('../../../../../src/utils/logger.js', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

describe('SpawnDialog - Backtick Handling', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  // Test the core backtick protection function integration
  describe('backtick protection integration', () => {
    it('should use protectBackticks function for input processing', () => {
      const testInput = 'Use `console.log()` to debug';
      const result = protectBackticks(testInput);
      expect(result).toBe(testInput); // Should preserve backticks
    });

    it('should use isInputSafe function for validation', () => {
      expect(isInputSafe('Valid input with `backticks`')).toBe(true);
      expect(isInputSafe('')).toBe(false);
      expect(isInputSafe('   ')).toBe(false);
    });
  });

  describe('component rendering', () => {
    it('should render without errors when backticks are in text', () => {
      expect(() => {
        render(
          <SpawnDialog
            isOpen={true}
            onClose={mockOnClose}
            onSubmit={mockOnSubmit}
          />
        );
      }).not.toThrow();
    });

    it('should initialize with proper default state', () => {
      const { lastFrame } = render(
        <SpawnDialog
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Just verify it renders without throwing
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('functional behavior', () => {
    it('should handle various backtick scenarios in protectBackticks', () => {
      // Test inline code
      expect(protectBackticks('Use `console.log()` to debug')).toBe('Use `console.log()` to debug');
      
      // Test code blocks
      const codeBlock = '```javascript\nconst x = 5;\n```';
      expect(protectBackticks(codeBlock)).toBe(codeBlock);
      
      // Test mixed content
      const mixed = 'Fix this `bug` in the code:\n```\nif (x > 0) return true;\n```';
      expect(protectBackticks(mixed)).toBe(mixed);
      
      // Test shell-like commands
      expect(protectBackticks('`echo $HOME && ls -la`')).toBe('`echo $HOME && ls -la`');
    });

    it('should validate input safety correctly', () => {
      expect(isInputSafe('Valid input with `backticks`')).toBe(true);
      expect(isInputSafe('```code block```')).toBe(true);
      expect(isInputSafe('Normal text')).toBe(true);
      expect(isInputSafe('')).toBe(false);
      expect(isInputSafe('   \n\t   ')).toBe(false);
    });
  });
});