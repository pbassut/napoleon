const {
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
} = require('../../src/ui/ink/components/Common/TextEditor/textEditorUtils');

describe('text-editor-utils', () => {
  const sampleText = 'Line 1\nLine 2 with words\nLine 3';

  describe('positionToLineColumn', () => {
    it('should convert position to line and column correctly', () => {
      const result = positionToLineColumn(sampleText, 0);
      expect(result.line).toBe(0);
      expect(result.column).toBe(0);
      expect(result.position).toBe(0);
    });

    it('should handle position in middle of text', () => {
      const result = positionToLineColumn(sampleText, 10);
      expect(result.line).toBe(1);
      expect(result.column).toBe(3);
    });

    it('should handle end of text position', () => {
      const result = positionToLineColumn(sampleText, sampleText.length);
      expect(result.line).toBe(2);
      expect(result.column).toBe(6);
    });
  });

  describe('lineColumnToPosition', () => {
    it('should convert line and column to position correctly', () => {
      const position = lineColumnToPosition(sampleText, 0, 0);
      expect(position).toBe(0);
    });

    it('should handle middle line position', () => {
      const position = lineColumnToPosition(sampleText, 1, 3);
      expect(position).toBe(10);
    });

    it('should handle last line position', () => {
      const position = lineColumnToPosition(sampleText, 2, 6);
      expect(position).toBe(sampleText.length);
    });
  });

  describe('getTextSelection', () => {
    it('should get text selection between positions', () => {
      const selection = getTextSelection(sampleText, 0, 6);
      expect(selection.text).toBe('Line 1');
      expect(selection.start.line).toBe(0);
      expect(selection.end.line).toBe(0);
    });

    it('should handle selection across lines', () => {
      const selection = getTextSelection(sampleText, 0, 10);
      expect(selection.text).toBe('Line 1\nLin');
    });

    it('should handle reversed selection', () => {
      const selection = getTextSelection(sampleText, 6, 0);
      expect(selection.text).toBe('Line 1');
    });
  });

  describe('getWordBoundaries', () => {
    it('should find word boundaries', () => {
      const text = 'hello world test';
      const boundaries = getWordBoundaries(text, 8); // 'r' in 'world'
      expect(boundaries.start).toBe(6);
      expect(boundaries.end).toBe(11);
    });

    it('should handle position at word start', () => {
      const text = 'hello world';
      const boundaries = getWordBoundaries(text, 6); // 'w' in 'world'
      expect(boundaries.start).toBe(6);
      expect(boundaries.end).toBe(11);
    });
  });

  describe('findNextWordPosition', () => {
    it('should find next word position', () => {
      const text = 'hello world test';
      const nextPos = findNextWordPosition(text, 0);
      expect(nextPos).toBe(6); // Start of 'world'
    });

    it('should handle end of text', () => {
      const text = 'hello world';
      const nextPos = findNextWordPosition(text, 8);
      expect(nextPos).toBe(text.length);
    });
  });

  describe('findPreviousWordPosition', () => {
    it('should find previous word position', () => {
      const text = 'hello world test';
      const prevPos = findPreviousWordPosition(text, 12); // 't' in 'test'
      expect(prevPos).toBe(6); // Start of 'world'
    });

    it('should handle start of text', () => {
      const text = 'hello world';
      const prevPos = findPreviousWordPosition(text, 3);
      expect(prevPos).toBe(0);
    });
  });

  describe('insertTextAtPosition', () => {
    it('should insert text at position', () => {
      const result = insertTextAtPosition('hello world', 5, ' beautiful');
      expect(result.newText).toBe('hello beautiful world');
      expect(result.newPosition).toBe(15);
    });

    it('should insert at beginning', () => {
      const result = insertTextAtPosition('world', 0, 'hello ');
      expect(result.newText).toBe('hello world');
      expect(result.newPosition).toBe(6);
    });
  });

  describe('deleteTextRange', () => {
    it('should delete text range', () => {
      const result = deleteTextRange('hello world', 5, 11);
      expect(result.newText).toBe('hello');
      expect(result.newPosition).toBe(5);
    });

    it('should handle reversed range', () => {
      const result = deleteTextRange('hello world', 11, 5);
      expect(result.newText).toBe('hello');
      expect(result.newPosition).toBe(5);
    });
  });

  describe('replaceSelectedText', () => {
    it('should replace selected text', () => {
      const result = replaceSelectedText('hello world', 6, 11, 'universe');
      expect(result.newText).toBe('hello universe');
      expect(result.newPosition).toBe(14);
    });
  });

  describe('countLines', () => {
    it('should count lines correctly', () => {
      expect(countLines('single line')).toBe(1);
      expect(countLines('line 1\nline 2')).toBe(2);
      expect(countLines('line 1\nline 2\nline 3')).toBe(3);
    });
  });

  describe('getLineAtPosition', () => {
    it('should get line at position', () => {
      const line = getLineAtPosition(sampleText, 10);
      expect(line).toBe('Line 2 with words');
    });

    it('should handle first line', () => {
      const line = getLineAtPosition(sampleText, 0);
      expect(line).toBe('Line 1');
    });
  });

  describe('indentText', () => {
    it('should indent all lines', () => {
      const indented = indentText('line 1\nline 2');
      expect(indented).toBe('  line 1\n  line 2');
    });

    it('should use custom indent string', () => {
      const indented = indentText('line 1\nline 2', '\t');
      expect(indented).toBe('\tline 1\n\tline 2');
    });

    it('should not indent empty lines', () => {
      const indented = indentText('line 1\n\nline 3');
      expect(indented).toBe('  line 1\n\n  line 3');
    });
  });

  describe('unindentText', () => {
    it('should unindent text', () => {
      const unindented = unindentText('  line 1\n  line 2');
      expect(unindented).toBe('line 1\nline 2');
    });

    it('should handle mixed indentation', () => {
      const unindented = unindentText('  line 1\nline 2\n  line 3');
      expect(unindented).toBe('line 1\nline 2\nline 3');
    });
  });
});