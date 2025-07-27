import { LogEntry } from '../hooks/useAgentLogs';

export interface ParsedLogEntry {
  id: string;
  timestamp: string;
  content: string;
  type: string;
  source: string;
  metadata: any;
  parsedContent: string;
  displayFormat: 'user' | 'assistant' | 'system' | 'error' | 'info';
  isVisible: boolean;
  toolUse?: {
    name: string;
    input: any;
  };
  toolResult?: {
    content: string;
    isError?: boolean;
  };
}

export interface LogParserOptions {
  showAllSources: boolean;
  showAllTypes: boolean;
  includeSystemLogs: boolean;
}

export class LogParser {
  static parseLogEntry(rawLog: LogEntry): ParsedLogEntry | null {
    try {
      const parsedEntry: ParsedLogEntry = {
        ...rawLog,
        parsedContent: rawLog.content,
        displayFormat: 'info',
        isVisible: true,
      };

      // Handle claude_sdk messages with JSON content
      if (rawLog.source === 'claude_sdk' && (rawLog.type === 'assistant' || rawLog.type === 'user')) {
        try {
          const sdkMessage = JSON.parse(rawLog.content);

          if (rawLog.type === 'assistant') {
            parsedEntry.displayFormat = 'assistant';

            if (sdkMessage.message?.content) {
              const { content } = sdkMessage.message;

              // Validate content is an array before processing
              if (!Array.isArray(content)) {
                throw new Error('Message content is not an array');
              }

              // Handle text content - filter out null/undefined items
              const textContent = content
                .filter((item: any) => item && typeof item === 'object' && item.type === 'text')
                .map((item: any) => item.text)
                .filter((text: string) => typeof text === 'string')
                .join(' ');

              // Handle tool use - filter out null/undefined items
              const toolUse = content.find((item: any) => item && typeof item === 'object' && item.type === 'tool_use');
              if (toolUse) {
                parsedEntry.toolUse = {
                  name: toolUse.name,
                  input: toolUse.input,
                };

                // Special handling for TodoWrite tool
                if (toolUse.name === 'TodoWrite' && toolUse.input?.todos && Array.isArray(toolUse.input.todos)) {
                  // Validate todos array and filter out invalid entries
                  const validTodos = toolUse.input.todos.filter((todo: any) => todo && typeof todo === 'object' && typeof todo.status === 'string');

                  const todoCount = validTodos.length;
                  const completedCount = validTodos.filter((todo: any) => todo.status === 'completed').length;
                  const inProgressCount = validTodos.filter((todo: any) => todo.status === 'in_progress').length;

                  parsedEntry.parsedContent = textContent
                    ? `${textContent}\n[TodoWrite: ${todoCount} tasks (${completedCount} completed, ${inProgressCount} in progress)]`
                    : `[TodoWrite: ${todoCount} tasks (${completedCount} completed, ${inProgressCount} in progress)]`;
                } else {
                  parsedEntry.parsedContent = textContent
                    ? `${textContent}\n[Tool: ${toolUse.name}]`
                    : `[Tool: ${toolUse.name}]`;
                }
              } else {
                parsedEntry.parsedContent = textContent;
              }
            }
          } else if (rawLog.type === 'user') {
            parsedEntry.displayFormat = 'user';

            if (sdkMessage.message?.content) {
              const { content } = sdkMessage.message;

              // Validate content is an array before processing
              if (!Array.isArray(content)) {
                throw new Error('Message content is not an array');
              }

              // Handle tool results - filter out null/undefined items
              const toolResult = content.find((item: any) => item && typeof item === 'object' && item.type === 'tool_result');
              if (toolResult) {
                parsedEntry.toolResult = {
                  content: toolResult.content,
                  isError: toolResult.is_error,
                };
                parsedEntry.parsedContent = `[Tool Result${toolResult.is_error ? ' - Error' : ''}]: ${toolResult.content}`;
              } else {
                // Handle regular user messages - filter out null/undefined items
                const textContent = content
                  .filter((item: any) => item && typeof item === 'object' && item.type === 'text')
                  .map((item: any) => item.text)
                  .filter((text: string) => typeof text === 'string')
                  .join(' ');
                parsedEntry.parsedContent = textContent;
              }
            }
          }
        } catch (parseError) {
          // Fall back to raw content if JSON parsing fails
          parsedEntry.parsedContent = `[Parse Error] ${rawLog.content}`;
          parsedEntry.displayFormat = 'error';
        }
      } else {
        // Handle non-claude_sdk messages
        switch (rawLog.type) {
          case 'system':
            parsedEntry.displayFormat = 'system';
            break;
          case 'error':
            parsedEntry.displayFormat = 'error';
            break;
          default:
            parsedEntry.displayFormat = 'info';
        }
        parsedEntry.parsedContent = rawLog.content;
      }

      return parsedEntry;
    } catch (error) {
      // Return null for completely malformed entries
      return null;
    }
  }

  static shouldShowLog(entry: ParsedLogEntry, options: LogParserOptions): boolean {
    // If showing all logs, show everything
    if (options.showAllSources && options.showAllTypes && options.includeSystemLogs) {
      return true;
    }

    // Default filtering: only claude_sdk user/assistant messages
    if (!options.showAllSources) {
      if (entry.source !== 'claude_sdk') {
        return false;
      }
    }

    if (!options.showAllTypes) {
      if (!['user', 'assistant'].includes(entry.type)) {
        return false;
      }
    }

    if (!options.includeSystemLogs) {
      if (entry.displayFormat === 'system') {
        return false;
      }
    }

    return true;
  }

  static formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return timestamp;
      }
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  }
}
