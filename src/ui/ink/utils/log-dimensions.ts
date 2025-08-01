import { ParsedLogEntry, LogParser } from './log-parser';

/**
 * Strip ANSI escape codes from text
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export interface LogDimensions {
  height: number; // Number of lines this log entry will take
  width: number; // Maximum width of the content
}

/**
 * Get the prefix for a log entry type
 */
function getPrefix(displayFormat: string): string {
  switch (displayFormat) {
    case 'user': return '► ';
    case 'assistant': return '◄ ';
    case 'system': return '[SYS] ';
    case 'error': return '[ERR] ';
    default: return '';
  }
}

/**
 * Calculate how many lines a text will take when wrapped
 */
function calculateWrappedLines(text: string, maxWidth: number): number {
  if (maxWidth <= 0) return 1;
  if (!text || text.length === 0) return 1;
  
  // Split by existing newlines first
  const lines = text.split('\n');
  let totalLines = 0;
  
  for (const line of lines) {
    if (line.length === 0) {
      totalLines += 1;
    } else {
      // Calculate how many terminal lines this text line will take
      totalLines += Math.ceil(line.length / maxWidth);
    }
  }
  
  return Math.max(1, totalLines);
}

/**
 * Calculate the dimensions of a log entry when rendered
 * Takes into account line wrapping based on terminal width
 */
export function calculateLogEntryDimensions(
  entry: ParsedLogEntry,
  terminalWidth: number,
  includeLineNumber: boolean = true,
): LogDimensions {
  // Calculate the prefix width
  const lineNumberWidth = includeLineNumber ? 5 : 0; // 4 digits + space
  const timestampWidth = LogParser.formatTimestamp(entry.timestamp).length + 3; // [timestamp] + space
  const prefixWidth = getPrefix(entry.displayFormat).length;
  
  // Total fixed width before content
  const fixedWidth = lineNumberWidth + timestampWidth + prefixWidth;
  
  // Available width for content
  const availableWidth = Math.max(1, terminalWidth - fixedWidth);
  
  // Get the actual content without ANSI codes
  const cleanContent = stripAnsi(entry.parsedContent);
  
  // Calculate number of lines needed
  const lines = calculateWrappedLines(cleanContent, availableWidth);
  
  return {
    height: lines,
    width: Math.min(cleanContent.length + fixedWidth, terminalWidth),
  };
}

/**
 * Calculate visible logs that fit within the content height
 * Returns the slice of logs that should be displayed
 */
export function calculateVisibleLogsSlice(
  logs: ParsedLogEntry[],
  scrollOffset: number,
  contentHeight: number,
  terminalWidth: number,
  includeLineNumbers: boolean = true,
): ParsedLogEntry[] {
  if (logs.length === 0) return [];
  
  // Start from scroll offset
  let currentHeight = 0;
  const visibleLogs: ParsedLogEntry[] = [];
  
  for (let i = scrollOffset; i < logs.length && currentHeight < contentHeight; i++) {
    const log = logs[i];
    const dimensions = calculateLogEntryDimensions(log, terminalWidth, includeLineNumbers);
    
    // Check if this log entry fits in the remaining space
    if (currentHeight + dimensions.height <= contentHeight) {
      visibleLogs.push(log);
      currentHeight += dimensions.height;
    } else {
      // If we can fit at least one line of this log, include it partially
      // Otherwise, stop here
      if (currentHeight === 0 || contentHeight - currentHeight >= 1) {
        visibleLogs.push(log);
      }
      break;
    }
  }
  
  return visibleLogs;
}

/**
 * Calculate the appropriate scroll offset for auto-scrolling
 * This ensures we show as many recent logs as possible that fit in the view
 */
export function calculateAutoScrollOffset(
  logs: ParsedLogEntry[],
  contentHeight: number,
  terminalWidth: number,
  includeLineNumbers: boolean = true,
): number {
  if (logs.length === 0) return 0;
  
  // Work backwards from the end to find the right offset
  let totalHeight = 0;
  let offset = logs.length;
  
  for (let i = logs.length - 1; i >= 0; i--) {
    const dimensions = calculateLogEntryDimensions(logs[i], terminalWidth, includeLineNumbers);
    
    if (totalHeight + dimensions.height > contentHeight) {
      // We've found the point where logs exceed the view
      offset = i + 1;
      break;
    }
    
    totalHeight += dimensions.height;
    offset = i;
  }
  
  return offset;
}

/**
 * Calculate the maximum valid scroll offset
 * This ensures scrolling doesn't go beyond what's needed
 */
export function calculateMaxScrollOffset(
  logs: ParsedLogEntry[],
  contentHeight: number,
  terminalWidth: number,
  includeLineNumbers: boolean = true,
): number {
  if (logs.length === 0) return 0;
  
  // Calculate total height of all logs
  let totalHeight = 0;
  for (const log of logs) {
    const dimensions = calculateLogEntryDimensions(log, terminalWidth, includeLineNumbers);
    totalHeight += dimensions.height;
  }
  
  // If all logs fit in the view, no scrolling needed
  if (totalHeight <= contentHeight) return 0;
  
  // Otherwise, find the maximum offset that still shows content
  return calculateAutoScrollOffset(logs, contentHeight, terminalWidth, includeLineNumbers);
}
