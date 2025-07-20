import { useState, useEffect, useCallback, useRef } from 'react';
import { Agent, AgentManager, AgentManagerHookReturn } from '../types';

// Debug counter for render tracking
let renderCount = 0;
let fetchAgentsCallCount = 0;
let effectRunCount = 0;

// Agent status types from AgentManager
const AgentStatus = {
  SPAWNING: 'spawning',
  RUNNING: 'running',
  IDLE: 'idle',
  ERROR: 'error',
  TERMINATING: 'terminating',
};

/**
 * Hook to integrate Ink UI with AgentManager - DEBUG VERSION
 * Handles real-time synchronization of agent state
 */
export const useAgentManager = (agentManager: AgentManager | null): AgentManagerHookReturn => {
  renderCount++;
  console.log(`🔄 [useAgentManager] Render #${renderCount}`);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convert AgentManager agent to UI Agent type
  const convertAgent = useCallback((agentData: any): Agent => {
    console.log(`🔄 [convertAgent] Called`);
    return {
      id: agentData.id,
      name: agentData.id, // Use ID as name for now
      status: agentData.status || 'unknown',
      startTime: agentData.createdAt ? new Date(agentData.createdAt) : new Date(),
      instructions: agentData.instructions,
      workingDirectory: agentData.workingDirectory,
      error: agentData.error,
      progress: agentData.progress,
    };
  }, []);

  // Fetch agents from AgentManager
  const fetchAgents = useCallback(() => {
    fetchAgentsCallCount++;
    console.log(`🔄 [fetchAgents] Call #${fetchAgentsCallCount}`);
    
    if (!agentManager) {
      setAgents([]);
      setIsLoading(false);
      return;
    }

    try {
      const activeAgents = agentManager.getActiveAgents();
      const convertedAgents = activeAgents.map(convertAgent);
      
      console.log(`🔄 [fetchAgents] Setting ${convertedAgents.length} agents`);
      setAgents(convertedAgents);
      setError(null);

      // Check if selected agent still exists without adding selectedAgentId to dependencies
      setSelectedAgentId((currentSelectedId) => {
        if (currentSelectedId && !convertedAgents.find((a) => a.id === currentSelectedId)) {
          console.log(`🔄 [fetchAgents] Clearing selectedAgentId: ${currentSelectedId}`);
          return null;
        }
        return currentSelectedId;
      });
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [agentManager, convertAgent]);

  // Set up polling for agent updates
  // Note: In the future, this should be replaced with event-based updates
  useEffect(() => {
    effectRunCount++;
    console.log(`🔄 [useEffect] Run #${effectRunCount} - Setting up polling`);
    
    if (!agentManager) {
      console.log(`🔄 [useEffect] No agentManager, returning`);
      return;
    }

    // Initial fetch
    fetchAgents();

    // Poll for updates every 1.5 seconds (matching Blessed UI)
    pollIntervalRef.current = setInterval(() => {
      console.log(`🔄 [Interval] Polling agents...`);
      fetchAgents();
    }, 1500);

    return () => {
      console.log(`🔄 [useEffect] Cleanup - clearing interval`);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [agentManager, fetchAgents]);

  // Select agent
  const selectAgent = useCallback((agentId: string) => {
    console.log(`🔄 [selectAgent] Selecting: ${agentId}`);
    setSelectedAgentId(agentId);
  }, []);

  // Spawn new agent
  const spawnAgent = useCallback(async (instructions: string, workingDirectory: string) => {
    console.log(`🔄 [spawnAgent] Spawning with instructions: ${instructions.substring(0, 50)}...`);
    
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

      // Trigger a manual refresh without depending on fetchAgents
      if (agentManager) {
        const activeAgents = agentManager.getActiveAgents();
        const convertedAgents = activeAgents.map(convertAgent);
        setAgents(convertedAgents);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [agentManager, convertAgent]);

  // Terminate agent
  const terminateAgent = useCallback(async (agentId: string) => {
    console.log(`🔄 [terminateAgent] Terminating: ${agentId}`);
    
    if (!agentManager) {
      throw new Error('AgentManager not initialized');
    }

    try {
      await agentManager.terminateAgent(agentId);

      // Clear selection if terminated agent was selected
      setSelectedAgentId((currentSelectedId) => {
        return currentSelectedId === agentId ? null : currentSelectedId;
      });

      // Trigger a manual refresh without depending on fetchAgents
      if (agentManager) {
        const activeAgents = agentManager.getActiveAgents();
        const convertedAgents = activeAgents.map(convertAgent);
        setAgents(convertedAgents);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [agentManager, convertAgent]);

  // Log canSpawnAgent calls
  const canSpawnAgentValue = agentManager?.canSpawnAgent() ?? false;
  console.log(`🔄 [canSpawnAgent] Called, returning: ${canSpawnAgentValue}`);

  return {
    agents,
    selectedAgentId,
    selectAgent,
    spawnAgent,
    terminateAgent,
    canSpawnAgent: canSpawnAgentValue,
    maxAgents: agentManager?.maxAgents ?? 3,
    isLoading,
    error,
  };
};