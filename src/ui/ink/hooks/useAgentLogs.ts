import { useState, useEffect, useRef, useCallback } from 'react';
import { promises as fs } from 'fs';

export interface LogEntry {
  id: string;
  timestamp: string;
  content: string;
  type: string;
  source: string;
  metadata: any;
}

interface LogStreamEvent {
  agentId: string;
  entry: LogEntry;
}

interface UseAgentLogsParams {
  agentId: string;
  agentManager: any;
  refreshInterval?: number;
  enableStreaming?: boolean;
}

interface UseAgentLogsReturn {
  logs: LogEntry[];
  isLoading: boolean;
  error: Error | null;
  isStreaming: boolean;
  streamingError: Error | null;
}

export const useAgentLogs = ({ 
  agentId, 
  agentManager, 
  refreshInterval = 1000, 
  enableStreaming = true 
}: UseAgentLogsParams): UseAgentLogsReturn => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const bufferRef = useRef<LogEntry[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const BUFFER_SIZE = 1000; // Keep last 1000 entries in memory
  const UPDATE_BATCH_DELAY = 50; // Batch updates every 50ms for performance

  // Performance-optimized function to add new log entries
  const addLogEntry = useCallback((entry: LogEntry) => {
    bufferRef.current.push(entry);
    
    // Maintain buffer size
    if (bufferRef.current.length > BUFFER_SIZE) {
      bufferRef.current = bufferRef.current.slice(-BUFFER_SIZE);
    }

    // Batch UI updates for performance
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      setLogs([...bufferRef.current]);
    }, UPDATE_BATCH_DELAY);
  }, []);

  // Load initial logs from file
  const loadInitialLogs = useCallback(async () => {
    try {
      // Get log path from agent manager
      const logPath = agentManager.agentLogManager?.getLogPath(agentId);
      if (!logPath) {
        setLogs([]);
        bufferRef.current = [];
        setIsLoading(false);
        return;
      }

      // Read log file
      const content = await fs.readFile(logPath, 'utf8');
      const lines = content.split('\n').filter((line: string) => line.trim());

      const parsedLogs: LogEntry[] = lines.map((line: string, index: number) => {
        try {
          const entry = JSON.parse(line);
          return {
            id: `${agentId}-${index}`,
            timestamp: entry.timestamp || new Date().toISOString(),
            content: entry.content || '',
            type: entry.type || 'info',
            source: entry.source || 'unknown',
            metadata: entry.metadata || {},
          };
        } catch (e) {
          // Handle non-JSON lines
          return {
            id: `${agentId}-${index}`,
            timestamp: new Date().toISOString(),
            content: line,
            type: 'raw',
            source: 'agent',
            metadata: {},
          };
        }
      });

      // Keep only the last BUFFER_SIZE entries
      const trimmedLogs = parsedLogs.length > BUFFER_SIZE 
        ? parsedLogs.slice(-BUFFER_SIZE) 
        : parsedLogs;
      
      setLogs(trimmedLogs);
      bufferRef.current = [...trimmedLogs];
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, agentManager]);

  // Setup streaming if available
  const setupStreaming = useCallback(() => {
    if (!enableStreaming || !agentManager?.agentLogManager) {
      return false;
    }

    try {
      const handleLogEntry = (event: LogStreamEvent) => {
        if (event.agentId === agentId) {
          addLogEntry(event.entry);
        }
      };

      // Subscribe to streaming events
      agentManager.agentLogManager.on('log-entry', handleLogEntry);
      agentManager.agentLogManager.subscribeToAgent(agentId);
      
      setIsStreaming(true);
      setStreamingError(null);

      return () => {
        agentManager.agentLogManager.off('log-entry', handleLogEntry);
        agentManager.agentLogManager.unsubscribeFromAgent(agentId);
        setIsStreaming(false);
      };
    } catch (err) {
      setStreamingError(err as Error);
      return false;
    }
  }, [agentId, agentManager, enableStreaming, addLogEntry]);

  // Setup polling fallback
  const setupPolling = useCallback(() => {
    const fetchLogs = async () => {
      try {
        // Get log path from agent manager
        const logPath = agentManager.agentLogManager?.getLogPath(agentId);
        if (!logPath) {
          setLogs([]);
          bufferRef.current = [];
          return;
        }

        // Read log file
        const content = await fs.readFile(logPath, 'utf8');
        const lines = content.split('\n').filter((line: string) => line.trim());

        const parsedLogs: LogEntry[] = lines.map((line: string, index: number) => {
          try {
            const entry = JSON.parse(line);
            return {
              id: `${agentId}-${index}`,
              timestamp: entry.timestamp || new Date().toISOString(),
              content: entry.content || '',
              type: entry.type || 'info',
              source: entry.source || 'unknown',
              metadata: entry.metadata || {},
            };
          } catch (e) {
            // Handle non-JSON lines
            return {
              id: `${agentId}-${index}`,
              timestamp: new Date().toISOString(),
              content: line,
              type: 'raw',
              source: 'agent',
              metadata: {},
            };
          }
        });

        // Keep only the last BUFFER_SIZE entries
        const trimmedLogs = parsedLogs.length > BUFFER_SIZE 
          ? parsedLogs.slice(-BUFFER_SIZE) 
          : parsedLogs;

        setLogs(trimmedLogs);
        bufferRef.current = [...trimmedLogs];
        setError(null);
      } catch (err) {
        setError(err as Error);
      }
    };

    // Initial fetch
    fetchLogs();

    // Set up polling
    intervalRef.current = setInterval(fetchLogs, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [agentId, agentManager, refreshInterval]);

  useEffect(() => {
    if (!agentId || !agentManager) return;

    let cleanupFn: (() => void) | null = null;

    const initialize = async () => {
      // Load initial logs from file
      await loadInitialLogs();

      // Try to setup streaming first
      const streamingCleanup = setupStreaming();
      
      if (streamingCleanup) {
        // Streaming is active
        cleanupFn = streamingCleanup;
      } else {
        // Fall back to polling
        console.warn('Streaming not available, falling back to polling mode');
        cleanupFn = setupPolling();
      }
    };

    initialize();

    return () => {
      // Clean up streaming or polling
      if (cleanupFn) {
        cleanupFn();
      }
      
      // Clean up batched update timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [agentId, agentManager, refreshInterval, enableStreaming, loadInitialLogs, setupStreaming, setupPolling]);

  return { 
    logs, 
    isLoading, 
    error, 
    isStreaming, 
    streamingError 
  };
};
