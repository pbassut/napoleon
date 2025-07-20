import React, { createContext, useContext, ReactNode } from 'react';

interface Agent {
  id: string;
  name: string;
  status: 'running' | 'pending' | 'error' | 'success' | 'terminated';
  instructions?: string;
  workingDirectory?: string;
}

interface AppContextType {
  agentManager: any; // Will be properly typed when AgentManager is migrated to TypeScript
  agents: Agent[];
  selectedAgentId: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
  agentManager: any;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, agentManager }) => {
  // TODO: This will be connected to real agent state management
  const mockAgents: Agent[] = [
    { id: '1', name: 'feature-branch-agent', status: 'running' },
    { id: '2', name: 'bugfix-auth-agent', status: 'pending' },
    { id: '3', name: 'refactor-ui-agent', status: 'error' },
  ];

  return (
    <AppContext.Provider value={{
      agentManager,
      agents: mockAgents,
      selectedAgentId: null
    }}>
      {children}
    </AppContext.Provider>
  );
};