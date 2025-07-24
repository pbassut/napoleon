export interface AgentStatusInfo {
  emoji: string;
  text: string;
  color: string;
}

export const AGENT_STATUS: Record<string, AgentStatusInfo> = {
  SPAWNING: { emoji: '🟡', text: 'Spawning...', color: 'yellow' },
  FORKING: { emoji: '🟡', text: 'Forking...', color: 'yellow' },
  STARTING: { emoji: '🟡', text: 'Starting...', color: 'yellow' },
  RUNNING: { emoji: '🟢', text: 'Running', color: 'green' },
  PENDING: { emoji: '🟡', text: 'Pending', color: 'yellow' },
  IDLE: { emoji: '🟡', text: 'Idle', color: 'yellow' },
  ERROR: { emoji: '🔴', text: 'Error', color: 'red' },
  FAILED: { emoji: '🔴', text: 'Failed', color: 'red' },
  TERMINATED: { emoji: '⚪', text: 'Terminated', color: 'gray' },
};

export const getStatusInfo = (status: string): AgentStatusInfo => {
  const upperStatus = status.toUpperCase();
  return AGENT_STATUS[upperStatus] || { emoji: '⚪', text: status, color: 'gray' };
};
