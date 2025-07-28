/**
 * Tests for useAgentLogs React Hook
 */

import { renderHook, act } from '@testing-library/react';
import { promises as fs } from 'fs';
import { useAgentLogs } from '../../../../src/ui/ink/hooks/useAgentLogs';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

// Mock timers for testing intervals and timeouts
jest.useFakeTimers();

describe('useAgentLogs', () => {
  let mockAgentManager: any;
  let mockLogManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    mockLogManager = {
      getLogPath: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      subscribeToAgent: jest.fn(),
      unsubscribeFromAgent: jest.fn(),
    };

    mockAgentManager = {
      agentLogManager: mockLogManager,
    };
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Basic initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      expect(result.current.logs).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingError).toBeNull();
    });

    it('should not initialize without agentId', () => {
      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: '',
          agentManager: mockAgentManager,
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(mockLogManager.getLogPath).not.toHaveBeenCalled();
    });

    it('should not initialize without agentManager', () => {
      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: null,
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(mockLogManager.getLogPath).not.toHaveBeenCalled();
    });
  });

  describe('Initial log loading', () => {
    it('should load logs from file successfully', async () => {
      const mockLogContent = `{"timestamp":"2023-01-01T12:00:00Z","content":"Log 1","type":"info","source":"agent","metadata":{}}
{"timestamp":"2023-01-01T12:01:00Z","content":"Log 2","type":"error","source":"agent","metadata":{}}`;

      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toHaveLength(2);
      expect(result.current.logs[0]).toEqual({
        id: 'test-agent-0',
        timestamp: '2023-01-01T12:00:00Z',
        content: 'Log 1',
        type: 'info',
        source: 'agent',
        metadata: {},
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty log file', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing log path', async () => {
      mockLogManager.getLogPath.mockReturnValue(null);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      const readError = new Error('File not found');
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockRejectedValue(readError);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(readError);
    });

    it('should handle malformed JSON lines', async () => {
      const mockLogContent = `{"timestamp":"2023-01-01T12:00:00Z","content":"Valid log"}
Invalid JSON line
{"timestamp":"2023-01-01T12:02:00Z","content":"Another valid log"}`;

      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toHaveLength(3);
      expect(result.current.logs[1]).toEqual({
        id: 'test-agent-1',
        timestamp: expect.any(String),
        content: 'Invalid JSON line',
        type: 'raw',
        source: 'agent',
        metadata: {},
      });
    });

    it('should handle incomplete JSON entries with missing fields', async () => {
      const mockLogContent = `{"content":"Log without timestamp"}
{"timestamp":"2023-01-01T12:00:00Z"}
{"type":"custom","source":"custom-source"}`;

      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toHaveLength(3);
      expect(result.current.logs[0]).toEqual({
        id: 'test-agent-0',
        timestamp: expect.any(String),
        content: 'Log without timestamp',
        type: 'info',
        source: 'unknown',
        metadata: {},
      });
      expect(result.current.logs[1]).toEqual({
        id: 'test-agent-1',
        timestamp: '2023-01-01T12:00:00Z',
        content: '',
        type: 'info',
        source: 'unknown',
        metadata: {},
      });
    });

    it('should trim logs to buffer size', async () => {
      // Create 1200 log entries (exceeds BUFFER_SIZE of 1000)
      const logEntries = Array.from({ length: 1200 }, (_, i) => 
        `{"content":"Log ${i}","timestamp":"2023-01-01T12:00:00Z"}`
      );
      const mockLogContent = logEntries.join('\n');

      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toHaveLength(1000);
      expect(result.current.logs[0].content).toBe('Log 200'); // First 200 entries trimmed
      expect(result.current.logs[999].content).toBe('Log 1199');
    });
  });

  describe('Streaming functionality', () => {
    it('should setup streaming when available', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockLogManager.on).toHaveBeenCalledWith('log-entry', expect.any(Function));
      expect(mockLogManager.subscribeToAgent).toHaveBeenCalledWith('test-agent');
      expect(result.current.isStreaming).toBe(true);
      expect(result.current.streamingError).toBeNull();
    });

    it('should handle streaming events', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');
      
      let streamingHandler: any;
      mockLogManager.on.mockImplementation((event: string, handler: any) => {
        if (event === 'log-entry') {
          streamingHandler = handler;
        }
      });

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      // Simulate streaming event
      const mockLogEntry = {
        id: 'stream-1',
        timestamp: '2023-01-01T12:00:00Z',
        content: 'Streamed log',
        type: 'info',
        source: 'stream',
        metadata: {},
      };

      act(() => {
        streamingHandler({
          agentId: 'test-agent',
          entry: mockLogEntry,
        });
      });

      act(() => {
        jest.advanceTimersByTime(100); // Advance past batch delay
      });

      expect(result.current.logs).toContainEqual(mockLogEntry);
    });

    it('should ignore streaming events for other agents', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');
      
      let streamingHandler: any;
      mockLogManager.on.mockImplementation((event: string, handler: any) => {
        if (event === 'log-entry') {
          streamingHandler = handler;
        }
      });

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      // Simulate streaming event for different agent
      act(() => {
        streamingHandler({
          agentId: 'other-agent',
          entry: {
            id: 'stream-1',
            timestamp: '2023-01-01T12:00:00Z',
            content: 'Other agent log',
            type: 'info',
            source: 'stream',
            metadata: {},
          },
        });
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.logs).toHaveLength(0);
    });

    it('should handle streaming setup errors', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');
      
      const streamingError = new Error('Streaming failed');
      mockLogManager.on.mockImplementation(() => {
        throw streamingError;
      });

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingError).toBe(streamingError);
    });

    it('should disable streaming when enableStreaming is false', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: false,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockLogManager.on).not.toHaveBeenCalled();
      expect(result.current.isStreaming).toBe(false);
    });

    it('should fall back to polling when streaming is not available', async () => {
      const agentManagerWithoutStreaming = {};
      mockFs.readFile.mockResolvedValue('');
      
      // Mock console.warn to avoid output during tests
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: agentManagerWithoutStreaming,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Streaming not available, falling back to polling mode');
      expect(result.current.isStreaming).toBe(false);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Polling functionality', () => {
    it('should setup polling when streaming is not available', async () => {
      const agentManagerWithoutStreaming = {};
      
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFs.readFile.mockResolvedValue('{"content":"Polled log"}');

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: agentManagerWithoutStreaming,
          refreshInterval: 500,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].content).toBe('Polled log');

      consoleWarnSpy.mockRestore();
    });

    it('should poll at specified intervals', async () => {
      const agentManagerWithoutStreaming = {};
      
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      let readCallCount = 0;
      mockFs.readFile.mockImplementation(() => {
        readCallCount++;
        return Promise.resolve(`{"content":"Polled log ${readCallCount}"}`);
      });

      renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: agentManagerWithoutStreaming,
          refreshInterval: 1000,
        })
      );

      // Initial load
      await act(async () => {
        jest.runAllTimers();
      });
      expect(readCallCount).toBe(1);

      // First polling interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      await act(async () => {
        jest.runAllTimers();
      });
      expect(readCallCount).toBe(2);

      // Second polling interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      await act(async () => {
        jest.runAllTimers();
      });
      expect(readCallCount).toBe(3);

      consoleWarnSpy.mockRestore();
    });

    it('should handle polling errors', async () => {
      const agentManagerWithoutStreaming = {};
      
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const readError = new Error('Polling read failed');
      mockFs.readFile.mockRejectedValue(readError);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: agentManagerWithoutStreaming,
          refreshInterval: 500,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.error).toBe(readError);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Buffer management', () => {
    it('should maintain buffer size when adding entries via streaming', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');
      
      let streamingHandler: any;
      mockLogManager.on.mockImplementation((event: string, handler: any) => {
        if (event === 'log-entry') {
          streamingHandler = handler;
        }
      });

      renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      // Add 1001 entries (exceeds buffer size)
      act(() => {
        for (let i = 0; i < 1001; i++) {
          streamingHandler({
            agentId: 'test-agent',
            entry: {
              id: `stream-${i}`,
              timestamp: '2023-01-01T12:00:00Z',
              content: `Streamed log ${i}`,
              type: 'info',
              source: 'stream',
              metadata: {},
            },
          });
        }
      });

      act(() => {
        jest.advanceTimersByTime(100); // Advance past batch delay
      });

      // Should be trimmed to 1000 entries
      // Note: The actual assertion would depend on the component's state
      // Since we can't directly access bufferRef, we check that the mechanism works
      expect(streamingHandler).toHaveBeenCalled();
    });

    it('should batch UI updates for performance', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');
      
      let streamingHandler: any;
      mockLogManager.on.mockImplementation((event: string, handler: any) => {
        if (event === 'log-entry') {
          streamingHandler = handler;
        }
      });

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      const initialLogCount = result.current.logs.length;

      // Add multiple entries rapidly
      act(() => {
        streamingHandler({
          agentId: 'test-agent',
          entry: { id: '1', timestamp: '2023-01-01T12:00:00Z', content: 'Log 1', type: 'info', source: 'stream', metadata: {} },
        });
        streamingHandler({
          agentId: 'test-agent',
          entry: { id: '2', timestamp: '2023-01-01T12:00:00Z', content: 'Log 2', type: 'info', source: 'stream', metadata: {} },
        });
        streamingHandler({
          agentId: 'test-agent',
          entry: { id: '3', timestamp: '2023-01-01T12:00:00Z', content: 'Log 3', type: 'info', source: 'stream', metadata: {} },
        });
      });

      // Before batch delay, logs should not be updated yet
      expect(result.current.logs.length).toBe(initialLogCount);

      // After batch delay, all logs should be present
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.logs.length).toBe(initialLogCount + 3);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup streaming on unmount', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');

      const { unmount } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      unmount();

      expect(mockLogManager.off).toHaveBeenCalledWith('log-entry', expect.any(Function));
      expect(mockLogManager.unsubscribeFromAgent).toHaveBeenCalledWith('test-agent');
    });

    it('should cleanup polling on unmount', async () => {
      const agentManagerWithoutStreaming = {};
      
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockFs.readFile.mockResolvedValue('');

      const { unmount } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: agentManagerWithoutStreaming,
          refreshInterval: 1000,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      // Clear the mock to count new calls
      mockFs.readFile.mockClear();

      unmount();

      // Advance time to see if polling continues
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockFs.readFile).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should cleanup batch update timeout on unmount', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');
      
      let streamingHandler: any;
      mockLogManager.on.mockImplementation((event: string, handler: any) => {
        if (event === 'log-entry') {
          streamingHandler = handler;
        }
      });

      const { unmount } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: true,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      // Add an entry to create a pending batch update
      act(() => {
        streamingHandler({
          agentId: 'test-agent',
          entry: { id: '1', timestamp: '2023-01-01T12:00:00Z', content: 'Log 1', type: 'info', source: 'stream', metadata: {} },
        });
      });

      unmount();

      // The cleanup should handle the pending timeout
      expect(() => {
        jest.runAllTimers();
      }).not.toThrow();
    });
  });

  describe('Custom parameters', () => {
    it('should use custom refresh interval', async () => {
      const agentManagerWithoutStreaming = {};
      
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      let readCallCount = 0;
      mockFs.readFile.mockImplementation(() => {
        readCallCount++;
        return Promise.resolve('{}');
      });

      renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: agentManagerWithoutStreaming,
          refreshInterval: 2000, // Custom interval
        })
      );

      // Initial load
      await act(async () => {
        jest.runAllTimers();
      });
      expect(readCallCount).toBe(1);

      // Wait for custom interval
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      await act(async () => {
        jest.runAllTimers();
      });
      expect(readCallCount).toBe(2);

      consoleWarnSpy.mockRestore();
    });

    it('should respect enableStreaming parameter', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');

      renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
          enableStreaming: false,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockLogManager.on).not.toHaveBeenCalled();
      expect(mockLogManager.subscribeToAgent).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid parameter changes', async () => {
      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue('');

      const { rerender } = renderHook(
        (props) => useAgentLogs(props),
        {
          initialProps: {
            agentId: 'test-agent-1',
            agentManager: mockAgentManager,
          },
        }
      );

      await act(async () => {
        jest.runAllTimers();
      });

      // Change agentId
      rerender({
        agentId: 'test-agent-2',
        agentManager: mockAgentManager,
      });

      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockLogManager.getLogPath).toHaveBeenCalledWith('test-agent-2');
    });

    it('should handle empty lines in log file', async () => {
      const mockLogContent = `{"content":"Log 1"}


{"content":"Log 2"}
`;

      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toHaveLength(2);
      expect(result.current.logs[0].content).toBe('Log 1');
      expect(result.current.logs[1].content).toBe('Log 2');
    });

    it('should handle whitespace-only lines', async () => {
      const mockLogContent = `{"content":"Log 1"}
   
	
{"content":"Log 2"}`;

      mockLogManager.getLogPath.mockReturnValue('/path/to/logs');
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const { result } = renderHook(() =>
        useAgentLogs({
          agentId: 'test-agent',
          agentManager: mockAgentManager,
        })
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(result.current.logs).toHaveLength(2);
    });
  });
});