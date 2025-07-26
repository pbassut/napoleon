/**
 * Utility functions for text editor operations
 */

export interface TextPosition {
  line: number;
  column: number;
  position: number;
}

export interface TextSelection {
  start: TextPosition;
  end: TextPosition;
  text: string;
}

/**
 * Convert cursor position to line and column
 */
export function positionToLineColumn(text: string, position: number): TextPosition {
  const lines = text.split('\n');
  let currentPosition = 0;
  
  for (let line = 0; line < lines.length; line++) {
    const lineLength = lines[line].length;
    
    if (currentPosition + lineLength >= position) {
      return {
        line,
        column: position - currentPosition,
        position,
      };
    }
    
    currentPosition += lineLength + 1; // +1 for newline
  }
  
  // Position is at the end
  return {
    line: lines.length - 1,
    column: lines[lines.length - 1]?.length || 0,
    position,
  };
}

/**
 * Convert line and column to cursor position
 */
export function lineColumnToPosition(text: string, line: number, column: number): number {
  const lines = text.split('\n');
  let position = 0;
  
  for (let i = 0; i < line && i < lines.length; i++) {
    position += lines[i].length + 1; // +1 for newline
  }
  
  return position + Math.min(column, lines[line]?.length || 0);
}

/**
 * Get text selection between two positions
 */
export function getTextSelection(text: string, start: number, end: number): TextSelection {
  const normalizedStart = Math.min(start, end);
  const normalizedEnd = Math.max(start, end);
  
  return {
    start: positionToLineColumn(text, normalizedStart),
    end: positionToLineColumn(text, normalizedEnd),
    text: text.substring(normalizedStart, normalizedEnd),
  };
}

/**
 * Find word boundaries at a given position
 */
export function getWordBoundaries(text: string, position: number): { start: number; end: number } {
  let start = position;
  let end = position;
  
  // Find word start
  while (start > 0 && /\w/.test(text[start - 1])) {
    start--;
  }
  
  // Find word end
  while (end < text.length && /\w/.test(text[end])) {
    end++;
  }
  
  return { start, end };
}

/**
 * Find the next word position
 */
export function findNextWordPosition(text: string, position: number): number {
  let pos = position;
  
  // Skip current word
  while (pos < text.length && /\w/.test(text[pos])) {
    pos++;
  }
  
  // Skip whitespace
  while (pos < text.length && /\s/.test(text[pos])) {
    pos++;
  }
  
  return pos;
}

/**
 * Find the previous word position
 */
export function findPreviousWordPosition(text: string, position: number): number {
  let pos = position;
  
  // Skip whitespace
  while (pos > 0 && /\s/.test(text[pos - 1])) {
    pos--;
  }
  
  // Skip current word
  while (pos > 0 && /\w/.test(text[pos - 1])) {
    pos--;
  }
  
  return pos;
}

/**
 * Get line start position
 */
export function getLineStart(text: string, position: number): number {
  const { line } = positionToLineColumn(text, position);
  return lineColumnToPosition(text, line, 0);
}

/**
 * Get line end position
 */
export function getLineEnd(text: string, position: number): number {
  const lines = text.split('\n');
  const { line } = positionToLineColumn(text, position);
  
  if (line >= lines.length) {
    return text.length;
  }
  
  return lineColumnToPosition(text, line, lines[line].length);
}

/**
 * Insert text at position
 */
export function insertTextAtPosition(
  text: string,
  position: number,
  insertText: string
): { newText: string; newPosition: number } {
  const newText = text.substring(0, position) + insertText + text.substring(position);
  const newPosition = position + insertText.length;
  
  return { newText, newPosition };
}

/**
 * Delete text range
 */
export function deleteTextRange(
  text: string,
  start: number,
  end: number
): { newText: string; newPosition: number } {
  const normalizedStart = Math.min(start, end);
  const normalizedEnd = Math.max(start, end);
  
  const newText = text.substring(0, normalizedStart) + text.substring(normalizedEnd);
  const newPosition = normalizedStart;
  
  return { newText, newPosition };
}

/**
 * Replace selected text
 */
export function replaceSelectedText(
  text: string,
  start: number,
  end: number,
  replacement: string
): { newText: string; newPosition: number } {
  const normalizedStart = Math.min(start, end);
  const normalizedEnd = Math.max(start, end);
  
  const newText = text.substring(0, normalizedStart) + replacement + text.substring(normalizedEnd);
  const newPosition = normalizedStart + replacement.length;
  
  return { newText, newPosition };
}

/**
 * Count lines in text
 */
export function countLines(text: string): number {
  return text.split('\n').length;
}

/**
 * Get line at position
 */
export function getLineAtPosition(text: string, position: number): string {
  const { line } = positionToLineColumn(text, position);
  const lines = text.split('\n');
  return lines[line] || '';
}

/**
 * Indent text (add leading spaces/tabs)
 */
export function indentText(text: string, indentString: string = '  '): string {
  return text
    .split('\n')
    .map(line => line.length > 0 ? indentString + line : line)
    .join('\n');
}

/**
 * Unindent text (remove leading spaces/tabs)
 */
export function unindentText(text: string, indentString: string = '  '): string {
  return text
    .split('\n')
    .map(line => {
      if (line.startsWith(indentString)) {
        return line.substring(indentString.length);
      }
      return line;
    })
    .join('\n');
}