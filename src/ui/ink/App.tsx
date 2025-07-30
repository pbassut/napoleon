import React from 'react';
import {
  Box, useApp, Text, useInput, useStdout,
} from 'ink';
import { useAgentManager } from './hooks/useAgentManager';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { Footer } from './components/Layout/Footer';
import { SpawnDialog } from './components/Dialogs/SpawnDialog';
import { TerminationDialog } from './components/Dialogs/TerminationDialog';
import AgentList from './components/AgentList/AgentList';
import { DetailView } from './components/DetailView/DetailView';
import logger from '../../utils/logger';
import AgentManager from '../../core/agent-manager';

const {
  useState, useMemo, useCallback,
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
    isLoading,
    error,
    addTempAgent,
    removeTempAgent,
    updateTempAgent,
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

  // Define handleSpawnAgent first to avoid use-before-define
  const handleSpawnAgent = useCallback(async (prompt) => {
    try {
      logger.debug('App: Starting agent spawn', { prompt, cwd: process.cwd() });
      
      // Generate the real agent ID upfront so temp and real agent use same ID
      const agentId = AgentManager.generateAgentId();
      
      // Create agent entry immediately with SPAWNING status using real ID
      const newAgent = {
        id: agentId,
        name: agentId,
        status: 'SPAWNING',
        startTime: new Date(),
        instructions: prompt,
        workingDirectory: process.cwd(),
        todos: [],
      };
      
      // Add to temporary agents list immediately for UI feedback
      addTempAgent(newAgent);
      
      // Spawn agent asynchronously with the pre-generated ID
      spawnAgent({
        instructions: prompt,
        workingDirectory: process.cwd(),
        agentId, // Pass the pre-generated ID
      }).then(() => {
        logger.debug('App: Agent spawned successfully');
        // Remove temporary agent as real agent with same ID will replace it
        removeTempAgent(agentId);
      }).catch(spawnError => {
        logger.error('App: Error spawning agent:', { error: spawnError });
        // Update temporary agent to show failed status
        updateTempAgent(agentId, {
          status: 'FAILED',
          error: spawnError instanceof Error ? spawnError.message : 'Failed to spawn agent'
        });
      });
    } catch (syncError) {
      logger.error('App: Synchronous error in handleSpawnAgent:', { error: syncError });
      throw syncError;
    }
  }, [addTempAgent, spawnAgent, removeTempAgent, updateTempAgent]);

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

    // Retry failed agent with 'r'
    if (input === 'r' && selectedAgent && selectedAgent.status === 'FAILED') {
      logger.debug('App: r key pressed for retry, retrying agent');
      // Inline retry logic to avoid use-before-define error
      if (!selectedAgent.instructions) return;
      logger.debug('App: Retrying failed agent spawn', { agentId: selectedAgent.id });
      removeTempAgent(selectedAgent.id);
      handleSpawnAgent(selectedAgent.instructions);
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

  const handleTerminateAgent = async (deleteWorktree = false) => {
    if (!selectedAgent) return;

    try {
      // Check if this is a temporary failed agent
      if (selectedAgent.id.startsWith('temp-') && selectedAgent.status === 'FAILED') {
        // Remove temporary failed agent directly
        removeTempAgent(selectedAgent.id);
        setIsTerminationDialogOpen(false);
        return;
      }

      // Pass deleteWorktree option to the terminateAgent function for real agents
      await terminateAgent(selectedAgent.id, { deleteWorktree });
      setIsTerminationDialogOpen(false);
    } catch (terminateError) {
      const operation = deleteWorktree ? 'delete' : 'terminate';
      logger.error(`Failed to ${operation} agent:`, { error: terminateError });
      // Let the dialog show the error
      throw terminateError;
    }
  };

  const DetailViewComponent = useMemo(() => {
    if (isDetailViewOpen && selectedAgent) {
      return (
        <Box flexDirection="column" width="100%" height={stdout.rows}>
          <DetailView
            agent={selectedAgent}
            onClose={() => setIsDetailViewOpen(false)}
            agentManager={agentManager}
          />
        </Box>
      );
    }
    return null;
  }, [isDetailViewOpen, selectedAgent, stdout.rows]);

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
              {(() => {
                if (isLoading) {
                  return (
                    <Box paddingY={2} justifyContent="center" alignItems="center">
                      <Text color="yellow">Loading agents...</Text>
                    </Box>
                  );
                }
                if (error) {
                  return (
                    <Box paddingY={2} justifyContent="center" alignItems="center">
                      <Text color="red">Error: {error.message}</Text>
                    </Box>
                  );
                }
                return (
                  <AgentList
                    agents={agents}
                    selectedIndex={selectedIndex}
                    onSelectionChange={handleSelectionChange}
                    height={Math.max(10, stdout.rows - 12)}
                    isModalOpen={isSpawnDialogOpen || isTerminationDialogOpen}
                  />
                );
              })()}
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

      {DetailViewComponent}
    </ErrorBoundary>
  );
};

// Enable why-did-you-render for this component
App.whyDidYouRender = false;

export default App;
