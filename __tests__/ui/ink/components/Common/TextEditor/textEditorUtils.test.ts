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

    it('should handle line beyond text length', () => {
      const result = getLineEnd(multiLineText, multiLineText.length + 10);
      
      expect(result).toBe(multiLineText.length);
    });

    it('should handle position in line that exceeds text lines', () => {
      const text = 'Line 1\nLine 2';
      const lines = text.split('\n');
      // Create a position that would result in line >= lines.length in getLineEnd
      const pos = positionToLineColumn(text, text.length + 100);
      const result = getLineEnd(text, text.length + 100);
      
      expect(result).toBe(text.length);
    });

    it('should handle position beyond text', () => {
      const result = getLineEnd(multiLineText, multiLineText.length + 10);
      
      expect(result).toBe(multiLineText.length);
    });

    it('should handle text with only newlines', () => {
      const text = '\n\n\n';
      const result = getLineEnd(text, 1); // Position at second newline
      
      expect(result).toBe(1); // Should find end of current line
    });

    it('should handle position that maps to line beyond available lines', () => {
      const text = 'a\nb';
      // Force a position that when converted to line will exceed the lines array length
      const position = text.length + 100; // Way beyond text end
      const result = getLineEnd(text, position);
      
      expect(result).toBe(text.length); // Should return text.length (line 148)
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

    it('should handle empty string', () => {
      expect(unindentText('')).toBe('');
    });

    it('should handle text with lines shorter than indent string', () => {
      const text = '  Long line\n \n  Short';
      const result = unindentText(text);
      
      expect(result).toBe('Long line\n \nShort');
    });
  });

  describe('Additional Edge Cases', () => {
    it('should handle getWordBoundaries with position in non-word character', () => {
      const text = 'Hello-world!test';
      const result = getWordBoundaries(text, 5); // Position at '-'
      
      expect(result).toEqual({ start: 0, end: 5 }); // Returns start of previous word
    });

    it('should handle findNextWordPosition from end of text', () => {
      const text = 'Hello world';
      expect(findNextWordPosition(text, text.length)).toBe(text.length);
    });

    it('should handle findPreviousWordPosition with whitespace at start', () => {
      const text = '   Hello world';
      expect(findPreviousWordPosition(text, 5)).toBe(3);
    });

    it('should handle getLineEnd with line beyond text bounds', () => {
      const text = 'Line 1\nLine 2';
      expect(getLineEnd(text, text.length + 100)).toBe(text.length);
    });

    it('should handle positionToLineColumn with empty line array edge case', () => {
      const text = '';
      const result = positionToLineColumn(text, 5);
      
      expect(result.line).toBe(0);
      expect(result.column).toBe(0);
    });

    it('should handle lineColumnToPosition with undefined line edge case', () => {
      const text = 'Hello';
      expect(lineColumnToPosition(text, 10, 5)).toBe(6); // Beyond text end
    });

    it('should handle getLineAtPosition beyond all lines', () => {
      const text = 'Line 1\nLine 2';
      expect(getLineAtPosition(text, 1000)).toBe('Line 2'); // Returns last line
    });

    it('should handle indentText with text containing only newlines', () => {
      expect(indentText('\n\n')).toBe('\n\n');
    });

    it('should handle unindentText with line exactly matching indent string', () => {
      expect(unindentText('  ', '  ')).toBe('');
    });

    it('should handle very large position in positionToLineColumn', () => {
      const text = 'a\nb\nc';
      const result = positionToLineColumn(text, 1000000);
      
      expect(result.line).toBe(2);
      expect(result.position).toBe(1000000);
    });

    it('should handle word boundaries at very start and end of text', () => {
      const text = 'word';
      
      expect(getWordBoundaries(text, 0)).toEqual({ start: 0, end: 4 });
      expect(getWordBoundaries(text, 4)).toEqual({ start: 0, end: 4 }); // Beyond end returns last word
    });

    it('should handle findNextWordPosition with only whitespace remaining', () => {
      const text = 'word   ';
      expect(findNextWordPosition(text, 0)).toBe(7);
    });

    it('should handle findPreviousWordPosition from very beginning', () => {
      const text = 'hello world';
      expect(findPreviousWordPosition(text, 1)).toBe(0);
    });

    it('should handle text operations on single character', () => {
      expect(countLines('a')).toBe(1);
      expect(getLineAtPosition('a', 0)).toBe('a');
      expect(indentText('a')).toBe('  a');
      expect(unindentText('  a')).toBe('a');
    });

    it('should handle getTextSelection with positions at text boundaries', () => {
      const text = 'hello';
      
      const startSelection = getTextSelection(text, 0, 0);
      expect(startSelection.text).toBe('');
      
      const endSelection = getTextSelection(text, 5, 5);
      expect(endSelection.text).toBe('');
      
      const fullSelection = getTextSelection(text, 0, 5);
      expect(fullSelection.text).toBe('hello');
    });

    it('should handle multi-line operations with various line ending scenarios', () => {
      const textWithEmptyLines = 'Line1\n\n\nLine4';
      
      expect(countLines(textWithEmptyLines)).toBe(4);
      expect(getLineAtPosition(textWithEmptyLines, 6)).toBe('');
      expect(getLineAtPosition(textWithEmptyLines, 7)).toBe('');
      expect(getLineAtPosition(textWithEmptyLines, 8)).toBe('Line4');
    });

    it('should handle word navigation with punctuation and numbers', () => {
      const text = 'hello123 world!!! test456';
      
      expect(findNextWordPosition(text, 0)).toBe(9);
      expect(findPreviousWordPosition(text, 15)).toBe(15); // Current position behavior
      expect(getWordBoundaries(text, 5)).toEqual({ start: 0, end: 8 });
    });

    it('should handle insertTextAtPosition at various text boundaries', () => {
      const text = 'abc';
      
      const insertAtStart = insertTextAtPosition(text, 0, 'X');
      expect(insertAtStart).toEqual({ newText: 'Xabc', newPosition: 1 });
      
      const insertAtEnd = insertTextAtPosition(text, 3, 'X');
      expect(insertAtEnd).toEqual({ newText: 'abcX', newPosition: 4 });
      
      const insertBeyondEnd = insertTextAtPosition(text, 10, 'X');
      expect(insertBeyondEnd).toEqual({ newText: 'abcX', newPosition: 11 }); // Position is preserved when beyond end
    });

    it('should handle deleteTextRange with edge case positions', () => {
      const text = 'hello world';
      
      const deleteFromStart = deleteTextRange(text, 0, 100);
      expect(deleteFromStart).toEqual({ newText: '', newPosition: 0 });
      
      const deleteNothing = deleteTextRange(text, 5, 5);
      expect(deleteNothing).toEqual({ newText: 'hello world', newPosition: 5 });
      
      const deleteBeyondEnd = deleteTextRange(text, 5, 100);
      expect(deleteBeyondEnd).toEqual({ newText: 'hello', newPosition: 5 });
    });

    it('should handle replaceSelectedText with various replacement scenarios', () => {
      const text = 'hello world';
      
      const replaceWithLonger = replaceSelectedText(text, 6, 11, 'beautiful universe');
      expect(replaceWithLonger).toEqual({ 
        newText: 'hello beautiful universe', 
        newPosition: 24 
      });
      
      const replaceWithShorter = replaceSelectedText(text, 6, 11, 'hi');
      expect(replaceWithShorter).toEqual({ 
        newText: 'hello hi', 
        newPosition: 8 
      });
      
      const replaceAtBoundaries = replaceSelectedText(text, 0, text.length, 'new');
      expect(replaceAtBoundaries).toEqual({ 
        newText: 'new', 
        newPosition: 3 
      });
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