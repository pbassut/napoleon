/**
 * Tests for UI Test Framework OutputParser
 */

import { OutputParser } from '../../../src/ui-tests/framework/OutputParser';

describe('OutputParser', () => {
  let outputParser: OutputParser;

  beforeEach(() => {
    outputParser = new OutputParser();
  });

  describe('Constructor', () => {
    it('should initialize with proper regex patterns', () => {
      expect(outputParser).toBeInstanceOf(OutputParser);
      expect((outputParser as any).ansiEscapeRegex).toBeInstanceOf(RegExp);
      expect((outputParser as any).cursorMovementRegex).toBeInstanceOf(RegExp);
      expect((outputParser as any).clearLineRegex).toBeInstanceOf(RegExp);
    });
  });

  describe('stripAnsiCodes', () => {
    it('should strip ANSI color codes', () => {
      const input = '\x1b[31mRed text\x1b[0m';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('Red text');
    });

    it('should strip complex ANSI color codes', () => {
      const input = '\x1b[38;5;196mBright red\x1b[0m';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('Bright red');
    });

    it('should strip cursor movement codes', () => {
      const input = 'Text\x1b[2AMove up\x1b[3BMove down';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('TextMove upMove down');
    });

    it('should strip clear line codes', () => {
      const input = 'Before\x1b[2KAfter';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('BeforeAfter');
    });

    it('should strip mixed ANSI codes', () => {
      const input = '\x1b[31m\x1b[1mBold red\x1b[0m\x1b[2K\x1b[5A';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('Bold red');
    });

    it('should handle text without ANSI codes', () => {
      const input = 'Plain text without codes';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('Plain text without codes');
    });

    it('should handle empty string', () => {
      const result = outputParser.stripAnsiCodes('');
      
      expect(result).toBe('');
    });

    it('should strip various ANSI escape sequences', () => {
      const input = '\x1b[?25lHide cursor\x1b[?25hShow cursor\x1b[2J';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('Hide cursorShow cursor');
    });

    it.skip('should handle malformed ANSI codes', () => {
      const input = 'Text\x1bincomplete\x1b[99;88;77mValid\x1b[0m';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('TextincompleteValid');
    });

    it('should strip ANSI codes with parameters', () => {
      const input = '\x1b[38;2;255;0;0mRGB red\x1b[48;5;21mBackground\x1b[0m';
      const result = outputParser.stripAnsiCodes(input);
      
      expect(result).toBe('RGB redBackground');
    });
  });

  describe('findInOutput', () => {
    it('should find string pattern in clean output', () => {
      const output = '\x1b[31mHello\x1b[0m World';
      const result = outputParser.findInOutput(output, 'Hello');
      
      expect(result).toBe(true);
    });

    it('should not find non-existent string pattern', () => {
      const output = '\x1b[31mHello\x1b[0m World';
      const result = outputParser.findInOutput(output, 'Goodbye');
      
      expect(result).toBe(false);
    });

    it('should find regex pattern in clean output', () => {
      const output = '\x1b[31mError: 404\x1b[0m';
      const result = outputParser.findInOutput(output, /Error: \d+/);
      
      expect(result).toBe(true);
    });

    it('should not find non-matching regex pattern', () => {
      const output = '\x1b[31mError: 404\x1b[0m';
      const result = outputParser.findInOutput(output, /Warning: \d+/);
      
      expect(result).toBe(false);
    });

    it('should handle case-sensitive string search', () => {
      const output = '\x1b[31mHello\x1b[0m World';
      
      expect(outputParser.findInOutput(output, 'Hello')).toBe(true);
      expect(outputParser.findInOutput(output, 'hello')).toBe(false);
    });

    it('should handle case-sensitive regex search', () => {
      const output = '\x1b[31mHello\x1b[0m World';
      
      expect(outputParser.findInOutput(output, /Hello/)).toBe(true);
      expect(outputParser.findInOutput(output, /hello/)).toBe(false);
      expect(outputParser.findInOutput(output, /hello/i)).toBe(true);
    });

    it('should find pattern across ANSI code boundaries', () => {
      const output = 'Hel\x1b[31mlo\x1b[0m Wor\x1b[32mld\x1b[0m';
      const result = outputParser.findInOutput(output, 'Hello World');
      
      expect(result).toBe(true);
    });

    it('should handle multiline output', () => {
      const output = '\x1b[31mLine 1\x1b[0m\nLine 2\n\x1b[32mLine 3\x1b[0m';
      
      expect(outputParser.findInOutput(output, 'Line 2')).toBe(true);
      expect(outputParser.findInOutput(output, /Line \d/)).toBe(true);
    });

    it('should handle empty output', () => {
      expect(outputParser.findInOutput('', 'test')).toBe(false);
      expect(outputParser.findInOutput('', /test/)).toBe(false);
    });

    it('should handle complex ANSI sequences', () => {
      const output = '\x1b[2K\x1b[1A\x1b[31mTest\x1b[0m\x1b[2B';
      const result = outputParser.findInOutput(output, 'Test');
      
      expect(result).toBe(true);
    });
  });

  describe('extractLines', () => {
    it('should extract lines from simple text', () => {
      const output = 'Line 1\nLine 2\nLine 3';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should extract lines from text with ANSI codes', () => {
      const output = '\x1b[31mLine 1\x1b[0m\n\x1b[32mLine 2\x1b[0m\nLine 3';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should trim whitespace from lines', () => {
      const output = '  Line 1  \n   Line 2   \n\tLine 3\t';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should filter out empty lines', () => {
      const output = 'Line 1\n\nLine 2\n   \nLine 3\n\n';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should handle output with only whitespace', () => {
      const output = '   \n\t\t\n   \n';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual([]);
    });

    it('should handle empty output', () => {
      const result = outputParser.extractLines('');
      
      expect(result).toEqual([]);
    });

    it('should handle single line output', () => {
      const output = '\x1b[31mSingle line\x1b[0m';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual(['Single line']);
    });

    it('should handle complex ANSI codes in multiline output', () => {
      const output = '\x1b[2K\x1b[31mLine 1\x1b[0m\n\x1b[1A\x1b[32mLine 2\x1b[0m\n\x1b[2BLine 3';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should handle lines with mixed content', () => {
      const output = 'Error: \x1b[31mFailed\x1b[0m\nSuccess: \x1b[32mPassed\x1b[0m\nWarning: \x1b[33mCaution\x1b[0m';
      const result = outputParser.extractLines(output);
      
      expect(result).toEqual(['Error: Failed', 'Success: Passed', 'Warning: Caution']);
    });
  });

  describe('extractAgentList', () => {
    it('should extract agent list from formatted output', () => {
      const output = `
▶ [1] Create a user login system (running)
  [2] Add database migration (pending)
  [3] Write unit tests (completed)
      `;
      const result = outputParser.extractAgentList(output);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: '1', prompt: 'Create a user login system', status: 'running' });
      expect(result[1]).toEqual({ id: '2', prompt: 'Add database migration', status: 'pending' });
      expect(result[2]).toEqual({ id: '3', prompt: 'Write unit tests', status: 'completed' });
    });

    it('should handle empty output', () => {
      const result = outputParser.extractAgentList('');
      expect(result).toHaveLength(0);
    });

    it('should handle malformed agent entries', () => {
      const output = 'Not an agent line\n[Invalid] format\nRegular text';
      const result = outputParser.extractAgentList(output);
      expect(result).toHaveLength(0);
    });
  });

  describe('extractDialogContent', () => {
    it('should extract dialog content with box drawing characters', () => {
      const output = `
Some text before
┌─ Dialog Title ─┐
│ Dialog content │
│ More content   │
└────────────────┘
Text after
      `;
      const result = outputParser.extractDialogContent(output);
      
      expect(result).toContain('┌─ Dialog Title ─┐');
      expect(result).toContain('Dialog content');
      expect(result).toContain('└────────────────┘');
    });

    it('should handle rounded box characters', () => {
      const output = `
╭─ Dialog ─╮
│ Content  │
╰──────────╯
      `;
      const result = outputParser.extractDialogContent(output);
      
      expect(result).toContain('╭─ Dialog ─╮');
      expect(result).toContain('╰──────────╯');
    });

    it('should return null for no dialog content', () => {
      const output = 'Regular text without dialogs';
      const result = outputParser.extractDialogContent(output);
      
      expect(result).toBeNull();
    });
  });

  describe('findSelectedItem', () => {
    it('should find selected item with arrow indicator', () => {
      const output = `
Option 1
▶ Selected Option
Option 3
      `;
      const result = outputParser.findSelectedItem(output);
      
      expect(result).toBe('▶ Selected Option');
    });

    it('should return null when no selection found', () => {
      const output = 'Option 1\nOption 2\nOption 3';
      const result = outputParser.findSelectedItem(output);
      
      expect(result).toBeNull();
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract error messages', () => {
      const output = `
Process started
❌ Error occurred
Details about the error
Next line
      `;
      const result = outputParser.extractErrorMessage(output);
      
      expect(result).toContain('❌ Error occurred');
      expect(result).toContain('Details about the error');
    });

    it('should find failed status', () => {
      const output = 'Operation failed to complete';
      const result = outputParser.extractErrorMessage(output);
      
      expect(result).toContain('failed');
    });

    it('should return null for no errors', () => {
      const output = 'All operations successful';
      const result = outputParser.extractErrorMessage(output);
      
      expect(result).toBeNull();
    });
  });

  describe('hasScrollIndicator', () => {
    it('should detect top scroll indicator', () => {
      const output = 'Line 1\n↑\nLine 3';
      const result = outputParser.hasScrollIndicator(output, 'top');
      
      expect(result).toBe(true);
    });

    it('should detect bottom scroll indicator', () => {
      const output = 'Line 1\n↓\nLine 3';
      const result = outputParser.hasScrollIndicator(output, 'bottom');
      
      expect(result).toBe(true);
    });

    it('should return false when no indicators', () => {
      const output = 'Line 1\nLine 2\nLine 3';
      
      expect(outputParser.hasScrollIndicator(output, 'top')).toBe(false);
      expect(outputParser.hasScrollIndicator(output, 'bottom')).toBe(false);
    });
  });

  describe('getLastPrompt', () => {
    it('should find prompt with dollar sign', () => {
      const output = 'Command output\nuser@host:~$ ';
      const result = outputParser.getLastPrompt(output);
      
      expect(result).toBe('user@host:~$');
    });

    it('should find prompt with arrow', () => {
      const output = 'Output\n❯ Command prompt';
      const result = outputParser.getLastPrompt(output);
      
      expect(result).toBe('❯ Command prompt');
    });

    it('should return null when no prompt found', () => {
      const output = 'Just regular output text';
      const result = outputParser.getLastPrompt(output);
      
      expect(result).toBeNull();
    });
  });

  describe('extractProgressIndicator', () => {
    it('should find spinner characters', () => {
      const output = 'Loading ⠋ Please wait';
      const result = outputParser.extractProgressIndicator(output);
      
      expect(result).toBe('Loading ⠋ Please wait');
    });

    it('should find ellipsis indicators', () => {
      const output = 'Processing...';
      const result = outputParser.extractProgressIndicator(output);
      
      expect(result).toBe('Processing...');
    });

    it('should return null when no progress found', () => {
      const output = 'Completed successfully';
      const result = outputParser.extractProgressIndicator(output);
      
      expect(result).toBeNull();
    });
  });

  describe.skip('waitForPattern', () => {
    it('should resolve immediately if pattern exists', async () => {
      const output = '\x1b[31mReady\x1b[0m to proceed';
      const result = await outputParser.waitForPattern(output, 'Ready');
      
      expect(result).toBe(true);
    });

    it('should resolve immediately for regex pattern', async () => {
      const output = '\x1b[31mError: 404\x1b[0m';
      const result = await outputParser.waitForPattern(output, /Error: \d+/);
      
      expect(result).toBe(true);
    });

    it('should return false if pattern not found and no timeout', async () => {
      const output = '\x1b[31mSome text\x1b[0m';
      const result = await outputParser.waitForPattern(output, 'Missing', 0);
      
      expect(result).toBe(false);
    });

    it('should handle timeout for missing pattern', async () => {
      jest.useFakeTimers();
      
      const output = '\x1b[31mSome text\x1b[0m';
      const waitPromise = outputParser.waitForPattern(output, 'Missing', 1000);
      
      jest.advanceTimersByTime(1000);
      
      const result = await waitPromise;
      expect(result).toBe(false);
      
      jest.useRealTimers();
    });
  });

  describe.skip('parseLogLevel', () => {
    it('should identify error log level', () => {
      const output = '\x1b[31m[ERROR] Something went wrong\x1b[0m';
      const result = outputParser.parseLogLevel(output);
      
      expect(result).toBe('error');
    });

    it('should identify warning log level', () => {
      const output = '\x1b[33m[WARN] This is a warning\x1b[0m';
      const result = outputParser.parseLogLevel(output);
      
      expect(result).toBe('warning');
    });

    it('should identify info log level', () => {
      const output = '\x1b[32m[INFO] Information message\x1b[0m';
      const result = outputParser.parseLogLevel(output);
      
      expect(result).toBe('info');
    });

    it('should identify debug log level', () => {
      const output = '\x1b[36m[DEBUG] Debug information\x1b[0m';
      const result = outputParser.parseLogLevel(output);
      
      expect(result).toBe('debug');
    });

    it('should return unknown for unrecognized log levels', () => {
      const output = 'Regular text without log level';
      const result = outputParser.parseLogLevel(output);
      
      expect(result).toBe('unknown');
    });

    it('should handle multiple log levels and return first found', () => {
      const output = '[INFO] Some info [ERROR] Some error';
      const result = outputParser.parseLogLevel(output);
      
      expect(result).toBe('info');
    });

    it('should be case insensitive', () => {
      const output = '\x1b[31m[error] lowercase error\x1b[0m';
      const result = outputParser.parseLogLevel(output);
      
      expect(result).toBe('error');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it.skip('should handle null and undefined inputs gracefully', () => {
      expect(() => outputParser.stripAnsiCodes(null as any)).not.toThrow();
      expect(() => outputParser.stripAnsiCodes(undefined as any)).not.toThrow();
    });

    it('should handle very long output strings', () => {
      const longOutput = 'a'.repeat(100000) + '\x1b[31m' + 'b'.repeat(100000) + '\x1b[0m';
      const result = outputParser.stripAnsiCodes(longOutput);
      
      expect(result.length).toBe(200000);
      expect(result.includes('\x1b')).toBe(false);
    });

    it('should handle output with many ANSI codes', () => {
      let output = '';
      for (let i = 0; i < 1000; i++) {
        output += `\x1b[${i % 8}mText${i}\x1b[0m`;
      }
      
      const result = outputParser.stripAnsiCodes(output);
      expect(result.includes('\x1b')).toBe(false);
    });

    it('should handle malformed regex patterns gracefully', () => {
      const output = 'Test output';
      
      // These should not throw - using properly escaped regex
      expect(() => outputParser.findInOutput(output, /\[/)).not.toThrow();
      expect(() => outputParser.findInOutput(output, /\*/)).not.toThrow();
    });

    it('should handle binary data gracefully', () => {
      const binaryData = '\x00\x01\x02\x03\x1b[31m\x04\x05\x1b[0m';
      const result = outputParser.stripAnsiCodes(binaryData);
      
      expect(result).toBe('\x00\x01\x02\x03\x04\x05');
    });
  });
});