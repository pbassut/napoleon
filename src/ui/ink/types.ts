export interface Agent {
  id: string;
  name: string;
  status: string;
  startTime: Date;
  instructions?: string;
  workingDirectory?: string;
  error?: any;
  progress?: any;
}

export interface AgentManagerHookReturn {
  agents: Agent[];
  selectedAgentId: string | null;
  selectAgent: (agentId: string) => void;
  spawnAgent: (instructions: string, workingDirectory: string) => Promise<void>;
  terminateAgent: (agentId: string) => Promise<void>;
  canSpawnAgent: boolean;
  maxAgents: number;
  isLoading: boolean;
  error: Error | null;
}

export interface AgentManager {
  initialize: () => Promise<void>;
  getActiveAgents: () => any[];
  canSpawnAgent: () => boolean;
  spawnAgent: (options: { instructions: string; workingDirectory: string }) => Promise<void>;
  terminateAgent: (agentId: string) => Promise<void>;
  maxAgents: number;
}