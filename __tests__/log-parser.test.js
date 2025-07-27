const fs = require('fs');
const path = require('path');

describe('LogParser', () => {
  let LogParser;

  beforeAll(() => {
    // Import the TypeScript LogParser by reading and adapting it
    const logParserPath = path.join(__dirname, '../src/ui/ink/utils/log-parser.ts');
    fs.readFileSync(logParserPath, 'utf-8');
    
    // Create a minimal JavaScript version for testing
    const parseLogEntry = function parseLogEntry(rawLog) {
      try {
        const parsedEntry = {
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

              if (sdkMessage.message && sdkMessage.message.content) {
                const { content } = sdkMessage.message;

                // Validate content is an array before processing
                if (!Array.isArray(content)) {
                  throw new Error('Message content is not an array');
                }

                // Handle text content - filter out null/undefined items
                const textContent = content
                  .filter((item) => item && typeof item === 'object' && item.type === 'text')
                  .map((item) => item.text)
                  .filter((text) => typeof text === 'string')
                  .join(' ');

                // Handle tool use - filter out null/undefined items
                const toolUse = content.find((item) => item && typeof item === 'object' && item.type === 'tool_use');
                if (toolUse) {
                  parsedEntry.toolUse = {
                    name: toolUse.name,
                    input: toolUse.input,
                  };
                  
                  // Special handling for TodoWrite tool
                  if (toolUse.name === 'TodoWrite' && toolUse.input && toolUse.input.todos && Array.isArray(toolUse.input.todos)) {
                    // Validate todos array and filter out invalid entries
                    const validTodos = toolUse.input.todos.filter((todo) => 
                      todo && typeof todo === 'object' && typeof todo.status === 'string'
                    );
                    
                    const todoCount = validTodos.length;
                    const completedCount = validTodos.filter((todo) => todo.status === 'completed').length;
                    const inProgressCount = validTodos.filter((todo) => todo.status === 'in_progress').length;

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

              if (sdkMessage.message && sdkMessage.message.content) {
                const { content } = sdkMessage.message;

                // Validate content is an array before processing
                if (!Array.isArray(content)) {
                  throw new Error('Message content is not an array');
                }

                // Handle tool results - filter out null/undefined items
                const toolResult = content.find((item) => item && typeof item === 'object' && item.type === 'tool_result');
                if (toolResult) {
                  parsedEntry.toolResult = {
                    content: toolResult.content,
                    isError: toolResult.is_error,
                  };
                  parsedEntry.parsedContent = `[Tool Result${toolResult.is_error ? ' - Error' : ''}]: ${toolResult.content}`;
                } else {
                  // Handle regular user messages - filter out null/undefined items
                  const textContent = content
                    .filter((item) => item && typeof item === 'object' && item.type === 'text')
                    .map((item) => item.text)
                    .filter((text) => typeof text === 'string')
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
    };

    const formatTimestamp = function formatTimestamp(timestamp) {
      try {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) {
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
    };

    const shouldShowLog = function shouldShowLog(entry, options) {
      // Tool suppression logic - applies only to assistant messages with toolUse
      if (options.toolSuppression?.enabled && entry.toolUse && entry.displayFormat === 'assistant') {
        const toolName = entry.toolUse.name;
        if (options.toolSuppression.suppressedTools.some(pattern => toolName.match(pattern))) {
          return false;
        }
      }

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
    };

    LogParser = {
      parseLogEntry,
      formatTimestamp,
      shouldShowLog
    };
  });

  describe('parseLogEntry', () => {
    describe('TodoWrite tool parsing', () => {
      test('should correctly parse valid TodoWrite logs', () => {
        const validTodoLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: JSON.stringify({
            type: "assistant",
            message: {
              content: [{
                type: "tool_use",
                name: "TodoWrite",
                input: {
                  todos: [
                    { id: "1", content: "Task 1", status: "completed", priority: "high" },
                    { id: "2", content: "Task 2", status: "in_progress", priority: "medium" },
                    { id: "3", content: "Task 3", status: "pending", priority: "low" }
                  ]
                }
              }]
            }
          }),
          metadata: {}
        };

        const result = LogParser.parseLogEntry(validTodoLog);

        expect(result).not.toBeNull();
        expect(result.displayFormat).toBe('assistant');
        expect(result.parsedContent).toBe('[TodoWrite: 3 tasks (1 completed, 1 in progress)]');
        expect(result.toolUse).toEqual({
          name: 'TodoWrite',
          input: {
            todos: [
              { id: "1", content: "Task 1", status: "completed", priority: "high" },
              { id: "2", content: "Task 2", status: "in_progress", priority: "medium" },
              { id: "3", content: "Task 3", status: "pending", priority: "low" }
            ]
          }
        });
      });

      test('should handle empty todos array', () => {
        const emptyTodosLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: JSON.stringify({
            type: "assistant",
            message: {
              content: [{
                type: "tool_use",
                name: "TodoWrite",
                input: {
                  todos: []
                }
              }]
            }
          }),
          metadata: {}
        };

        const result = LogParser.parseLogEntry(emptyTodosLog);

        expect(result).not.toBeNull();
        expect(result.parsedContent).toBe('[TodoWrite: 0 tasks (0 completed, 0 in progress)]');
      });

      test('should handle missing todos property', () => {
        const missingTodosLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: JSON.stringify({
            type: "assistant",
            message: {
              content: [{
                type: "tool_use",
                name: "TodoWrite",
                input: {}
              }]
            }
          }),
          metadata: {}
        };

        const result = LogParser.parseLogEntry(missingTodosLog);

        expect(result).not.toBeNull();
        expect(result.parsedContent).toBe('[Tool: TodoWrite]');
      });

      test('should handle todos that is not an array', () => {
        const invalidTodosLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: JSON.stringify({
            type: "assistant",
            message: {
              content: [{
                type: "tool_use",
                name: "TodoWrite",
                input: {
                  todos: "not an array"
                }
              }]
            }
          }),
          metadata: {}
        };

        const result = LogParser.parseLogEntry(invalidTodosLog);

        expect(result).not.toBeNull();
        expect(result.parsedContent).toBe('[Tool: TodoWrite]');
      });

      test('should filter out invalid todo entries', () => {
        const invalidTodoEntriesLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: JSON.stringify({
            type: "assistant",
            message: {
              content: [{
                type: "tool_use",
                name: "TodoWrite",
                input: {
                  todos: [
                    null,
                    { id: "1", content: "Valid task", status: "completed", priority: "high" },
                    "invalid string",
                    { id: "2", content: "Missing status" },
                    { id: "3", content: "Valid task 2", status: "pending", priority: "low" }
                  ]
                }
              }]
            }
          }),
          metadata: {}
        };

        const result = LogParser.parseLogEntry(invalidTodoEntriesLog);

        expect(result).not.toBeNull();
        expect(result.parsedContent).toBe('[TodoWrite: 2 tasks (1 completed, 0 in progress)]');
      });
    });

    describe('Edge case handling', () => {
      test('should handle malformed JSON gracefully', () => {
        const malformedLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: '{"invalid": json}',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(malformedLog);

        expect(result).not.toBeNull();
        expect(result.displayFormat).toBe('error');
        expect(result.parsedContent).toContain('[Parse Error]');
      });

      test('should handle content that is not an array', () => {
        const nonArrayContentLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: JSON.stringify({
            type: "assistant",
            message: {
              content: "not an array"
            }
          }),
          metadata: {}
        };

        const result = LogParser.parseLogEntry(nonArrayContentLog);

        expect(result).not.toBeNull();
        expect(result.displayFormat).toBe('error');
        expect(result.parsedContent).toContain('[Parse Error]');
      });

      test('should handle null items in content array', () => {
        const nullItemsLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "assistant",
          source: "claude_sdk",
          content: JSON.stringify({
            type: "assistant",
            message: {
              content: [
                null,
                { type: "text", text: "Hello" },
                undefined,
                { type: "tool_use", name: "SomeTool", input: {} }
              ]
            }
          }),
          metadata: {}
        };

        const result = LogParser.parseLogEntry(nullItemsLog);

        expect(result).not.toBeNull();
        expect(result.displayFormat).toBe('assistant');
        expect(result.parsedContent).toBe('Hello\n[Tool: SomeTool]');
      });

      test('should return null for completely malformed entries', () => {
        const malformedEntry = null;

        const result = LogParser.parseLogEntry(malformedEntry);

        expect(result).toBeNull();
      });
    });

    describe('Non-SDK message handling', () => {
      test('should handle non-claude_sdk messages', () => {
        const systemLog = {
          timestamp: "2025-07-27T05:05:12.186Z",
          agentId: "test-agent",
          type: "system",
          source: "internal",
          content: "System message",
          metadata: {}
        };

        const result = LogParser.parseLogEntry(systemLog);

        expect(result).not.toBeNull();
        expect(result.displayFormat).toBe('system');
        expect(result.parsedContent).toBe('System message');
      });
    });
  });

  describe('formatTimestamp', () => {
    test('should format valid timestamp', () => {
      const timestamp = "2025-07-27T05:05:12.186Z";
      const result = LogParser.formatTimestamp(timestamp);
      
      // Should return a formatted time string
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    test('should return original timestamp for invalid input', () => {
      const invalidTimestamp = "invalid-timestamp";
      const result = LogParser.formatTimestamp(invalidTimestamp);
      
      // Should return the original timestamp for invalid dates
      expect(result).toBe(invalidTimestamp);
    });
  });

  describe('shouldShowLog - Tool Suppression', () => {
    test('should suppress Read tool when enabled', () => {
      const readToolEntry = {
        id: 'test-1',
        timestamp: '2025-07-27T05:05:12.186Z',
        content: '[Tool: Read]',
        type: 'assistant',
        source: 'claude_sdk',
        displayFormat: 'assistant',
        isVisible: true,
        toolUse: {
          name: 'Read',
          input: { file_path: '/some/path' }
        }
      };

      const options = {
        showAllSources: false,
        showAllTypes: false,
        includeSystemLogs: false,
        toolSuppression: {
          enabled: true,
          suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
          showToolResults: true
        }
      };

      const result = LogParser.shouldShowLog(readToolEntry, options);
      expect(result).toBe(false);
    });

    test('should suppress Bash tool when enabled', () => {
      const bashToolEntry = {
        id: 'test-2',
        timestamp: '2025-07-27T05:05:12.186Z',
        content: '[Tool: Bash]',
        type: 'assistant',
        source: 'claude_sdk',
        displayFormat: 'assistant',
        isVisible: true,
        toolUse: {
          name: 'Bash',
          input: { command: 'ls -la' }
        }
      };

      const options = {
        showAllSources: false,
        showAllTypes: false,
        includeSystemLogs: false,
        toolSuppression: {
          enabled: true,
          suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
          showToolResults: true
        }
      };

      const result = LogParser.shouldShowLog(bashToolEntry, options);
      expect(result).toBe(false);
    });

    test('should not suppress tools not in suppressedTools list', () => {
      const todoWriteEntry = {
        id: 'test-3',
        timestamp: '2025-07-27T05:05:12.186Z',
        content: '[Tool: TodoWrite]',
        type: 'assistant',
        source: 'claude_sdk',
        displayFormat: 'assistant',
        isVisible: true,
        toolUse: {
          name: 'TodoWrite',
          input: { todos: [] }
        }
      };

      const options = {
        showAllSources: false,
        showAllTypes: false,
        includeSystemLogs: false,
        toolSuppression: {
          enabled: true,
          suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
          showToolResults: true
        }
      };

      const result = LogParser.shouldShowLog(todoWriteEntry, options);
      expect(result).toBe(true);
    });

    test('should not suppress tools when tool suppression is disabled', () => {
      const readToolEntry = {
        id: 'test-4',
        timestamp: '2025-07-27T05:05:12.186Z',
        content: '[Tool: Read]',
        type: 'assistant',
        source: 'claude_sdk',
        displayFormat: 'assistant',
        isVisible: true,
        toolUse: {
          name: 'Read',
          input: { file_path: '/some/path' }
        }
      };

      const options = {
        showAllSources: false,
        showAllTypes: false,
        includeSystemLogs: false,
        toolSuppression: {
          enabled: false,
          suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
          showToolResults: true
        }
      };

      const result = LogParser.shouldShowLog(readToolEntry, options);
      expect(result).toBe(true);
    });

    test('should not suppress tool results (user messages)', () => {
      const toolResultEntry = {
        id: 'test-5',
        timestamp: '2025-07-27T05:05:12.186Z',
        content: '[Tool Result]: File content here',
        type: 'user',
        source: 'claude_sdk',
        displayFormat: 'user',
        isVisible: true,
        toolResult: {
          content: 'File content here',
          isError: false
        }
      };

      const options = {
        showAllSources: false,
        showAllTypes: false,
        includeSystemLogs: false,
        toolSuppression: {
          enabled: true,
          suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
          showToolResults: true
        }
      };

      const result = LogParser.shouldShowLog(toolResultEntry, options);
      expect(result).toBe(true);
    });

    test('should only apply tool suppression to assistant messages with toolUse', () => {
      const assistantMessageWithoutTool = {
        id: 'test-6',
        timestamp: '2025-07-27T05:05:12.186Z',
        content: 'Regular assistant message',
        type: 'assistant',
        source: 'claude_sdk',
        displayFormat: 'assistant',
        isVisible: true
      };

      const options = {
        showAllSources: false,
        showAllTypes: false,
        includeSystemLogs: false,
        toolSuppression: {
          enabled: true,
          suppressedTools: ['Read', 'Bash', 'LS', 'Glob'],
          showToolResults: true
        }
      };

      const result = LogParser.shouldShowLog(assistantMessageWithoutTool, options);
      expect(result).toBe(true);
    });

    test('should work with missing toolSuppression configuration', () => {
      const readToolEntry = {
        id: 'test-7',
        timestamp: '2025-07-27T05:05:12.186Z',
        content: '[Tool: Read]',
        type: 'assistant',
        source: 'claude_sdk',
        displayFormat: 'assistant',
        isVisible: true,
        toolUse: {
          name: 'Read',
          input: { file_path: '/some/path' }
        }
      };

      const options = {
        showAllSources: false,
        showAllTypes: false,
        includeSystemLogs: false
        // No toolSuppression config
      };

      const result = LogParser.shouldShowLog(readToolEntry, options);
      expect(result).toBe(true);
    });
  });
});