import React from 'react';
const { useState, useMemo, useCallback } = React;
import { Box, useApp, Text, useInput } from 'ink';
import { useAgentManager } from './hooks/useAgentManager';
import ErrorBoundaryDefault from './components/Common/ErrorBoundary.tsx';
import { Header } from './components/Layout/Header.tsx';
import { MainContent } from './components/Layout/MainContent.tsx';
import { Footer } from './components/Layout/Footer.tsx';
import { SpawnDialog } from './components/Dialogs/SpawnDialog.tsx';
import { TerminationDialog } from './components/Dialogs/TerminationDialog.tsx';
import AgentListDefault from './components/AgentList/AgentList.tsx';
import { DetailView } from './components/DetailView/DetailView.tsx';

// Debug counter
let appRenderCount = 0;
let handleSelectionChangeCount = 0;

const App = ({ agentManager }) => {
  appRenderCount++;
  console.log(`🎯 [App] Render #${appRenderCount}`);
  
  const { exit } = useApp();
  const [isSpawnDialogOpen, setIsSpawnDialogOpen] = useState(false);
  const [isTerminationDialogOpen, setIsTerminationDialogOpen] = useState(false);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

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
    error,
  } = useAgentManager(agentManager);

  // Derive selectedIndex from selectedAgentId to maintain single source of truth
  const selectedIndex = useMemo(() => {
    if (!selectedAgentId || agents.length === 0) return 0;
    const index = agents.findIndex((a) => a.id === selectedAgentId);
    console.log(`🎯 [App] Computed selectedIndex: ${index} for selectedAgentId: ${selectedAgentId}`);
    return index >= 0 ? index : 0;
  }, [selectedAgentId, agents]);

  console.log(`🎯 [App] State: selectedIndex=${selectedIndex}, selectedAgentId=${selectedAgentId}, dialogs=${isSpawnDialogOpen}/${isTerminationDialogOpen}`);
  console.log(`🎯 [App] Hook state: agents=${agents.length}, isLoading=${isLoading}`);

  // Get selected agent from the list
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0] || null;
  console.log(`🎯 [App] selectedAgent: ${selectedAgent?.id || 'none'}`);

  // Handle agent selection changes from AgentList
  const handleSelectionChange = useCallback((index) => {
    handleSelectionChangeCount++;
    console.log(`🎯 [handleSelectionChange] Call #${handleSelectionChangeCount}, index=${index}`);
    
    const agent = agents[index];
    if (agent && agent.id !== selectedAgentId) {
      console.log(`🎯 [handleSelectionChange] Selecting agent: ${agent.id} (was: ${selectedAgentId})`);
      selectAgent(agent.id);
    } else {
      console.log(`🎯 [handleSelectionChange] Skipping - already selected or no agent`);
    }
  }, [agents, selectedAgentId, selectAgent]);

  // Handle keyboard shortcuts
  useInput((input, key) => {
    console.log(`🎯 [useInput] Key: ${input || 'special'}, modals open: ${isSpawnDialogOpen || isTerminationDialogOpen || isDetailViewOpen}`);
    
    // Don't process global shortcuts when dialog or detail view is open
    if (isSpawnDialogOpen || isTerminationDialogOpen || isDetailViewOpen) return;

    // Quit with 'q'
    if (input === 'q') {
      exit();
    }

    // Open spawn dialog with 'n'
    if (input === 'n' && canSpawnAgent) {
      console.log(`🎯 [useInput] Opening spawn dialog`);
      setIsSpawnDialogOpen(true);
    }

    // Open termination dialog with 'd' (delete)
    if (input === 'd' && selectedAgent) {
      setIsTerminationDialogOpen(true);
    }

    // View agent details with 'enter' or 'i'
    if ((key.return || input === 'i') && selectedAgent) {
      setIsDetailViewOpen(true);
    }
  });

  const handleSpawnAgent = async (prompt) => {
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

  // Import components dynamically
  const ErrorBoundary = ErrorBoundaryDefault;
  const AgentList = AgentListDefault;

  // If detail view is open, show only the detail view
  if (isDetailViewOpen && selectedAgent) {
    return (
      <ErrorBoundary>
        <DetailView
          agent={selectedAgent}
          onClose={() => setIsDetailViewOpen(false)}
          agentManager={agentManager}
        />
      </ErrorBoundary>
    );
  }

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
              <Text color="gray">{"\nPress 'n' to spawn a new agent"}</Text>
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
          }}
        />
      </Box>
    </ErrorBoundary>
  );
};

module.exports = App;