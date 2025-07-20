const {
  useState, useEffect, useCallback, useRef,
} = require('react');

// Agent status types from AgentManager
const AgentStatus = {
  SPAWNING: 'spawning',
  RUNNING: 'running',
  IDLE: 'idle',
  ERROR: 'error',
  TERMINATING: 'terminating',
};

/**
 * Hook to integrate Ink UI with AgentManager
 * Handles real-time synchronization of agent state
 *
 * @param {Object|null} agentManager - The AgentManager instance
 * @returns {Object} Hook return object with agents and methods
 */
const useAgentManager = (agentManager) => {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  // Convert AgentManager agent to UI Agent type
  const convertAgent = useCallback((agentData) => ({
    id: agentData.id,
    name: agentData.id, // Use ID as name for now
    status: agentData.status || 'unknown',
    startTime: agentData.createdAt ? new Date(agentData.createdAt) : new Date(),
    instructions: agentData.instructions,
    workingDirectory: agentData.workingDirectory,
    error: agentData.error,
    progress: agentData.progress,
  }), []);

  // Fetch agents from AgentManager
  const fetchAgents = useCallback(() => {
    if (!agentManager) {
      setAgents([]);
      setIsLoading(false);
      return;
    }

    try {
      const activeAgents = agentManager.getActiveAgents();
      const convertedAgents = activeAgents.map(convertAgent);
      setAgents(convertedAgents);
      setError(null);

      // Preserve selection if agent still exists
      if (selectedAgentId && !convertedAgents.find((a) => a.id === selectedAgentId)) {
        setSelectedAgentId(null);
      }
    } catch (err) {
      setError(err);
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [agentManager, convertAgent, selectedAgentId]);

  // Set up polling for agent updates
  // Note: In the future, this should be replaced with event-based updates
  useEffect(() => {
    if (!agentManager) return;

    // Initial fetch
    fetchAgents();

    // Poll for updates every 1.5 seconds (matching Blessed UI)
    pollIntervalRef.current = setInterval(fetchAgents, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [agentManager, fetchAgents]);

  // Select agent
  const selectAgent = useCallback((agentId) => {
    setSelectedAgentId(agentId);
  }, []);

  // Spawn new agent
  const spawnAgent = useCallback(async (instructions, workingDirectory) => {
    if (!agentManager) {
      throw new Error('AgentManager not initialized');
    }

    if (!agentManager.canSpawnAgent()) {
      throw new Error(`Maximum number of agents (${agentManager.maxAgents}) reached`);
    }

    try {
      await agentManager.spawnAgent({
        instructions,
        workingDirectory: workingDirectory || process.cwd(),
      });

      // Immediately fetch to show pending agent
      fetchAgents();
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [agentManager, fetchAgents]);

  // Terminate agent
  const terminateAgent = useCallback(async (agentId) => {
    if (!agentManager) {
      throw new Error('AgentManager not initialized');
    }

    try {
      await agentManager.terminateAgent(agentId);

      // Clear selection if terminated agent was selected
      if (selectedAgentId === agentId) {
        setSelectedAgentId(null);
      }

      // Immediately fetch to update list
      fetchAgents();
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [agentManager, selectedAgentId, fetchAgents]);

  return {
    agents,
    selectedAgentId,
    selectAgent,
    spawnAgent,
    terminateAgent,
    canSpawnAgent: agentManager?.canSpawnAgent() ?? false,
    maxAgents: agentManager?.maxAgents ?? 3,
    isLoading,
    error,
  };
};

module.exports = { useAgentManager };
