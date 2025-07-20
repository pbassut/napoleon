const { useState, useEffect, useRef } = require('react');

const useAgentLogs = ({ agentId, agentManager, refreshInterval = 1000 }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

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
        const fs = require('fs').promises;
        const content = await fs.readFile(logPath, 'utf8');
        const lines = content.split('\n').filter((line) => line.trim());

        const parsedLogs = lines.map((line, index) => {
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
        setError(err);
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

module.exports = { useAgentLogs };