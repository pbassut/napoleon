/**
 * Tests for LogParser utility
 */

import { LogParser, LogParserOptions } from '../../../../src/ui/ink/utils/log-parser';
import { LogEntry } from '../../../../src/ui/ink/hooks/useAgentLogs';

describe('LogParser', () => {
  describe('parseLogEntry', () => {
    describe('Basic functionality', () => {
      it('should handle simple log entries', () => {
        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: 'Simple log message',
          type: 'info',
          source: 'app',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result).toEqual({
          ...logEntry,
          parsedContent: 'Simple log message',
          displayFormat: 'info',
          isVisible: true
        });
      });

      it('should return null for completely malformed entries', () => {
        // Create a malformed entry that will cause JSON.parse to throw
        const malformedEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: 'malformed json {',
          type: 'assistant', 
          source: 'claude_sdk',
          metadata: {}
        } as LogEntry;

        const result = LogParser.parseLogEntry(malformedEntry);

        expect(result).toBeNull();
      });

      it('should handle entries with missing fields', () => {
        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: 'Test',
          type: 'info',
          source: 'app',
          metadata: undefined
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result).not.toBeNull();
        expect(result?.parsedContent).toBe('Test');
      });
    });

    describe('Non-claude_sdk message handling', () => {
      it('should handle system messages', () => {
        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: 'System message',
          type: 'system',
          source: 'app',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.displayFormat).toBe('system');
        expect(result?.parsedContent).toBe('System message');
      });

      it('should handle error messages', () => {
        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: 'Error occurred',
          type: 'error',
          source: 'app',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.displayFormat).toBe('error');
        expect(result?.parsedContent).toBe('Error occurred');
      });

      it('should default to info format for unknown types', () => {
        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: 'Unknown type message',
          type: 'debug',
          source: 'app',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.displayFormat).toBe('info');
        expect(result?.parsedContent).toBe('Unknown type message');
      });
    });

    describe('Claude SDK assistant message handling', () => {
      it('should parse assistant messages with text content', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'text', text: 'Hello world' }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.displayFormat).toBe('assistant');
        expect(result?.parsedContent).toBe('Hello world');
      });

      it('should handle multiple text content items', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'text', text: 'First part' },
              { type: 'text', text: 'Second part' }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('First part Second part');
      });

      it('should filter out null and undefined content items', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'text', text: 'Valid text' },
              null,
              undefined,
              { type: 'text', text: 'Another valid text' }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('Valid text Another valid text');
      });

      it('should handle tool use with text content', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'text', text: 'Using a tool' },
              { type: 'tool_use', name: 'TestTool', input: { param: 'value' } }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('Using a tool\n[Tool: TestTool]');
        expect(result?.toolUse).toEqual({
          name: 'TestTool',
          input: { param: 'value' }
        });
      });

      it('should handle tool use without text content', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'tool_use', name: 'TestTool', input: { param: 'value' } }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('[Tool: TestTool]');
        expect(result?.toolUse).toEqual({
          name: 'TestTool',
          input: { param: 'value' }
        });
      });

      it('should handle TodoWrite tool specially', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'text', text: 'Managing todos' },
              {
                type: 'tool_use',
                name: 'TodoWrite',
                input: {
                  todos: [
                    { status: 'completed', content: 'Task 1' },
                    { status: 'in_progress', content: 'Task 2' },
                    { status: 'pending', content: 'Task 3' }
                  ]
                }
              }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe(
          'Managing todos\n[TodoWrite: 3 tasks (1 completed, 1 in progress)]'
        );
      });

      it('should handle TodoWrite tool without text content', () => {
        const sdkMessage = {
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'TodoWrite',
                input: {
                  todos: [
                    { status: 'completed', content: 'Task 1' },
                    { status: 'pending', content: 'Task 2' }
                  ]
                }
              }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('[TodoWrite: 2 tasks (1 completed, 0 in progress)]');
      });

      it('should filter out invalid todos in TodoWrite', () => {
        const sdkMessage = {
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'TodoWrite',
                input: {
                  todos: [
                    { status: 'completed', content: 'Valid todo' },
                    null,
                    { content: 'Missing status' },
                    { status: 'pending', content: 'Another valid todo' }
                  ]
                }
              }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('[TodoWrite: 2 tasks (1 completed, 0 in progress)]');
      });

      it('should handle non-array content gracefully', () => {
        const sdkMessage = {
          message: {
            content: 'Not an array'
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.displayFormat).toBe('error');
        expect(result?.parsedContent).toContain('[Parse Error]');
      });

      it('should handle invalid JSON gracefully', () => {
        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: 'Invalid JSON{',
          type: 'assistant',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.displayFormat).toBe('error');
        expect(result?.parsedContent).toContain('[Parse Error]');
      });
    });

    describe('Claude SDK user message handling', () => {
      it('should parse user messages with text content', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'text', text: 'User message' }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'user',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.displayFormat).toBe('user');
        expect(result?.parsedContent).toBe('User message');
      });

      it('should handle tool results', () => {
        const sdkMessage = {
          message: {
            content: [
              { 
                type: 'tool_result', 
                content: 'Tool output',
                is_error: false
              }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'user',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('[Tool Result]: Tool output');
        expect(result?.toolResult).toEqual({
          content: 'Tool output',
          isError: false
        });
      });

      it('should handle tool results with errors', () => {
        const sdkMessage = {
          message: {
            content: [
              { 
                type: 'tool_result', 
                content: 'Error occurred',
                is_error: true
              }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'user',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('[Tool Result - Error]: Error occurred');
        expect(result?.toolResult).toEqual({
          content: 'Error occurred',
          isError: true
        });
      });

      it('should filter out null/undefined items in user messages', () => {
        const sdkMessage = {
          message: {
            content: [
              { type: 'text', text: 'Valid text' },
              null,
              undefined,
              { type: 'text', text: 'More text' }
            ]
          }
        };

        const logEntry: LogEntry = {
          id: '1',
          timestamp: '2023-01-01T12:00:00Z',
          content: JSON.stringify(sdkMessage),
          type: 'user',
          source: 'claude_sdk',
          metadata: {}
        };

        const result = LogParser.parseLogEntry(logEntry);

        expect(result?.parsedContent).toBe('Valid text More text');
      });
    });
  });

  describe('shouldShowLog', () => {
    const defaultOptions: LogParserOptions = {
      showAllSources: false,
      showAllTypes: false,
      includeSystemLogs: false
    };

    const mockEntry = {
      id: '1',
      timestamp: '2023-01-01T12:00:00Z',
      content: 'Test',
      type: 'assistant',
      source: 'claude_sdk',
      metadata: {},
      parsedContent: 'Test',
      displayFormat: 'assistant' as const,
      isVisible: true
    };

    it('should show all logs when all options are enabled', () => {
      const options: LogParserOptions = {
        showAllSources: true,
        showAllTypes: true,
        includeSystemLogs: true
      };

      const result = LogParser.shouldShowLog(mockEntry, options);

      expect(result).toBe(true);
    });

    it('should filter out non-claude_sdk sources by default', () => {
      const entry = { ...mockEntry, source: 'other_source' };

      const result = LogParser.shouldShowLog(entry, defaultOptions);

      expect(result).toBe(false);
    });

    it('should filter out non-user/assistant types by default', () => {
      const entry = { ...mockEntry, type: 'system' };

      const result = LogParser.shouldShowLog(entry, defaultOptions);

      expect(result).toBe(false);
    });

    it('should filter out system logs by default', () => {
      const entry = { ...mockEntry, displayFormat: 'system' as const };

      const result = LogParser.shouldShowLog(entry, defaultOptions);

      expect(result).toBe(false);
    });

    it('should show claude_sdk user/assistant messages by default', () => {
      const userEntry = { ...mockEntry, type: 'user', displayFormat: 'user' as const };
      const assistantEntry = { ...mockEntry, type: 'assistant', displayFormat: 'assistant' as const };

      expect(LogParser.shouldShowLog(userEntry, defaultOptions)).toBe(true);
      expect(LogParser.shouldShowLog(assistantEntry, defaultOptions)).toBe(true);
    });

    describe('Tool suppression', () => {
      it('should suppress tools matching patterns', () => {
        const entry = {
          ...mockEntry,
          toolUse: {
            name: 'TestTool',
            input: {}
          }
        };

        const options: LogParserOptions = {
          ...defaultOptions,
          toolSuppression: {
            enabled: true,
            suppressedTools: ['Test.*'],
            showToolResults: true
          }
        };

        const result = LogParser.shouldShowLog(entry, options);

        expect(result).toBe(false);
      });

      it('should not suppress non-matching tools', () => {
        const entry = {
          ...mockEntry,
          toolUse: {
            name: 'OtherTool',
            input: {}
          }
        };

        const options: LogParserOptions = {
          ...defaultOptions,
          toolSuppression: {
            enabled: true,
            suppressedTools: ['Test.*'],
            showToolResults: true
          }
        };

        const result = LogParser.shouldShowLog(entry, options);

        expect(result).toBe(true);
      });

      it('should only apply to assistant messages with toolUse', () => {
        const userEntry = {
          ...mockEntry,
          type: 'user',
          displayFormat: 'user' as const,
          toolUse: {
            name: 'TestTool',
            input: {}
          }
        };

        const options: LogParserOptions = {
          ...defaultOptions,
          toolSuppression: {
            enabled: true,
            suppressedTools: ['Test.*'],
            showToolResults: true
          }
        };

        const result = LogParser.shouldShowLog(userEntry, options);

        expect(result).toBe(true);
      });

      it('should not suppress when tool suppression is disabled', () => {
        const entry = {
          ...mockEntry,
          toolUse: {
            name: 'TestTool',
            input: {}
          }
        };

        const options: LogParserOptions = {
          ...defaultOptions,
          toolSuppression: {
            enabled: false,
            suppressedTools: ['Test.*'],
            showToolResults: true
          }
        };

        const result = LogParser.shouldShowLog(entry, options);

        expect(result).toBe(true);
      });
    });
  });

  describe('formatTimestamp', () => {
    it('should format valid timestamps', () => {
      const timestamp = '2023-01-01T12:30:45Z';

      const result = LogParser.formatTimestamp(timestamp);

      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should return original string for invalid timestamps', () => {
      const invalidTimestamp = 'invalid-date';

      const result = LogParser.formatTimestamp(invalidTimestamp);

      expect(result).toBe('invalid-date');
    });

    it('should handle empty strings', () => {
      const result = LogParser.formatTimestamp('');

      expect(result).toBe('');
    });

    it('should handle timestamp parsing errors', () => {
      const malformedTimestamp = '2023-13-40T25:70:90Z';

      const result = LogParser.formatTimestamp(malformedTimestamp);

      expect(result).toBe(malformedTimestamp);
    });

    it('should format timestamps consistently', () => {
      const timestamp = '2023-01-01T09:05:03Z';

      const result = LogParser.formatTimestamp(timestamp);

      // Should be in HH:MM:SS format with zero padding
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle entries with missing message property', () => {
      const sdkMessage = {};

      const logEntry: LogEntry = {
        id: '1',
        timestamp: '2023-01-01T12:00:00Z',
        content: JSON.stringify(sdkMessage),
        type: 'assistant',
        source: 'claude_sdk',
        metadata: {}
      };

      const result = LogParser.parseLogEntry(logEntry);

      expect(result?.displayFormat).toBe('assistant');
      expect(result?.parsedContent).toBe('{}');
    });

    it('should handle entries with empty content array', () => {
      const sdkMessage = {
        message: {
          content: []
        }
      };

      const logEntry: LogEntry = {
        id: '1',
        timestamp: '2023-01-01T12:00:00Z',
        content: JSON.stringify(sdkMessage),
        type: 'assistant',
        source: 'claude_sdk',
        metadata: {}
      };

      const result = LogParser.parseLogEntry(logEntry);

      expect(result?.parsedContent).toBe('');
    });

    it('should handle malformed tool use objects', () => {
      const sdkMessage = {
        message: {
          content: [
            { type: 'tool_use' } // Missing name and input
          ]
        }
      };

      const logEntry: LogEntry = {
        id: '1',
        timestamp: '2023-01-01T12:00:00Z',
        content: JSON.stringify(sdkMessage),
        type: 'assistant',
        source: 'claude_sdk',
        metadata: {}
      };

      const result = LogParser.parseLogEntry(logEntry);

      expect(result?.toolUse).toBeDefined();
      expect(result?.parsedContent).toContain('[Tool:');
    });

    it('should handle TodoWrite with malformed todos', () => {
      const sdkMessage = {
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'TodoWrite',
              input: {
                todos: 'not an array'
              }
            }
          ]
        }
      };

      const logEntry: LogEntry = {
        id: '1',
        timestamp: '2023-01-01T12:00:00Z',
        content: JSON.stringify(sdkMessage),
        type: 'assistant',
        source: 'claude_sdk',
        metadata: {}
      };

      const result = LogParser.parseLogEntry(logEntry);

      expect(result?.parsedContent).toBe('[Tool: TodoWrite]');
    });
  });
});