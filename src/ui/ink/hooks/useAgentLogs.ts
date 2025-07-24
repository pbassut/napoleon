import { useState, useEffect, useRef } from 'react';
import { promises as fs } from 'fs';

export interface LogEntry {
  id: string;
  timestamp: string;
  content: string;
  type: string;
  source: string;
  metadata: any;
}

interface UseAgentLogsParams {
  agentId: string;
  agentManager: any;
  refreshInterval?: number;
}

interface UseAgentLogsReturn {
  logs: LogEntry[];
  isLoading: boolean;
  error: Error | null;
}

export const useAgentLogs = ({ agentId, agentManager, refreshInterval = 1000 }: UseAgentLogsParams): UseAgentLogsReturn => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!agentId || !agentManager) return;

    const fetchLogs = async () => {
      try {
        // Get log path from agent manager
        const logPath = agentManager.agentLogManager?.getLogPath(agentId);
        if (!logPath) {
          setLogs([]);
          setIsLoading(false);
          return;
        }

        // Read log file
        // fs is now imported at the top
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

        setLogs(parsedLogs);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
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

  return { logs, isLoading, error };
};
