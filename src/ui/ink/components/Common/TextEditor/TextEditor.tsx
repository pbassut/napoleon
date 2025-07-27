import React, {
  useEffect, useCallback, useMemo,
} from 'react';
import { Box, Text, useInput } from 'ink';
import { useTextEditor } from './useTextEditor';
import { normalizeKey } from '../../../utils/input-normalizer';
import { getTextSelection } from './textEditorUtils';

export interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  multiline?: boolean;
  maxLines?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  showCursor?: boolean;
  showLineNumbers?: boolean;
  showPositionIndicator?: boolean;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  multiline = true,
  autoFocus = false,
  disabled = false,
  showCursor = true,
  showLineNumbers = false,
  showPositionIndicator = false,
}) => {
  const {
    state,
    moveCursor,
    insertText,
    deleteText,
    selectText,
    selectAll,
    undo,
    redo,
    jumpToStart,
    jumpToEnd,
    jumpToLineStart,
    jumpToLineEnd,
    wordNavigation,
  } = useTextEditor(value);

  // Sync external value changes
  useEffect(() => {
    if (value !== state.text) {
      onChange(value);
    }
  }, [value, state.text, onChange]);

  // Sync internal state changes to parent
  useEffect(() => {
    if (state.text !== value) {
      onChange(state.text);
    }
  }, [state.text, value, onChange]);

  const inputOptions = useMemo(() => ({
    isActive: !disabled && autoFocus,
  }), [disabled, autoFocus]);

  useInput((input: string, key: {
    escape?: boolean;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    return?: boolean;
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
    delete?: boolean;
    backspace?: boolean;
  }) => {
    if (disabled) return;

    const normalizedKey = normalizeKey(input, key);

    // Handle submission
    if (normalizedKey.return && !normalizedKey.shift && onSubmit) {
      // Enter without shift calls onSubmit (regardless of multiline mode)
      onSubmit();
      return;
    }

    // Handle Shift+Enter for new line (only in multiline mode)
    if (normalizedKey.shift && normalizedKey.return && multiline) {
      insertText('\n');
      return;
    }

    // Handle cursor movement
    if (normalizedKey.leftArrow) {
      if (normalizedKey.ctrl && normalizedKey.shift) {
        // Ctrl+Shift+Left: Select word to the left
        // TODO: Implement word-based selection
        selectText('left');
      } else if (normalizedKey.ctrl) {
        wordNavigation('left');
      } else if (normalizedKey.shift) {
        selectText('left');
      } else {
        moveCursor('left');
      }
      return;
    }

    if (normalizedKey.rightArrow) {
      if (normalizedKey.ctrl && normalizedKey.shift) {
        // Ctrl+Shift+Right: Select word to the right
        // TODO: Implement word-based selection
        selectText('right');
      } else if (normalizedKey.ctrl) {
        wordNavigation('right');
      } else if (normalizedKey.shift) {
        selectText('right');
      } else {
        moveCursor('right');
      }
      return;
    }

    if (normalizedKey.upArrow && multiline) {
      if (normalizedKey.shift) {
        selectText('up');
      } else {
        moveCursor('up');
      }
      return;
    }

    if (normalizedKey.downArrow && multiline) {
      if (normalizedKey.shift) {
        selectText('down');
      } else {
        moveCursor('down');
      }
      return;
    }

    // Handle Home/End keys
    if (normalizedKey.home) {
      if (normalizedKey.ctrl && normalizedKey.shift) {
        // Ctrl+Shift+Home: Select to beginning of document
        // TODO: Implement selection to document start
        jumpToStart();
      } else if (normalizedKey.ctrl) {
        jumpToStart();
      } else if (normalizedKey.shift) {
        // Shift+Home: Select to beginning of line
        // TODO: Implement selection to line start
        jumpToLineStart();
      } else {
        jumpToLineStart();
      }
      return;
    }

    if (normalizedKey.end) {
      if (normalizedKey.ctrl && normalizedKey.shift) {
        // Ctrl+Shift+End: Select to end of document
        // TODO: Implement selection to document end
        jumpToEnd();
      } else if (normalizedKey.ctrl) {
        jumpToEnd();
      } else if (normalizedKey.shift) {
        // Shift+End: Select to end of line
        // TODO: Implement selection to line end
        jumpToLineEnd();
      } else {
        jumpToLineEnd();
      }
      return;
    }

    // Handle text editing operations
    if (normalizedKey.backspace) {
      // If there's a selection, delete it; otherwise do normal backspace
      if (state.selectionStart !== undefined && state.selectionEnd !== undefined) {
        deleteText('selection');
      } else {
        deleteText('backspace');
      }
      return;
    }

    if (normalizedKey.delete) {
      // If there's a selection, delete it; otherwise do normal delete
      if (state.selectionStart !== undefined && state.selectionEnd !== undefined) {
        deleteText('selection');
      } else {
        deleteText('delete');
      }
      return;
    }

    // Handle special key combinations
    if (normalizedKey.ctrl) {
      switch (normalizedKey.name) {
        case 'a':
          selectAll();
          return;
        case 'z':
          if (normalizedKey.shift) {
            redo();
          } else {
            undo();
          }
          return;
        case 'y':
          redo();
          return;
        case 'x':
          // Cut operation - delete selected text
          if (state.selectionStart !== undefined && state.selectionEnd !== undefined) {
            const selection = getTextSelection(
              state.text,
              state.selectionStart,
              state.selectionEnd,
            );
            if (selection.text) {
              deleteText('selection');
            }
          }
          return;
        case 'c':
          // Copy operation - just show that text is copied
          if (state.selectionStart !== undefined && state.selectionEnd !== undefined) {
            getTextSelection(
              state.text,
              state.selectionStart,
              state.selectionEnd,
            );
            // In a real terminal app, this would copy to clipboard
            // For now, we just acknowledge the copy
          }
          return;
        case 'v':
          // Paste operation - in a real app this would paste from clipboard
          // For now, we'll just handle it as a placeholder
          return;
      }
    }

    // Handle tab
    if (normalizedKey.tab) {
      insertText('  '); // Insert 2 spaces for indentation
      return;
    }

    // Handle regular text input
    if (!normalizedKey.ctrl && !normalizedKey.meta && input && input.length === 1) {
      const charCode = input.charCodeAt(0);
      // Only insert printable characters
      if (charCode >= 32 || charCode === 9 || charCode === 10) {
        insertText(input);
      }
    }
  }, inputOptions);

  // Render text with cursor and selection
  const renderTextWithCursor = useCallback(() => {
    const { lines } = state;
    const { currentLine, currentColumn } = state;
    const hasSelection = state.selectionStart !== undefined && state.selectionEnd !== undefined;
    const maxLineNumWidth = showLineNumbers ? String(lines.length).length : 0;

    return lines.map((line, lineIndex) => {
      let lineContent;

      // Show placeholder for empty first line
      if (line.length === 0 && lineIndex === 0 && placeholder && !hasSelection) {
        lineContent = (
          <Text color="gray">
            {placeholder}
          </Text>
        );
      } else if (lineIndex === currentLine && showCursor && !disabled && !hasSelection) {
        // Handle cursor display on current line
        const beforeCursor = line.substring(0, currentColumn);
        const cursorChar = line[currentColumn] || ' ';
        const afterCursor = line.substring(currentColumn + 1);

        lineContent = (
          <Box>
            <Text>{beforeCursor}</Text>
            <Text inverse>{cursorChar}</Text>
            <Text>{afterCursor}</Text>
          </Box>
        );
      } else {
        // Regular line display
        lineContent = (
          <Text>
            {line || ' '}
          </Text>
        );
      }

      // Wrap with line number if enabled
      if (showLineNumbers) {
        const lineNum = (lineIndex + 1).toString().padStart(maxLineNumWidth, ' ');
        return (
          <Box key={lineIndex}>
            <Text color="gray" dimColor>
              {`${lineNum} │ `}
            </Text>
            {lineContent}
          </Box>
        );
      }

      return (
        <Box key={lineIndex}>
          {lineContent}
        </Box>
      );
    });
  }, [
    state.lines,
    state.currentLine,
    state.currentColumn,
    state.selectionStart,
    state.selectionEnd,
    showCursor,
    disabled,
    placeholder,
    showLineNumbers,
  ]);

  // Render selection highlighting (simplified for now)
  const hasSelection = state.selectionStart !== undefined && state.selectionEnd !== undefined;

  return (
    <Box flexDirection="column" width="100%">
      {renderTextWithCursor()}
      {showPositionIndicator && (
        <Box justifyContent="space-between">
          <Text color="gray" dimColor>
            {`Line ${state.currentLine + 1}, Col ${state.currentColumn + 1}`}
          </Text>
          {hasSelection && (
            <Text color="gray" dimColor>
              {`Selection: ${Math.abs((state.selectionEnd || 0) - (state.selectionStart || 0))} chars`}
            </Text>
          )}
        </Box>
      )}
      {hasSelection && !showPositionIndicator && (
        <Box>
          <Text color="gray" dimColor>
            {`Selection: ${Math.abs((state.selectionEnd || 0) - (state.selectionStart || 0))} chars`}
          </Text>
        </Box>
      )}
    </Box>
  );
};

TextEditor.whyDidYouRender = false;
