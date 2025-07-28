/**
 * Tests for useTextEditor React Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useTextEditor } from '../../../../../src/ui/ink/components/Common/TextEditor/useTextEditor';

// Mock timers for debounced operations
jest.useFakeTimers();

describe('useTextEditor', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty text by default', () => {
      const { result } = renderHook(() => useTextEditor());
      
      expect(result.current.state.text).toBe('');
      expect(result.current.state.cursorPosition).toBe(0);
      expect(result.current.state.lines).toEqual(['']);
      expect(result.current.state.currentLine).toBe(0);
      expect(result.current.state.currentColumn).toBe(0);
      expect(result.current.state.history).toEqual(['']);
      expect(result.current.state.historyIndex).toBe(0);
    });

    it('should initialize with provided initial text', () => {
      const initialText = 'Hello\nWorld';
      const { result } = renderHook(() => useTextEditor(initialText));
      
      expect(result.current.state.text).toBe(initialText);
      expect(result.current.state.cursorPosition).toBe(initialText.length);
      expect(result.current.state.lines).toEqual(['Hello', 'World']);
      expect(result.current.state.currentLine).toBe(1);
      expect(result.current.state.currentColumn).toBe(5);
      expect(result.current.state.history).toEqual([initialText]);
      expect(result.current.state.historyIndex).toBe(0);
    });

    it('should initialize with single line text', () => {
      const initialText = 'Single line';
      const { result } = renderHook(() => useTextEditor(initialText));
      
      expect(result.current.state.text).toBe(initialText);
      expect(result.current.state.lines).toEqual(['Single line']);
      expect(result.current.state.currentLine).toBe(0);
      expect(result.current.state.currentColumn).toBe(11);
    });
  });

  describe('Cursor Movement', () => {
    it('should move cursor left', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.moveCursor('left');
      });
      
      expect(result.current.state.cursorPosition).toBe(4);
      expect(result.current.state.currentColumn).toBe(4);
    });

    it('should move cursor right', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      // Move to start first
      act(() => {
        result.current.jumpToStart();
      });
      
      act(() => {
        result.current.moveCursor('right');
      });
      
      expect(result.current.state.cursorPosition).toBe(1);
      expect(result.current.state.currentColumn).toBe(1);
    });

    it('should move cursor up between lines', () => {
      const { result } = renderHook(() => useTextEditor('Line1\nLine2'));
      
      act(() => {
        result.current.moveCursor('up');
      });
      
      expect(result.current.state.currentLine).toBe(0);
      expect(result.current.state.currentColumn).toBe(5);
    });

    it('should move cursor down between lines', () => {
      const { result } = renderHook(() => useTextEditor('Line1\nLine2'));
      
      // Move to start first
      act(() => {
        result.current.jumpToStart();
      });
      
      act(() => {
        result.current.moveCursor('down');
      });
      
      expect(result.current.state.currentLine).toBe(1);
      expect(result.current.state.currentColumn).toBe(0);
    });

    it('should not move cursor left beyond start', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.jumpToStart();
      });
      
      act(() => {
        result.current.moveCursor('left');
      });
      
      expect(result.current.state.cursorPosition).toBe(0);
    });

    it('should not move cursor right beyond end', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.moveCursor('right');
      });
      
      expect(result.current.state.cursorPosition).toBe(5);
    });

    it('should not move cursor up beyond first line', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.moveCursor('up');
      });
      
      expect(result.current.state.currentLine).toBe(0);
    });

    it('should not move cursor down beyond last line', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.moveCursor('down');
      });
      
      expect(result.current.state.currentLine).toBe(0);
    });

    it('should handle cursor movement between lines with different lengths', () => {
      const { result } = renderHook(() => useTextEditor('Short\nMuch longer line'));
      
      // Move to end of first line
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('down');
      });
      
      // Should position at end of second line
      expect(result.current.state.currentLine).toBe(1);
      expect(result.current.state.currentColumn).toBe(0);
    });
  });

  describe('Text Insertion', () => {
    it('should insert text at cursor position', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.insertText(' World');
      });
      
      expect(result.current.state.text).toBe('Hello World');
      expect(result.current.state.cursorPosition).toBe(11);
    });

    it('should insert text at beginning', () => {
      const { result } = renderHook(() => useTextEditor('World'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.insertText('Hello ');
      });
      
      expect(result.current.state.text).toBe('Hello World');
      expect(result.current.state.cursorPosition).toBe(6);
    });

    it('should insert text in middle', () => {
      const { result } = renderHook(() => useTextEditor('HelloWorld'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.insertText(' ');
      });
      
      expect(result.current.state.text).toBe('Hello World');
    });

    it('should insert newline characters', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.insertText('\nWorld');
      });
      
      expect(result.current.state.text).toBe('Hello\nWorld');
      expect(result.current.state.lines).toEqual(['Hello', 'World']);
      expect(result.current.state.currentLine).toBe(1);
      expect(result.current.state.currentColumn).toBe(5);
    });

    it('should insert multiple lines', () => {
      const { result } = renderHook(() => useTextEditor('Start'));
      
      act(() => {
        result.current.insertText('\nLine2\nLine3\nEnd');
      });
      
      expect(result.current.state.lines).toEqual(['Start', 'Line2', 'Line3', 'End']);
      expect(result.current.state.currentLine).toBe(3);
      expect(result.current.state.currentColumn).toBe(3);
    });

    it('should replace selected text on insertion', () => {
      const { result } = renderHook(() => useTextEditor('Hello World'));
      
      // Select "World"
      act(() => {
        result.current.selectAll();
        result.current.insertText('Universe');
      });
      
      expect(result.current.state.text).toBe('Universe');
    });

    it('should handle empty text insertion', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      const originalText = result.current.state.text;
      
      act(() => {
        result.current.insertText('');
      });
      
      expect(result.current.state.text).toBe(originalText);
    });
  });

  describe('Text Deletion', () => {
    it('should delete character with backspace', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.deleteText('backspace');
      });
      
      expect(result.current.state.text).toBe('Hell');
      expect(result.current.state.cursorPosition).toBe(4);
    });

    it('should delete character with delete key', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.deleteText('delete');
      });
      
      expect(result.current.state.text).toBe('ello');
      expect(result.current.state.cursorPosition).toBe(0);
    });

    it('should delete selected text', () => {
      const { result } = renderHook(() => useTextEditor('Hello World'));
      
      act(() => {
        result.current.selectAll();
        result.current.deleteText('selection');
      });
      
      expect(result.current.state.text).toBe('');
      expect(result.current.state.cursorPosition).toBe(0);
    });

    it('should not delete beyond beginning with backspace', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.deleteText('backspace');
      });
      
      expect(result.current.state.text).toBe('Hello');
    });

    it('should not delete beyond end with delete key', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.deleteText('delete');
      });
      
      expect(result.current.state.text).toBe('Hello');
    });

    it('should handle deletion across lines', () => {
      const { result } = renderHook(() => useTextEditor('Line1\nLine2'));
      
      // Position at end of first line
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.deleteText('delete');
      });
      
      expect(result.current.state.text).toBe('Line1Line2');
    });
  });

  describe('Text Selection', () => {
    it('should select text by moving selection cursor', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.selectText('right');
        result.current.selectText('right');
      });
      
      expect(result.current.state.selectionStart).toBe(0);
      expect(result.current.state.selectionEnd).toBe(2);
    });

    it('should select all text', () => {
      const { result } = renderHook(() => useTextEditor('Hello World'));
      
      act(() => {
        result.current.selectAll();
      });
      
      expect(result.current.state.selectionStart).toBe(0);
      expect(result.current.state.selectionEnd).toBe(11);
    });

    it('should extend selection in different directions', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.selectText('left');
        result.current.selectText('right');
        result.current.selectText('right');
      });
      
      expect(result.current.state.selectionStart).toBeDefined();
      expect(result.current.state.selectionEnd).toBeDefined();
    });

    it('should select word at cursor', () => {
      const { result } = renderHook(() => useTextEditor('Hello World Test'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.selectWordAtCursor();
      });
      
      expect(result.current.state.selectionStart).toBeDefined();
      expect(result.current.state.selectionEnd).toBeDefined();
    });

    it('should clear selection when moving cursor', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.selectAll();
        result.current.moveCursor('right');
      });
      
      expect(result.current.state.selectionStart).toBeUndefined();
      expect(result.current.state.selectionEnd).toBeUndefined();
    });
  });

  describe('History Management', () => {
    it('should support undo operation', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.insertText(' World');
      });
      
      // Trigger debounced history update
      act(() => {
        jest.advanceTimersByTime(600);
      });
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.state.text).toBe('Hello');
    });

    it('should support redo operation', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.insertText(' World');
      });
      
      // Trigger debounced history update
      act(() => {
        jest.advanceTimersByTime(600);
      });
      
      act(() => {
        result.current.undo();
        result.current.redo();
      });
      
      expect(result.current.state.text).toBe('Hello World');
    });

    it('should not undo beyond first history entry', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.state.text).toBe('Hello');
    });

    it('should not redo beyond last history entry', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.redo();
      });
      
      expect(result.current.state.text).toBe('Hello');
    });

    it('should limit history to 50 entries', () => {
      const { result } = renderHook(() => useTextEditor(''));
      
      // Add many history entries
      for (let i = 0; i < 60; i++) {
        act(() => {
          result.current.insertText(`${i}`);
          jest.advanceTimersByTime(600);
        });
      }
      
      expect(result.current.state.history.length).toBeLessThanOrEqual(50);
    });

    it('should clear future history when making changes after undo', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.insertText(' World');
        jest.advanceTimersByTime(600);
        result.current.insertText(' Test');
        jest.advanceTimersByTime(600);
        result.current.undo();
        result.current.insertText(' New');
        jest.advanceTimersByTime(600);
      });
      
      // Should not be able to redo "Test" anymore
      act(() => {
        result.current.redo();
      });
      
      expect(result.current.state.text).toBe('Hello World New');
    });
  });

  describe('Jump Operations', () => {
    it('should jump to start of text', () => {
      const { result } = renderHook(() => useTextEditor('Hello World'));
      
      act(() => {
        result.current.jumpToStart();
      });
      
      expect(result.current.state.cursorPosition).toBe(0);
      expect(result.current.state.currentLine).toBe(0);
      expect(result.current.state.currentColumn).toBe(0);
    });

    it('should jump to end of text', () => {
      const { result } = renderHook(() => useTextEditor('Hello World'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.jumpToEnd();
      });
      
      expect(result.current.state.cursorPosition).toBe(11);
    });

    it('should jump to start of current line', () => {
      const { result } = renderHook(() => useTextEditor('Line1\nLine2\nLine3'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('down'); // Go to Line2
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        result.current.jumpToLineStart();
      });
      
      expect(result.current.state.currentColumn).toBe(0);
      expect(result.current.state.currentLine).toBe(1);
    });

    it('should jump to end of current line', () => {
      const { result } = renderHook(() => useTextEditor('Line1\nLine2\nLine3'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('down'); // Go to Line2
        result.current.jumpToLineEnd();
      });
      
      expect(result.current.state.currentColumn).toBe(5); // Length of "Line2"
      expect(result.current.state.currentLine).toBe(1);
    });
  });

  describe('Word Navigation', () => {
    it('should move to next word', () => {
      const { result } = renderHook(() => useTextEditor('Hello World Test'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.wordNavigation('right');
      });
      
      expect(result.current.state.cursorPosition).toBeGreaterThan(0);
    });

    it('should move to previous word', () => {
      const { result } = renderHook(() => useTextEditor('Hello World Test'));
      
      act(() => {
        result.current.jumpToEnd();
        result.current.wordNavigation('left');
      });
      
      expect(result.current.state.cursorPosition).toBeLessThan(16);
    });

    it('should handle word navigation at text boundaries', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.wordNavigation('left');
      });
      
      expect(result.current.state.cursorPosition).toBe(0);
      
      act(() => {
        result.current.jumpToEnd();
        result.current.wordNavigation('right');
      });
      
      expect(result.current.state.cursorPosition).toBe(5);
    });
  });

  describe('Performance and Limits', () => {
    it('should handle text length limits', () => {
      const { result } = renderHook(() => useTextEditor(''));
      const longText = 'a'.repeat(15000); // Exceed MAX_TEXT_LENGTH
      
      act(() => {
        result.current.insertText(longText);
      });
      
      // Should be limited to MAX_TEXT_LENGTH (10000)
      expect(result.current.state.text.length).toBeLessThanOrEqual(10000);
    });

    it('should handle line count limits', () => {
      const { result } = renderHook(() => useTextEditor(''));
      const manyLines = Array(1200).fill('line').join('\n'); // Exceed MAX_LINES
      
      act(() => {
        result.current.insertText(manyLines);
      });
      
      // Should be limited to MAX_LINES (1000)
      expect(result.current.state.lines.length).toBeLessThanOrEqual(1000);
    });

    it('should debounce history updates', () => {
      const { result } = renderHook(() => useTextEditor(''));
      
      act(() => {
        result.current.insertText('a');
        result.current.insertText('b');
        result.current.insertText('c');
      });
      
      // History should not be updated yet (debounced)
      expect(result.current.state.history.length).toBe(1);
      
      act(() => {
        jest.advanceTimersByTime(600);
      });
      
      // Now history should be updated
      expect(result.current.state.history.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text operations', () => {
      const { result } = renderHook(() => useTextEditor(''));
      
      act(() => {
        result.current.deleteText('backspace');
        result.current.deleteText('delete');
        result.current.moveCursor('left');
        result.current.moveCursor('right');
        result.current.moveCursor('up');
        result.current.moveCursor('down');
      });
      
      expect(result.current.state.text).toBe('');
      expect(result.current.state.cursorPosition).toBe(0);
    });

    it('should handle operations on single character', () => {
      const { result } = renderHook(() => useTextEditor('a'));
      
      act(() => {
        result.current.selectAll();
        result.current.deleteText('selection');
      });
      
      expect(result.current.state.text).toBe('');
    });

    it('should handle rapid consecutive operations', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      act(() => {
        result.current.insertText(' ');
        result.current.insertText('W');
        result.current.insertText('o');
        result.current.insertText('r');
        result.current.insertText('l');
        result.current.insertText('d');
        result.current.deleteText('backspace');
        result.current.insertText('d');
      });
      
      expect(result.current.state.text).toBe('Hello World');
    });

    it('should maintain cursor position consistency', () => {
      const { result } = renderHook(() => useTextEditor('Line1\nLine2\nLine3'));
      
      act(() => {
        result.current.jumpToStart();
        result.current.moveCursor('down');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
      });
      
      const { cursorPosition, currentLine, currentColumn } = result.current.state;
      
      // Verify cursor position matches line/column calculation
      let expectedPosition = 0;
      for (let i = 0; i < currentLine; i++) {
        expectedPosition += result.current.state.lines[i].length + 1; // +1 for newline
      }
      expectedPosition += currentColumn;
      
      expect(cursorPosition).toBe(expectedPosition);
    });

    it('should handle text with special characters', () => {
      const specialText = 'Hello\t\nWorld\r\n🚀';
      const { result } = renderHook(() => useTextEditor(specialText));
      
      expect(result.current.state.text).toBe(specialText);
      expect(result.current.state.lines.length).toBeGreaterThan(1);
    });

    it('should handle undefined/null operations gracefully', () => {
      const { result } = renderHook(() => useTextEditor('Hello'));
      
      // These shouldn't crash
      act(() => {
        result.current.insertText('');
        result.current.selectText('left');
        result.current.selectText('right');
      });
      
      expect(result.current.state.text).toBe('Hello');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complex editing workflow', () => {
      const { result } = renderHook(() => useTextEditor(''));
      
      act(() => {
        // Type some text
        result.current.insertText('Hello World');
        jest.advanceTimersByTime(600);
        
        // Select and replace a word
        result.current.jumpToStart();
        result.current.selectText('right');
        result.current.selectText('right');
        result.current.selectText('right');
        result.current.selectText('right');
        result.current.selectText('right');
        result.current.insertText('Hi');
        jest.advanceTimersByTime(600);
        
        // Add a new line
        result.current.jumpToEnd();
        result.current.insertText('\nSecond line');
        jest.advanceTimersByTime(600);
        
        // Undo last change
        result.current.undo();
      });
      
      expect(result.current.state.text).toBe('Hi World');
      expect(result.current.state.lines).toEqual(['Hi World']);
    });

    it('should maintain state consistency during complex operations', () => {
      const { result } = renderHook(() => useTextEditor('First\nSecond\nThird'));
      
      act(() => {
        // Navigate to middle of second line
        result.current.jumpToStart();
        result.current.moveCursor('down');
        result.current.moveCursor('right');
        result.current.moveCursor('right');
        
        // Insert text and verify state
        result.current.insertText('XXX');
        
        // Delete across lines
        result.current.jumpToLineEnd();
        result.current.deleteText('delete');
        result.current.insertText(' - Modified');
      });
      
      // Verify final state is consistent
      expect(result.current.state.lines.length).toBeGreaterThan(0);
      expect(result.current.state.currentLine).toBeLessThan(result.current.state.lines.length);
      expect(result.current.state.currentColumn).toBeLessThanOrEqual(
        result.current.state.lines[result.current.state.currentLine]?.length || 0
      );
    });
  });
});