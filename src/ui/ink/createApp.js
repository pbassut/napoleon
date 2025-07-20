// Factory function to create App component with dynamic imports
module.exports = async function createApp() {
  // Dynamic imports for ESM modules
  const React = await import('react');
  const inkModule = await import('ink');
  const { Box, useApp, Text, useInput } = inkModule;
  const { useState } = React;

  // Import hooks and components
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
    const ErrorBoundary = require('./components/Common/ErrorBoundary').default;
    const { Header } = require('./components/Layout/Header');
    const { MainContent } = require('./components/Layout/MainContent');
    const { Footer } = require('./components/Layout/Footer');
    const { SpawnDialog } = require('./components/Dialogs/SpawnDialog');
    const { TerminationDialog } = require('./components/Dialogs/TerminationDialog');
    const { AgentList } = require('./components/AgentList');
    const { DetailView } = require('./components/DetailView');

    // If detail view is open, show only the detail view
    if (isDetailViewOpen && selectedAgent) {
      return React.createElement(
        ErrorBoundary,
        null,
        React.createElement(DetailView, {
          agent: selectedAgent,
          onClose: () => setIsDetailViewOpen(false),
          agentManager,
        }),
      );
    }

    return React.createElement(
      ErrorBoundary,
      null,
      React.createElement(Box, { flexDirection: 'column', height: '100%' }, [
        React.createElement(Header, { key: 'header' }),
        React.createElement(
          MainContent,
          { key: 'main' },
          isLoading
            ? React.createElement(
              Box,
              { padding: 1 },
              React.createElement(Text, { color: 'yellow' }, 'Loading agents...'),
            )
            : error
              ? React.createElement(
                Box,
                { padding: 1 },
                React.createElement(Text, { color: 'red' }, `Error: ${error.message}`),
              )
              : agents.length === 0
                ? React.createElement(Box, { padding: 1 }, [
                  React.createElement(Text, { key: 'no-agents', color: 'gray' }, 'No agents running'),
                  React.createElement(Text, { key: 'help', color: 'gray' }, "\nPress 'n' to spawn a new agent"),
                ])
                : React.createElement(
                  Box,
                  { flexGrow: 1, flexDirection: 'column' },
                  React.createElement(AgentList, {
                    agents,
                    selectedIndex,
                    onSelectionChange: handleSelectionChange,
                  }),
                ),
        ),
        React.createElement(Footer, { key: 'footer', agentCount: agents.length }),

        // Spawn Dialog Modal
        React.createElement(SpawnDialog, {
          key: 'spawn-dialog',
          isOpen: isSpawnDialogOpen,
          onClose: () => setIsSpawnDialogOpen(false),
          onSubmit: handleSpawnAgent,
        }),

        // Termination Dialog Modal
        React.createElement(TerminationDialog, {
          key: 'termination-dialog',
          isOpen: isTerminationDialogOpen,
          agent: selectedAgent,
          onConfirm: handleTerminateAgent,
          onCancel: () => {
            setIsTerminationDialogOpen(false);
          },
        }),
      ]),
    );
  };

  return App;
};