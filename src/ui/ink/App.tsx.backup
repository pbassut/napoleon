import React, { useState } from 'react';
import { Box, useApp, Text, useInput } from 'ink';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { Footer } from './components/Layout/Footer';
import { SpawnDialog } from './components/Dialogs/SpawnDialog';
import { TerminationDialog } from './components/Dialogs/TerminationDialog';
import { AgentList, Agent } from './components/AgentList';
import { useAgentManager } from './hooks/useAgentManager';

interface AppProps {
  agentManager?: any; // Will be properly typed when AgentManager is migrated
}

const App: React.FC<AppProps> = ({ agentManager }) => {
  const { exit } = useApp();
  const [isSpawnDialogOpen, setIsSpawnDialogOpen] = useState(false);
  const [isTerminationDialogOpen, setIsTerminationDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Use the AgentManager hook
  const {
    agents,
    selectedAgentId,
    selectAgent,
    spawnAgent,
    terminateAgent,
    canSpawnAgent,
    maxAgents,
    isLoading,
    error
  } = useAgentManager(agentManager);
  
  // Get selected agent from the list
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[selectedIndex] || null;
  
  // Handle agent selection changes from AgentList
  const handleSelectionChange = (index: number) => {
    setSelectedIndex(index);
    const agent = agents[index];
    if (agent) {
      selectAgent(agent.id);
    }
  };
  
  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Don't process global shortcuts when dialog is open
    if (isSpawnDialogOpen || isTerminationDialogOpen) return;
    
    // Quit with 'q'
    if (input === 'q') {
      exit();
    }
    
    // Open spawn dialog with 'n'
    if (input === 'n' && canSpawnAgent) {
      setIsSpawnDialogOpen(true);
    }
    
    // Open termination dialog with 'd' (delete)
    if (input === 'd' && selectedAgent) {
      setIsTerminationDialogOpen(true);
    }
    
    // View agent details with 'enter' or 'i'
    if ((key.return || input === 'i') && selectedAgent) {
      // TODO: Implement agent detail view
      console.log('View details for agent:', selectedAgent.id);
    }
  });
  
  const handleSpawnAgent = async (prompt: string) => {
    try {
      await spawnAgent(prompt, process.cwd());
      setIsSpawnDialogOpen(false);
    } catch (error) {
      // Re-throw to let dialog handle the error
      throw error;
    }
  };
  
  const handleTerminateAgent = async () => {
    if (!selectedAgent) return;
    
    try {
      await terminateAgent(selectedAgent.id);
      setIsTerminationDialogOpen(false);
    } catch (error) {
      console.error('Failed to terminate agent:', error);
      // Let the dialog show the error
    }
  };
  
  return (
    <ErrorBoundary>
      <Box flexDirection="column" height="100%">
        <Header />
        <MainContent>
          {isLoading ? (
            <Box padding={1}>
              <Text color="yellow">Loading agents...</Text>
            </Box>
          ) : error ? (
            <Box padding={1}>
              <Text color="red">Error: {error.message}</Text>
            </Box>
          ) : agents.length === 0 ? (
            <Box padding={1}>
              <Text color="gray">No agents running</Text>
              <Text color="gray">{'\n'}Press 'n' to spawn a new agent</Text>
            </Box>
          ) : (
            <Box flexGrow={1} flexDirection="column">
              <AgentList
                agents={agents}
                selectedIndex={selectedIndex}
                onSelectionChange={handleSelectionChange}
              />
            </Box>
          )}
        </MainContent>
        <Footer agentCount={agents.length} />
        
        {/* Spawn Dialog Modal */}
        <SpawnDialog
          isOpen={isSpawnDialogOpen}
          onClose={() => setIsSpawnDialogOpen(false)}
          onSubmit={handleSpawnAgent}
        />
        
        {/* Termination Dialog Modal */}
        <TerminationDialog
          isOpen={isTerminationDialogOpen}
          agent={selectedAgent}
          onConfirm={handleTerminateAgent}
          onCancel={() => {
            setIsTerminationDialogOpen(false);
            setSelectedAgent(null);
          }}
        />
      </Box>
    </ErrorBoundary>
  );
};

export default App;