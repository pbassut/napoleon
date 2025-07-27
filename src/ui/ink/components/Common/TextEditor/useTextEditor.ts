import {
  useState, useCallback, useMemo, useRef,
} from 'react';

export interface TextEditorState {
  text: string;
  cursorPosition: number;
  selectionStart?: number;
  selectionEnd?: number;
  lines: string[];
  currentLine: number;
  currentColumn: number;
  history: string[];
  historyIndex: number;
}

interface EditOperation {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content: string;
  length?: number;
}

export function useTextEditor(initialValue: string = '') {
  const [state, setState] = useState<TextEditorState>(() => {
    const lines = initialValue.split('\n');
    return {
      text: initialValue,
      cursorPosition: initialValue.length,
      lines,
      currentLine: lines.length - 1,
      currentColumn: lines[lines.length - 1]?.length || 0,
      history: [initialValue],
      historyIndex: 0,
    };
  });

  // Performance optimization: limit the maximum text length
  const MAX_TEXT_LENGTH = 10000;
  const MAX_LINES = 1000;

  const debounceTimeout = useRef<NodeJS.Timeout>();

  // Helper function to update state and recalculate derived values
  const updateState = useCallback((newText: string, newCursorPosition?: number, addToHistory = true) => {
    setState((prevState) => {
      const lines = newText.split('\n');
      const cursorPos = newCursorPosition ?? prevState.cursorPosition;

      // Calculate current line and column from cursor position
      let currentLine = 0;
      let currentColumn = 0;
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= cursorPos) {
          currentLine = i;
          currentColumn = cursorPos - charCount;
          break;
        }
        charCount += lines[i].length + 1; // +1 for newline character
      }

      // Ensure cursor doesn't go beyond line length
      if (currentColumn > (lines[currentLine]?.length || 0)) {
        currentColumn = lines[currentLine]?.length || 0;
      }

      let newHistory = prevState.history;
      let newHistoryIndex = prevState.historyIndex;

      if (addToHistory && newText !== prevState.text) {
        // Clear redo history and add new state
        newHistory = [...prevState.history.slice(0, prevState.historyIndex + 1), newText];
        newHistoryIndex = newHistory.length - 1;

        // Limit history size to prevent memory issues
        if (newHistory.length > 50) {
          newHistory = newHistory.slice(-50);
          newHistoryIndex = newHistory.length - 1;
        }
      }

      return {
        ...prevState,
        text: newText,
        cursorPosition: cursorPos,
        lines,
        currentLine,
        currentColumn,
        history: newHistory,
        historyIndex: newHistoryIndex,
      };
    });
  }, []);

  // Debounced history update for rapid typing
  const addToHistoryDebounced = useCallback((text: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      setState((prevState) => {
        const newHistory = [...prevState.history.slice(0, prevState.historyIndex + 1), text];
        return {
          ...prevState,
          history: newHistory.length > 50 ? newHistory.slice(-50) : newHistory,
          historyIndex: Math.min(newHistory.length - 1, 49),
        };
      });
    }, 500);
  }, []);

  // Cursor movement functions
  const moveCursor = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    setState((prevState) => {
      let newCursorPosition = prevState.cursorPosition;
      let newLine = prevState.currentLine;
      let newColumn = prevState.currentColumn;

      switch (direction) {
        case 'left':
          if (newCursorPosition > 0) {
            newCursorPosition--;
            if (newColumn > 0) {
              newColumn--;
            } else if (newLine > 0) {
              newLine--;
              newColumn = prevState.lines[newLine]?.length || 0;
            }
          }
          break;

        case 'right':
          if (newCursorPosition < prevState.text.length) {
            newCursorPosition++;
            if (newColumn < (prevState.lines[newLine]?.length || 0)) {
              newColumn++;
            } else if (newLine < prevState.lines.length - 1) {
              newLine++;
              newColumn = 0;
            }
          }
          break;

        case 'up':
          if (newLine > 0) {
            newLine--;
            const prevLineLength = prevState.lines[newLine]?.length || 0;
            newColumn = Math.min(newColumn, prevLineLength);

            // Calculate new cursor position
            newCursorPosition = 0;
            for (let i = 0; i < newLine; i++) {
              newCursorPosition += (prevState.lines[i]?.length || 0) + 1;
            }
            newCursorPosition += newColumn;
          }
          break;

        case 'down':
          if (newLine < prevState.lines.length - 1) {
            newLine++;
            const nextLineLength = prevState.lines[newLine]?.length || 0;
            newColumn = Math.min(newColumn, nextLineLength);

            // Calculate new cursor position
            newCursorPosition = 0;
            for (let i = 0; i < newLine; i++) {
              newCursorPosition += (prevState.lines[i]?.length || 0) + 1;
            }
            newCursorPosition += newColumn;
          }
          break;
      }

      return {
        ...prevState,
        cursorPosition: newCursorPosition,
        currentLine: newLine,
        currentColumn: newColumn,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    });
  }, []);

  // Text insertion
  const insertText = useCallback((text: string) => {
    setState((prevState) => {
      let baseText = prevState.text;
      let insertPosition = prevState.cursorPosition;

      // If there's a selection, replace it with the new text
      if (prevState.selectionStart !== undefined && prevState.selectionEnd !== undefined) {
        const start = Math.min(prevState.selectionStart, prevState.selectionEnd);
        const end = Math.max(prevState.selectionStart, prevState.selectionEnd);

        baseText = prevState.text.substring(0, start) + prevState.text.substring(end);
        insertPosition = start;
      }

      const newText = baseText.substring(0, insertPosition)
        + text
        + baseText.substring(insertPosition);

      // Performance check: limit text length
      if (newText.length > MAX_TEXT_LENGTH) {
        return prevState; // Don't insert if it would exceed limit
      }

      const newCursorPosition = insertPosition + text.length;

      // Update lines
      const lines = newText.split('\n');

      // Performance check: limit line count
      if (lines.length > MAX_LINES) {
        return prevState; // Don't insert if it would exceed line limit
      }

      // Calculate new line and column
      let currentLine = 0;
      let currentColumn = 0;
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= newCursorPosition) {
          currentLine = i;
          currentColumn = newCursorPosition - charCount;
          break;
        }
        charCount += lines[i].length + 1;
      }

      addToHistoryDebounced(newText);

      return {
        ...prevState,
        text: newText,
        cursorPosition: newCursorPosition,
        lines,
        currentLine,
        currentColumn,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    });
  }, [addToHistoryDebounced]);

  // Text deletion
  const deleteText = useCallback((type: 'backspace' | 'delete' | 'selection') => {
    setState((prevState) => {
      if (prevState.text.length === 0) return prevState;

      let newText: string;
      let newCursorPosition: number;

      if (type === 'selection' && prevState.selectionStart !== undefined && prevState.selectionEnd !== undefined) {
        // Delete selected text
        const start = Math.min(prevState.selectionStart, prevState.selectionEnd);
        const end = Math.max(prevState.selectionStart, prevState.selectionEnd);

        newText = prevState.text.substring(0, start) + prevState.text.substring(end);
        newCursorPosition = start;
      } else if (type === 'backspace' && prevState.cursorPosition > 0) {
        newText = prevState.text.substring(0, prevState.cursorPosition - 1)
          + prevState.text.substring(prevState.cursorPosition);
        newCursorPosition = prevState.cursorPosition - 1;
      } else if (type === 'delete' && prevState.cursorPosition < prevState.text.length) {
        newText = prevState.text.substring(0, prevState.cursorPosition)
          + prevState.text.substring(prevState.cursorPosition + 1);
        newCursorPosition = prevState.cursorPosition;
      } else {
        return prevState;
      }

      // Update lines
      const lines = newText.split('\n');

      // Calculate new line and column
      let currentLine = 0;
      let currentColumn = 0;
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= newCursorPosition) {
          currentLine = i;
          currentColumn = newCursorPosition - charCount;
          break;
        }
        charCount += lines[i].length + 1;
      }

      addToHistoryDebounced(newText);

      return {
        ...prevState,
        text: newText,
        cursorPosition: newCursorPosition,
        lines,
        currentLine,
        currentColumn,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    });
  }, [addToHistoryDebounced]);

  // Text selection
  const selectText = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    setState((prevState) => {
      const selectionStart = prevState.selectionStart ?? prevState.cursorPosition;
      let newCursorPosition = prevState.cursorPosition;

      // Move cursor in specified direction
      switch (direction) {
        case 'left':
          if (newCursorPosition > 0) newCursorPosition--;
          break;
        case 'right':
          if (newCursorPosition < prevState.text.length) newCursorPosition++;
          break;
        case 'up':
        case 'down':
          // Simplified up/down selection - could be enhanced
          break;
      }

      return {
        ...prevState,
        cursorPosition: newCursorPosition,
        selectionStart,
        selectionEnd: newCursorPosition,
      };
    });
  }, []);

  // Select all
  const selectAll = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      selectionStart: 0,
      selectionEnd: prevState.text.length,
      cursorPosition: prevState.text.length,
    }));
  }, []);

  // Undo/Redo
  const undo = useCallback(() => {
    setState((prevState) => {
      if (prevState.historyIndex > 0) {
        const newIndex = prevState.historyIndex - 1;
        const newText = prevState.history[newIndex];
        const lines = newText.split('\n');

        return {
          ...prevState,
          text: newText,
          cursorPosition: newText.length,
          lines,
          currentLine: lines.length - 1,
          currentColumn: lines[lines.length - 1]?.length || 0,
          historyIndex: newIndex,
          selectionStart: undefined,
          selectionEnd: undefined,
        };
      }
      return prevState;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prevState) => {
      if (prevState.historyIndex < prevState.history.length - 1) {
        const newIndex = prevState.historyIndex + 1;
        const newText = prevState.history[newIndex];
        const lines = newText.split('\n');

        return {
          ...prevState,
          text: newText,
          cursorPosition: newText.length,
          lines,
          currentLine: lines.length - 1,
          currentColumn: lines[lines.length - 1]?.length || 0,
          historyIndex: newIndex,
          selectionStart: undefined,
          selectionEnd: undefined,
        };
      }
      return prevState;
    });
  }, []);

  // Jump to start/end
  const jumpToStart = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      cursorPosition: 0,
      currentLine: 0,
      currentColumn: 0,
      selectionStart: undefined,
      selectionEnd: undefined,
    }));
  }, []);

  const jumpToEnd = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      cursorPosition: prevState.text.length,
      currentLine: prevState.lines.length - 1,
      currentColumn: prevState.lines[prevState.lines.length - 1]?.length || 0,
      selectionStart: undefined,
      selectionEnd: undefined,
    }));
  }, []);

  const jumpToLineStart = useCallback(() => {
    setState((prevState) => {
      let newCursorPosition = 0;
      for (let i = 0; i < prevState.currentLine; i++) {
        newCursorPosition += (prevState.lines[i]?.length || 0) + 1;
      }

      return {
        ...prevState,
        cursorPosition: newCursorPosition,
        currentColumn: 0,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    });
  }, []);

  const jumpToLineEnd = useCallback(() => {
    setState((prevState) => {
      let newCursorPosition = 0;
      for (let i = 0; i < prevState.currentLine; i++) {
        newCursorPosition += (prevState.lines[i]?.length || 0) + 1;
      }
      newCursorPosition += prevState.lines[prevState.currentLine]?.length || 0;

      return {
        ...prevState,
        cursorPosition: newCursorPosition,
        currentColumn: prevState.lines[prevState.currentLine]?.length || 0,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    });
  }, []);

  // Word navigation
  const wordNavigation = useCallback((direction: 'left' | 'right') => {
    setState((prevState) => {
      const { text } = prevState;
      let position = prevState.cursorPosition;

      if (direction === 'left') {
        // Move to start of current word or previous word
        // Skip whitespace first
        while (position > 0 && /\s/.test(text[position - 1])) {
          position--;
        }
        // Skip word characters
        while (position > 0 && /\w/.test(text[position - 1])) {
          position--;
        }
      } else {
        // Move to end of current word or next word
        // Skip current word if we're in one
        while (position < text.length && /\w/.test(text[position])) {
          position++;
        }
        // Skip whitespace
        while (position < text.length && /\s/.test(text[position])) {
          position++;
        }
      }

      // Calculate line and column
      const lines = text.split('\n');
      let currentLine = 0;
      let currentColumn = 0;
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= position) {
          currentLine = i;
          currentColumn = position - charCount;
          break;
        }
        charCount += lines[i].length + 1;
      }

      return {
        ...prevState,
        cursorPosition: position,
        currentLine,
        currentColumn,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    });
  }, []);

  // Select word at cursor position
  const selectWordAtCursor = useCallback(() => {
    setState((prevState) => {
      const { text, cursorPosition } = prevState;
      let start = cursorPosition;
      let end = cursorPosition;

      // Find word boundaries
      // Move start to beginning of word
      while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
      }

      // Move end to end of word
      while (end < text.length && /\w/.test(text[end])) {
        end++;
      }

      // Only select if we found a word
      if (start < end) {
        return {
          ...prevState,
          selectionStart: start,
          selectionEnd: end,
          cursorPosition: end,
        };
      }

      return prevState;
    });
  }, []);

  return {
    state,
    moveCursor,
    insertText,
    deleteText,
    selectText,
    selectAll,
    selectWordAtCursor,
    undo,
    redo,
    jumpToStart,
    jumpToEnd,
    jumpToLineStart,
    jumpToLineEnd,
    wordNavigation,
  };
}
