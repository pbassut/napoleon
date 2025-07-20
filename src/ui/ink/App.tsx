import React from 'react';
const { useState } = React;
const { Box, useApp, Text, useInput } = require('ink');
const { useAgentManager } = require('./hooks/useAgentManager');

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

  // Import components dynamically
  const ErrorBoundary = require('./components/Common/ErrorBoundary.tsx').default;
  const { Header } = require('./components/Layout/Header.tsx');
  const { MainContent } = require('./components/Layout/MainContent.tsx');
  const { Footer } = require('./components/Layout/Footer.tsx');
  const { SpawnDialog } = require('./components/Dialogs/SpawnDialog.tsx');
  const { TerminationDialog } = require('./components/Dialogs/TerminationDialog.tsx');
  const AgentList = require('./components/AgentList/AgentList.tsx').default;
  const { DetailView } = require('./components/DetailView/DetailView.tsx');

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