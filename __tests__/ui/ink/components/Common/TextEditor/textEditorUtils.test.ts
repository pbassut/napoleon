/**
 * Tests for Text Editor Utilities
 * Comprehensive coverage for text editing utility functions
 */

import {
  positionToLineColumn,
  lineColumnToPosition,
  getTextSelection,
  getWordBoundaries,
  findNextWordPosition,
  findPreviousWordPosition,
  getLineStart,
  getLineEnd,
  insertTextAtPosition,
  deleteTextRange,
  replaceSelectedText,
  countLines,
  getLineAtPosition,
  indentText,
  unindentText,
  TextPosition,
  TextSelection,
} from '../../../../../../src/ui/ink/components/Common/TextEditor/textEditorUtils';

describe('Text Editor Utilities', () => {
  const sampleText = 'Hello, world!\nThis is line 2\nAnd line 3';
  const multiLineText = 'First line\nSecond line\nThird line\nFourth line';

  describe('positionToLineColumn', () => {
    it('should convert position to line and column correctly', () => {
      const result = positionToLineColumn(sampleText, 7);
      
      expect(result).toEqual({
        line: 0,
        column: 7,
        position: 7,
      });
    });

    it('should handle position at start of second line', () => {
      const result = positionToLineColumn(sampleText, 14);
      
      expect(result).toEqual({
        line: 1,
        column: 0,
        position: 14,
      });
    });

    it('should handle position at end of text', () => {
      const result = positionToLineColumn(sampleText, sampleText.length);
      
      expect(result.line).toBe(2);
      expect(result.position).toBe(sampleText.length);
    });

    it('should handle position beyond text length', () => {
      const result = positionToLineColumn(sampleText, sampleText.length + 10);
      
      expect(result.line).toBe(2);
      expect(result.position).toBe(sampleText.length + 10);
    });

    it('should handle empty string', () => {
      const result = positionToLineColumn('', 0);
      
      expect(result).toEqual({
        line: 0,
        column: 0,
        position: 0,
      });
    });

    it('should handle single line text', () => {
      const result = positionToLineColumn('Hello world', 6);
      
      expect(result).toEqual({
        line: 0,
        column: 6,
        position: 6,
      });
    });

    it('should handle position at newline character', () => {
      const result = positionToLineColumn(sampleText, 13);
      
      expect(result).toEqual({
        line: 0,
        column: 13,
        position: 13,
      });
    });
  });

  describe('lineColumnToPosition', () => {
    it('should convert line and column to position correctly', () => {
      const result = lineColumnToPosition(sampleText, 1, 5);
      
      expect(result).toBe(19); // "Hello, world!\nThis " (19 characters)
    });

    it('should handle line 0, column 0', () => {
      const result = lineColumnToPosition(sampleText, 0, 0);
      
      expect(result).toBe(0);
    });

    it('should handle last line', () => {
      const result = lineColumnToPosition(sampleText, 2, 5);
      
      expect(result).toBe(34); // Position in "And line 3"
    });

    it('should clamp column to line length', () => {
      const result = lineColumnToPosition(sampleText, 0, 100);
      const lineLength = sampleText.split('\n')[0].length;
      
      expect(result).toBe(lineLength);
    });

    it('should handle line beyond text length', () => {
      const result = lineColumnToPosition(sampleText, 10, 5);
      
      expect(result).toBeGreaterThan(sampleText.length);
    });

    it('should handle empty text', () => {
      const result = lineColumnToPosition('', 0, 0);
      
      expect(result).toBe(0);
    });
  });

  describe('getTextSelection', () => {
    it('should return correct text selection', () => {
      const result = getTextSelection(sampleText, 7, 12);
      
      expect(result.text).toBe('world');
      expect(result.start.column).toBe(7);
      expect(result.end.column).toBe(12);
    });

    it('should normalize start and end positions', () => {
      const result = getTextSelection(sampleText, 12, 7);
      
      expect(result.text).toBe('world');
      expect(result.start.position).toBe(7);
      expect(result.end.position).toBe(12);
    });

    it('should handle same start and end position', () => {
      const result = getTextSelection(sampleText, 5, 5);
      
      expect(result.text).toBe('');
      expect(result.start.position).toBe(5);
      expect(result.end.position).toBe(5);
    });

    it('should handle selection across multiple lines', () => {
      const result = getTextSelection(sampleText, 10, 20);
      
      expect(result.text).toBe('ld!\nThis i');
      expect(result.start.line).toBe(0);
      expect(result.end.line).toBe(1);
    });
  });

  describe('getWordBoundaries', () => {
    it('should find word boundaries correctly', () => {
      const text = 'Hello world test';
      const result = getWordBoundaries(text, 8); // Position in "world"
      
      expect(result).toEqual({ start: 6, end: 11 });
      expect(text.substring(result.start, result.end)).toBe('world');
    });

    it('should handle position at word start', () => {
      const text = 'Hello world';
      const result = getWordBoundaries(text, 6); // Start of "world"
      
      expect(result).toEqual({ start: 6, end: 11 });
    });

    it('should handle position at word end', () => {
      const text = 'Hello world';
      const result = getWordBoundaries(text, 4); // End of "Hello"
      
      expect(result).toEqual({ start: 0, end: 5 });
    });

    it('should handle position in whitespace', () => {
      const text = 'Hello world';
      const result = getWordBoundaries(text, 5); // Space between words
      
      expect(result).toEqual({ start: 0, end: 5 }); // Actually returns start of previous word
    });

    it('should handle position at text boundaries', () => {
      const text = 'word';
      const startResult = getWordBoundaries(text, 0);
      const endResult = getWordBoundaries(text, text.length - 1);
      
      expect(startResult).toEqual({ start: 0, end: 4 });
      expect(endResult).toEqual({ start: 0, end: 4 });
    });
  });

  describe('findNextWordPosition', () => {
    it('should find next word position correctly', () => {
      const text = 'Hello world test';
      const result = findNextWordPosition(text, 2); // From within "Hello"
      
      expect(result).toBe(6); // Start of "world"
    });

    it('should handle position at word boundary', () => {
      const text = 'Hello world test';
      const result = findNextWordPosition(text, 5); // End of "Hello"
      
      expect(result).toBe(6); // Start of "world"
    });

    it('should handle position at end of text', () => {
      const text = 'Hello world';
      const result = findNextWordPosition(text, text.length - 1);
      
      expect(result).toBe(text.length);
    });

    it('should handle multiple spaces between words', () => {
      const text = 'Hello     world';
      const result = findNextWordPosition(text, 2);
      
      expect(result).toBe(10); // Start of "world"
    });

    it('should handle text ending with spaces', () => {
      const text = 'Hello world   ';
      const result = findNextWordPosition(text, 8);
      
      expect(result).toBe(text.length);
    });
  });

  describe('findPreviousWordPosition', () => {
    it('should find previous word position correctly', () => {
      const text = 'Hello world test';
      const result = findPreviousWordPosition(text, 8); // From within "world"
      
      expect(result).toBe(6); // Start of current word
    });

    it('should handle position at word start', () => {
      const text = 'Hello world test';
      const result = findPreviousWordPosition(text, 6); // Start of "world"
      
      expect(result).toBe(0); // Start of "Hello"
    });

    it('should handle position at start of text', () => {
      const text = 'Hello world';
      const result = findPreviousWordPosition(text, 0);
      
      expect(result).toBe(0);
    });

    it('should handle multiple spaces', () => {
      const text = 'Hello     world';
      const result = findPreviousWordPosition(text, 12);
      
      expect(result).toBe(10); // Start of "world"
    });
  });

  describe('getLineStart', () => {
    it('should return start of line correctly', () => {
      const result = getLineStart(multiLineText, 20); // Position in second line
      
      expect(result).toBe(11); // Start of "Second line"
    });

    it('should handle position at line start', () => {
      const result = getLineStart(multiLineText, 11);
      
      expect(result).toBe(11);
    });

    it('should handle first line', () => {
      const result = getLineStart(multiLineText, 5);
      
      expect(result).toBe(0);
    });
  });

  describe('getLineEnd', () => {
    it('should return end of line correctly', () => {
      const result = getLineEnd(multiLineText, 5); // Position in first line
      
      expect(result).toBe(10); // End of "First line"
    });

    it('should handle last line', () => {
      const result = getLineEnd(multiLineText, multiLineText.length - 1);
      
      expect(result).toBe(multiLineText.length);
    });

    it('should handle position beyond text', () => {
      const result = getLineEnd(multiLineText, multiLineText.length + 10);
      
      expect(result).toBe(multiLineText.length);
    });
  });

  describe('insertTextAtPosition', () => {
    it('should insert text at correct position', () => {
      const result = insertTextAtPosition('Hello world', 6, 'beautiful ');
      
      expect(result.newText).toBe('Hello beautiful world');
      expect(result.newPosition).toBe(16);
    });

    it('should insert at beginning of text', () => {
      const result = insertTextAtPosition('world', 0, 'Hello ');
      
      expect(result.newText).toBe('Hello world');
      expect(result.newPosition).toBe(6);
    });

    it('should insert at end of text', () => {
      const result = insertTextAtPosition('Hello', 5, ' world');
      
      expect(result.newText).toBe('Hello world');
      expect(result.newPosition).toBe(11);
    });

    it('should handle empty insertion', () => {
      const result = insertTextAtPosition('Hello world', 6, '');
      
      expect(result.newText).toBe('Hello world');
      expect(result.newPosition).toBe(6);
    });

    it('should handle insertion in empty text', () => {
      const result = insertTextAtPosition('', 0, 'Hello');
      
      expect(result.newText).toBe('Hello');
      expect(result.newPosition).toBe(5);
    });
  });

  describe('deleteTextRange', () => {
    it('should delete text range correctly', () => {
      const result = deleteTextRange('Hello world', 6, 11);
      
      expect(result.newText).toBe('Hello ');
      expect(result.newPosition).toBe(6);
    });

    it('should handle deletion from start', () => {
      const result = deleteTextRange('Hello world', 0, 6);
      
      expect(result.newText).toBe('world');
      expect(result.newPosition).toBe(0);
    });

    it('should handle deletion to end', () => {
      const result = deleteTextRange('Hello world', 5, 11);
      
      expect(result.newText).toBe('Hello');
      expect(result.newPosition).toBe(5);
    });

    it('should normalize start and end positions', () => {
      const result = deleteTextRange('Hello world', 11, 6);
      
      expect(result.newText).toBe('Hello ');
      expect(result.newPosition).toBe(6);
    });

    it('should handle same start and end', () => {
      const result = deleteTextRange('Hello world', 5, 5);
      
      expect(result.newText).toBe('Hello world');
      expect(result.newPosition).toBe(5);
    });

    it('should handle deletion beyond text length', () => {
      const result = deleteTextRange('Hello', 3, 10);
      
      expect(result.newText).toBe('Hel');
      expect(result.newPosition).toBe(3);
    });
  });

  describe('replaceSelectedText', () => {
    it('should replace selected text correctly', () => {
      const result = replaceSelectedText('Hello world', 6, 11, 'universe');
      
      expect(result.newText).toBe('Hello universe');
      expect(result.newPosition).toBe(14);
    });

    it('should handle replacement with empty string', () => {
      const result = replaceSelectedText('Hello world', 6, 11, '');
      
      expect(result.newText).toBe('Hello ');
      expect(result.newPosition).toBe(6);
    });

    it('should handle replacement of empty selection', () => {
      const result = replaceSelectedText('Hello world', 6, 6, 'beautiful ');
      
      expect(result.newText).toBe('Hello beautiful world');
      expect(result.newPosition).toBe(16);
    });

    it('should handle replacement of entire text', () => {
      const result = replaceSelectedText('Hello', 0, 5, 'Goodbye');
      
      expect(result.newText).toBe('Goodbye');
      expect(result.newPosition).toBe(7);
    });
  });

  describe('countLines', () => {
    it('should count lines correctly', () => {
      expect(countLines(multiLineText)).toBe(4);
    });

    it('should handle single line', () => {
      expect(countLines('Single line')).toBe(1);
    });

    it('should handle empty string', () => {
      expect(countLines('')).toBe(1);
    });

    it('should handle text ending with newline', () => {
      expect(countLines('Line 1\nLine 2\n')).toBe(3);
    });

    it('should handle text with only newlines', () => {
      expect(countLines('\n\n\n')).toBe(4);
    });
  });

  describe('getLineAtPosition', () => {
    it('should return correct line at position', () => {
      const result = getLineAtPosition(multiLineText, 15);
      
      expect(result).toBe('Second line');
    });

    it('should handle position at line start', () => {
      const result = getLineAtPosition(multiLineText, 11);
      
      expect(result).toBe('Second line');
    });

    it('should handle position at line end', () => {
      const result = getLineAtPosition(multiLineText, 21);
      
      expect(result).toBe('Second line');
    });

    it('should handle first line', () => {
      const result = getLineAtPosition(multiLineText, 5);
      
      expect(result).toBe('First line');
    });

    it('should handle last line', () => {
      const result = getLineAtPosition(multiLineText, multiLineText.length - 1);
      
      expect(result).toBe('Fourth line');
    });

    it('should handle position beyond text', () => {
      const result = getLineAtPosition(multiLineText, multiLineText.length + 10);
      
      expect(result).toBe('Fourth line');
    });
  });

  describe('indentText', () => {
    it('should indent all lines with default indent', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = indentText(text);
      
      expect(result).toBe('  Line 1\n  Line 2\n  Line 3');
    });

    it('should indent with custom indent string', () => {
      const text = 'Line 1\nLine 2';
      const result = indentText(text, '\t');
      
      expect(result).toBe('\tLine 1\n\tLine 2');
    });

    it('should handle single line', () => {
      const result = indentText('Single line');
      
      expect(result).toBe('  Single line');
    });

    it('should handle empty string', () => {
      const result = indentText('');
      
      expect(result).toBe(''); // Empty string has length 0, so no indent
    });

    it('should handle text with empty lines', () => {
      const text = 'Line 1\n\nLine 3';
      const result = indentText(text);
      
      expect(result).toBe('  Line 1\n\n  Line 3'); // Empty lines aren't indented
    });

    it('should handle text ending with newline', () => {
      const text = 'Line 1\nLine 2\n';
      const result = indentText(text);
      
      expect(result).toBe('  Line 1\n  Line 2\n'); // Last empty line isn't indented
    });
  });

  describe('unindentText', () => {
    it('should unindent all lines with default indent', () => {
      const text = '  Line 1\n  Line 2\n  Line 3';
      const result = unindentText(text);
      
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should unindent with custom indent string', () => {
      const text = '\tLine 1\n\tLine 2';
      const result = unindentText(text, '\t');
      
      expect(result).toBe('Line 1\nLine 2');
    });

    it('should handle lines without indentation', () => {
      const text = 'Line 1\n  Line 2\nLine 3';
      const result = unindentText(text);
      
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle partial indentation', () => {
      const text = ' Line 1\n  Line 2';
      const result = unindentText(text);
      
      expect(result).toBe(' Line 1\nLine 2');
    });

    it('should handle empty lines', () => {
      const text = '  Line 1\n  \n  Line 3';
      const result = unindentText(text);
      
      expect(result).toBe('Line 1\n\nLine 3');
    });

    it('should handle single line', () => {
      const result = unindentText('  Single line');
      
      expect(result).toBe('Single line');
    });

    it('should handle text with mixed indentation', () => {
      const text = '    Deeply indented\n  Less indented\nNot indented';
      const result = unindentText(text);
      
      expect(result).toBe('  Deeply indented\nLess indented\nNot indented');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle roundtrip position conversion', () => {
      const position = 25;
      const lineCol = positionToLineColumn(sampleText, position);
      const backToPosition = lineColumnToPosition(sampleText, lineCol.line, lineCol.column);
      
      expect(backToPosition).toBe(position);
    });

    it('should handle text with special characters', () => {
      const text = 'Hello 🌍\nSpecial chars: áéíóú\nNumbers: 123';
      const result = positionToLineColumn(text, 15);
      
      expect(result.line).toBe(1);
      expect(getLineAtPosition(text, 15)).toContain('Special');
    });

    it('should handle very long lines', () => {
      const longLine = 'a'.repeat(1000);
      const text = `${longLine}\nSecond line`;
      const result = positionToLineColumn(text, 500);
      
      expect(result.line).toBe(0);
      expect(result.column).toBe(500);
    });

    it('should handle operations on empty text consistently', () => {
      const empty = '';
      
      expect(countLines(empty)).toBe(1);
      expect(getLineAtPosition(empty, 0)).toBe('');
      expect(positionToLineColumn(empty, 0).line).toBe(0);
      expect(lineColumnToPosition(empty, 0, 0)).toBe(0);
    });

    it('should handle complex text operations', () => {
      let text = 'Original text';
      
      // Insert, then delete, then replace
      let result = insertTextAtPosition(text, 9, 'new ');
      text = result.newText;
      expect(text).toBe('Original new text');
      
      result = deleteTextRange(text, 9, 13);
      text = result.newText;
      expect(text).toBe('Original text');
      
      result = replaceSelectedText(text, 0, 8, 'Modified');
      text = result.newText;
      expect(text).toBe('Modified text');
    });
  });
});