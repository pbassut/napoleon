import { useState, useEffect, useCallback, useRef } from 'react';
import { Agent } from '../components/AgentList';

// AgentManager interface - will be replaced with proper types when AgentManager is migrated to TypeScript
interface AgentManagerInterface {
  getActiveAgents(): any[];
  spawnAgent(config: { instructions: string; workingDirectory?: string }): Promise<any>;
  terminateAgent(agentId: string): Promise<void>;
  canSpawnAgent(): boolean;
  maxAgents: number;
  getAgentRuntime(agentId: string): number;
  formatRuntime(seconds: number): string;
}

// Agent status types from AgentManager
const AgentStatus = {
  SPAWNING: 'spawning',
  RUNNING: 'running',
  IDLE: 'idle',
  ERROR: 'error',
  TERMINATING: 'terminating',
};

interface UseAgentManagerReturn {
  agents: Agent[];
  selectedAgentId: string | null;
  selectAgent: (agentId: string | null) => void;
  spawnAgent: (instructions: string, workingDirectory?: string) => Promise<void>;
  terminateAgent: (agentId: string) => Promise<void>;
  canSpawnAgent: boolean;
  maxAgents: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to integrate Ink UI with AgentManager
 * Handles real-time synchronization of agent state
 */
export const useAgentManager = (agentManager: AgentManagerInterface | null): UseAgentManagerReturn => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timer | null>(null);

  // Convert AgentManager agent to UI Agent type
  const convertAgent = useCallback((agentData: any): Agent => {
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
      if (selectedAgentId && !convertedAgents.find(a => a.id === selectedAgentId)) {
        setSelectedAgentId(null);
      }
    } catch (err) {
      setError(err as Error);
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
  const selectAgent = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId);
  }, []);

  // Spawn new agent
  const spawnAgent = useCallback(async (instructions: string, workingDirectory?: string) => {
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
      setError(err as Error);
      throw err;
    }
  }, [agentManager, fetchAgents]);

  // Terminate agent
  const terminateAgent = useCallback(async (agentId: string) => {
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
      setError(err as Error);
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