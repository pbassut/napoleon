import React from 'react';
const { useState, useEffect, useMemo, useCallback } = React;
import { Box, useApp, Text, useInput } from 'ink';
import { useAgentManager } from './hooks/useAgentManager';
import ErrorBoundaryDefault from './components/Common/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { Footer } from './components/Layout/Footer';
import { SpawnDialog } from './components/Dialogs/SpawnDialog';
import { TerminationDialog } from './components/Dialogs/TerminationDialog';
import AgentListDefault from './components/AgentList/AgentList';
import { DetailView } from './components/DetailView/DetailView';

const App = ({ agentManager }) => {
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
    return index >= 0 ? index : 0;
  }, [selectedAgentId, agents]);

  // Get selected agent from the list
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0] || null;

  // Handle agent selection changes from AgentList
  const handleSelectionChange = useCallback((index) => {
    const agent = agents[index];
    if (agent && agent.id !== selectedAgentId) {
      selectAgent(agent.id);
    }
  }, [agents, selectedAgentId, selectAgent]);

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
      <Box 
        flexDirection="column" 
        height="100%"
        borderStyle="round"
        borderColor="gray"
      >
        <Header />
        <Box width="100%" paddingX={1}>
          <Text>{'─'.repeat(80)}</Text>
        </Box>
        <MainContent>
          {isLoading ? (
            <Box padding={1}>
              <Text color="yellow">Loading agents...</Text>
            </Box>
          ) : error ? (
            <Box padding={1}>
              <Text color="red">Error: {error.message}</Text>
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
        <Box width="100%" paddingX={1}>
          <Text>{'─'.repeat(80)}</Text>
        </Box>
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