import React from 'react';
import {
  Box, useApp, Text, useInput, useStdout,
} from 'ink';
import { useAgentManager } from './hooks/useAgentManager';
import ErrorBoundaryDefault from './components/Common/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { Footer } from './components/Layout/Footer';
import { SpawnDialog } from './components/Dialogs/SpawnDialog';
import { TerminationDialog } from './components/Dialogs/TerminationDialog';
import AgentListDefault from './components/AgentList/AgentList';
import { DetailView } from './components/DetailView/DetailView';
import logger from '../../utils/logger.js';

const {
  useState, useEffect, useMemo, useCallback,
} = React;

const App = ({ agentManager }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
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
  const handleSelectionChange = useCallback(
    (index) => {
      const agent = agents[index];
      if (agent && agent.id !== selectedAgentId) {
        selectAgent(agent.id);
      }
    },
    [agents, selectedAgentId, selectAgent],
  );

  // Handle keyboard shortcuts
  useInput((input, key) => {
    logger.debug('App: Input received', {
      input,
      key,
      isSpawnDialogOpen,
      isTerminationDialogOpen,
      isDetailViewOpen,
    });

    // Don't process global shortcuts when dialog or detail view is open
    if (isSpawnDialogOpen || isTerminationDialogOpen || isDetailViewOpen) {
      logger.debug('App: Input ignored - dialog or detail view is open');
      return;
    }

    // Quit with 'q'
    if (input === 'q') {
      exit();
    }

    // Open spawn dialog with 'n'
    if (input === 'n' && canSpawnAgent) {
      logger.debug('App: n key pressed, opening spawn dialog');
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

    // Handle arrow key navigation
    if (key.upArrow || input === 'k') {
      logger.debug('App: Up arrow/k pressed', {
        currentSelectedIndex: selectedIndex,
        agentsLength: agents.length,
      });
      if (agents.length > 0) {
        const newIndex = Math.max(0, selectedIndex - 1);
        if (newIndex !== selectedIndex) {
          logger.debug('App: Navigating up', { from: selectedIndex, to: newIndex });
          handleSelectionChange(newIndex);
        } else {
          logger.debug('App: Already at top, not navigating');
        }
      }
    }

    if (key.downArrow || input === 'j') {
      logger.debug('App: Down arrow/j pressed', {
        currentSelectedIndex: selectedIndex,
        agentsLength: agents.length,
      });
      if (agents.length > 0) {
        const newIndex = Math.min(agents.length - 1, selectedIndex + 1);
        if (newIndex !== selectedIndex) {
          logger.debug('App: Navigating down', { from: selectedIndex, to: newIndex });
          handleSelectionChange(newIndex);
        } else {
          logger.debug('App: Already at bottom, not navigating');
        }
      }
    }
  });

  const handleSpawnAgent = async (prompt) => {
    try {
      logger.debug('App: Starting agent spawn', { prompt, cwd: process.cwd() });
      await spawnAgent({
        instructions: prompt,
        workingDirectory: process.cwd(),
      });
      logger.debug('App: Agent spawned successfully, closing dialog');
      setIsSpawnDialogOpen(false);
    } catch (error) {
      logger.error('App: Error spawning agent:', { error });
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
      logger.error('Failed to terminate agent:', { error });
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
      <Box flexDirection="column" width="100%" height={stdout.rows}>
        {/* Main bordered container */}
        <Box
          flexDirection="column"
          borderStyle="single"
          width="100%"
          flexGrow={1}
          minHeight={stdout.rows - 2}
        >
          {/* Header */}
          <Box paddingX={2} paddingY={1}>
            <Header />
          </Box>

          {/* Divider */}
          <Box paddingX={1}>
            <Text>{'─'.repeat(process.stdout.columns - 4)}</Text>
          </Box>

          {/* Main content with padding */}
          <Box flexGrow={1} paddingX={2} paddingY={1}>
            <MainContent>
              {isLoading ? (
                <Box paddingY={2} justifyContent="center" alignItems="center">
                  <Text color="yellow">Loading agents...</Text>
                </Box>
              ) : error ? (
                <Box paddingY={2} justifyContent="center" alignItems="center">
                  <Text color="red">Error: {error.message}</Text>
                </Box>
              ) : (
                <AgentList
                  agents={agents}
                  selectedIndex={selectedIndex}
                  onSelectionChange={handleSelectionChange}
                  height={Math.max(10, stdout.rows - 12)}
                  isModalOpen={isSpawnDialogOpen || isTerminationDialogOpen}
                />
              )}
            </MainContent>
          </Box>

          {/* Divider */}
          <Box paddingX={1}>
            <Text>{'─'.repeat(process.stdout.columns - 4)}</Text>
          </Box>

          {/* Footer */}
          <Box paddingX={2} paddingY={1}>
            <Footer agentCount={agents.length} />
          </Box>
        </Box>

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

// Enable why-did-you-render for this component
App.whyDidYouRender = true;

export default App;
