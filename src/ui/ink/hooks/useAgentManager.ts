import {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { Agent, AgentManager, AgentManagerHookReturn } from '../types';
import logger from '../../../utils/logger';

// Agent status types from AgentManager
// const AgentStatus = {
//   SPAWNING: 'spawning',
//   FORKING: 'forking',
//   STARTING: 'starting',
//   RUNNING: 'running',
//   PENDING: 'pending',
//   IDLE: 'idle',
//   ERROR: 'error',
//   FAILED: 'failed',
//   TERMINATED: 'terminated',
//   TERMINATING: 'terminating',
// };

/**
 * Hook to integrate Ink UI with AgentManager
 * Handles real-time synchronization of agent state
 */
export const useAgentManager = (agentManager: AgentManager | null): AgentManagerHookReturn => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convert AgentManager agent to UI Agent type
  const convertAgent = useCallback((agentData: {
    id: string;
    status?: string;
    spawnTime?: string | number;
    lastActivity?: string | number;
    instructions?: string;
    workingDirectory?: string;
    error?: string | Error;
    progress?: Record<string, unknown>;
    todos?: any[];
  }): Agent => ({
    id: agentData.id,
    name: agentData.id, // Use ID as name for now
    status: agentData.status || 'unknown',
    startTime: agentData.spawnTime ? new Date(agentData.spawnTime) : new Date(),
    lastActivity: agentData.lastActivity ? new Date(agentData.lastActivity) : undefined,
    instructions: agentData.instructions,
    workingDirectory: agentData.workingDirectory,
    error: agentData.error,
    progress: agentData.progress,
    todos: agentData.todos || [], // Include todos from agent data
  }), []);

  // will pull agent updates from the agent manager every 500ms
  // useEffect(() => {
  //   if (!agentManager) return;

  //   const interval = setInterval(() => {
  //     const activeAgents = agentManager.getActiveAgents();
  //     logger.debug('useAgentManager: Active agents', { activeAgents });
  //     setAgents(activeAgents.map(convertAgent));
  //   }, 500);

  //   return () => clearInterval(interval);
  // }, [agentManager]);

  // Set up polling for agent updates
  // Note: In the future, this should be replaced with event-based updates
  useEffect(() => {
    if (!agentManager) return;

    // Create a stable reference to fetchAgents to avoid recreating interval
    const stableFetchAgents = () => {
      if (!agentManager) {
        setAgents([]);
        setIsLoading(false);
        return;
      }

      try {
        const activeAgents = agentManager.getActiveAgents();
        // Enrich agents with todos data using getAgentDetails
        const enrichedAgents = activeAgents.map((agent) => {
          const agentDetails = agentManager.getAgentDetails(agent.id);
          return {
            ...agent,
            todos: agentDetails?.todos || [],
          };
        });
        const convertedAgents = enrichedAgents.map((agent: any) => convertAgent(agent));

        // Only update if agents actually changed
        setAgents((prevAgents) => {
          // Helper function to compare todos arrays
          const todosChanged = (prevTodos: unknown[], newTodos: unknown[]) => {
            if (prevTodos.length !== newTodos.length) return true;
            return prevTodos.some((prevTodo: any, i) => {
              const newTodo: any = newTodos[i];
              return !newTodo
                || prevTodo.id !== newTodo.id
                || prevTodo.status !== newTodo.status
                || prevTodo.content !== newTodo.content;
            });
          };

          const hasChanged = prevAgents.length !== convertedAgents.length
            || prevAgents.some((prevAgent, i) => {
              const newAgent = convertedAgents[i];
              if (!newAgent) return true;

              // Check basic agent properties
              const basicChanged = prevAgent.id !== newAgent.id
                || prevAgent.status !== newAgent.status
                || prevAgent.name !== newAgent.name;

              // Check todos array changes
              const todosChangedResult = todosChanged(prevAgent.todos || [], newAgent.todos || []);

              return basicChanged || todosChangedResult;
            });

          return hasChanged ? convertedAgents : prevAgents;
        });

        setError(null);

        // Check if selected agent still exists
        setSelectedAgentId((currentSelectedId) => {
          if (currentSelectedId && !convertedAgents.find((a) => a.id === currentSelectedId)) {
            return null;
          }
          return currentSelectedId;
        });
      } catch (err) {
        setError(err as Error);
        logger.error('Failed to fetch agents:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    stableFetchAgents();

    // Poll for updates every 500ms per spec
    pollIntervalRef.current = setInterval(stableFetchAgents, 500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [agentManager]); // Remove fetchAgents from dependencies

  // Select agent
  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
  }, []);

  // Spawn new agent
  const spawnAgent = useCallback(async (instructions, options) => {
    if (!agentManager) {
      throw new Error('AgentManager not initialized');
    }

    if (!agentManager.canSpawnAgent()) {
      throw new Error('Unable to spawn agent');
    }

    try {
      logger.debug('useAgentManager: Calling agentManager.spawnAgent', {
        ...options,
        instructions,
        instructionsType: typeof instructions,
        instructionsEmpty: !instructions || instructions.trim() === '',
      });

      const newAgent = await agentManager.spawnAgent(instructions, options);

      // Trigger a manual refresh without depending on fetchAgents
      if (agentManager) {
        const activeAgents = agentManager.getActiveAgents();
        // Enrich agents with todos data using getAgentDetails
        const enrichedAgents = activeAgents.map((agent) => {
          const details = agentManager.getAgentDetails(agent.id);
          return details || agent;
        });
        const convertedAgents = enrichedAgents.map((agent: any) => convertAgent(agent));
        setAgents(convertedAgents);

        return newAgent;
      }
    } catch (err) {
      logger.error('useAgentManager: Error in spawnAgent', { error: err });
      setError(err as Error);
      throw err;
    }
  }, [agentManager, convertAgent]);

  // Terminate agent
  const terminateAgent = useCallback(async (agentId: string, options = {}) => {
    if (!agentManager) {
      throw new Error('AgentManager not initialized');
    }

    try {
      await agentManager.terminateAgent(agentId, options);

      // Clear selection if terminated agent was selected
      setSelectedAgentId((currentSelectedId) => (currentSelectedId === agentId ? null : currentSelectedId));

      // Trigger a manual refresh without depending on fetchAgents
      if (agentManager) {
        const activeAgents = agentManager.getActiveAgents();
        // Enrich agents with todos data using getAgentDetails
        const enrichedAgents = activeAgents.map((agent) => {
          const agentDetails = agentManager.getAgentDetails(agent.id);
          return {
            ...agent,
            todos: agentDetails?.todos || [],
          };
        });
        const convertedAgents = enrichedAgents.map((agent: any) => convertAgent(agent));
        setAgents(convertedAgents);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [agentManager, convertAgent]);

  const canSpawnAgent = true;

  return {
    agents,
    selectedAgentId,
    selectAgent,
    spawnAgent,
    terminateAgent,
    canSpawnAgent,
    isLoading,
    error,
    addTempAgent: useCallback((agent: Agent) => {
      setAgents(prev => [...prev, agent]);
    }, []),
    updateTempAgent: useCallback((agentId: string, updates: Partial<Agent>) => {
      setAgents(prev => prev.map(a => (a.id === agentId ? { ...a, ...updates } : a)));
    }, []),
  };
};
