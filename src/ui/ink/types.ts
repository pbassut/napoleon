export interface TodoItem {
  id: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Agent {
  id: string;
  name: string;
  status: string;
  startTime: Date;
  lastActivity?: Date;
  instructions?: string;
  workingDirectory?: string;
  error?: Error | string;
  progress?: Record<string, unknown>;
  todos?: TodoItem[];
}

export interface AgentManagerHookReturn {
  agents: Agent[];
  selectedAgentId: string | null;
  selectAgent: (agentId: string) => void;
  spawnAgent: (options: { instructions: string; workingDirectory: string }) => Promise<void>;
  terminateAgent: (agentId: string, options?: Record<string, unknown>) => Promise<void>;
  canSpawnAgent: boolean;
  isLoading: boolean;
  error: Error | null;
  // Temporary agent management methods
  addTempAgent: (agent: Agent) => void;
  removeTempAgent: (agentId: string) => void;
  updateTempAgent: (agentId: string, updates: Partial<Agent>) => void;
}

export interface AgentManager {
  initialize: () => Promise<void>;
  getActiveAgents: () => Agent[];
  canSpawnAgent: () => boolean;
  spawnAgent: (instructions: string, options?: Record<string, unknown>) => Promise<Agent>;
  terminateAgent: (agentId: string, options?: Record<string, unknown>) => Promise<void>;
  getAgentDetails: (agentId: string) => Agent | null;
  getCurrentTask: (agentId: string) => TodoItem | null;
}

// Helper function to get current task from todos array
export const getCurrentTask = (todos?: TodoItem[]): TodoItem | null => {
  if (!todos || !Array.isArray(todos)) {
    return null;
  }

  const inProgressTasks = todos.filter((todo) => todo.status === 'in_progress');

  if (inProgressTasks.length === 0) {
    return null; // No active task
  }

  if (inProgressTasks.length === 1) {
    return inProgressTasks[0];
  }

  // Handle edge case of multiple in_progress tasks - return first one
  return inProgressTasks[0];
};
