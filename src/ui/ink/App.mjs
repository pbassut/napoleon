import React, { useState } from 'react';
import { Box, useApp, Text, useInput } from 'ink';
import { useAgentManager } from './hooks/useAgentManager.js';
import ErrorBoundary from './components/Common/ErrorBoundary.js';
import { Header } from './components/Layout/Header.js';
import { MainContent } from './components/Layout/MainContent.js';
import { Footer } from './components/Layout/Footer.js';
import { SpawnDialog } from './components/Dialogs/SpawnDialog.js';
import { TerminationDialog } from './components/Dialogs/TerminationDialog.js';
import { AgentList } from './components/AgentList/AgentList.js';
import { DetailView } from './components/DetailView/DetailView.js';

const App = ({ agentManager }) => {
  const { exit } = useApp();
  const [isSpawnDialogOpen, setIsSpawnDialogOpen] = useState(false);
  const [isTerminationDialogOpen, setIsTerminationDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  // Get selected agent from the list
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[selectedIndex] || null;

  // Handle agent selection changes from AgentList
  const handleSelectionChange = (index) => {
    setSelectedIndex(index);
    const agent = agents[index];
    if (agent) {
      selectAgent(agent.id);
    }
  };

  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Don't process global shortcuts when dialog or detail view is open
    if (isSpawnDialogOpen || isTerminationDialogOpen || isDetailViewOpen) return;

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
          onCancel={() => setIsTerminationDialogOpen(false)}
        />
      </Box>
    </ErrorBoundary>
  );
};

export default App;