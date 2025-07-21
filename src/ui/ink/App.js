"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const { useState, useEffect, useMemo, useCallback } = react_1.default;
const ink_1 = require("ink");
const useAgentManager_1 = require("./hooks/useAgentManager");
const ErrorBoundary_1 = __importDefault(require("./components/Common/ErrorBoundary"));
const Header_1 = require("./components/Layout/Header");
const MainContent_1 = require("./components/Layout/MainContent");
const Footer_1 = require("./components/Layout/Footer");
const SpawnDialog_1 = require("./components/Dialogs/SpawnDialog");
const TerminationDialog_1 = require("./components/Dialogs/TerminationDialog");
const AgentList_1 = __importDefault(require("./components/AgentList/AgentList"));
const DetailView_1 = require("./components/DetailView/DetailView");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const App = ({ agentManager }) => {
    const { exit } = (0, ink_1.useApp)();
    const { stdout } = (0, ink_1.useStdout)();
    const [isSpawnDialogOpen, setIsSpawnDialogOpen] = useState(false);
    const [isTerminationDialogOpen, setIsTerminationDialogOpen] = useState(false);
    const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
    // Use the AgentManager hook
    const { agents, selectedAgentId, selectAgent, spawnAgent, terminateAgent, canSpawnAgent, maxAgents, isLoading, error, } = (0, useAgentManager_1.useAgentManager)(agentManager);
    // Derive selectedIndex from selectedAgentId to maintain single source of truth
    const selectedIndex = useMemo(() => {
        if (!selectedAgentId || agents.length === 0)
            return 0;
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
    (0, ink_1.useInput)((input, key) => {
        // Don't process global shortcuts when dialog or detail view is open
        if (isSpawnDialogOpen || isTerminationDialogOpen || isDetailViewOpen)
            return;
        // Quit with 'q'
        if (input === 'q') {
            exit();
        }
        // Open spawn dialog with 'n'
        if (input === 'n' && canSpawnAgent) {
            logger_js_1.default.debug('App: n key pressed, opening spawn dialog');
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
            logger_js_1.default.debug('App: Starting agent spawn', { prompt, cwd: process.cwd() });
            await spawnAgent({
                instructions: prompt,
                workingDirectory: process.cwd()
            });
            logger_js_1.default.debug('App: Agent spawned successfully, closing dialog');
            setIsSpawnDialogOpen(false);
        }
        catch (error) {
            logger_js_1.default.error('App: Error spawning agent:', { error });
            // Re-throw to let dialog handle the error
            throw error;
        }
    };
    const handleTerminateAgent = async () => {
        if (!selectedAgent)
            return;
        try {
            await terminateAgent(selectedAgent.id);
            setIsTerminationDialogOpen(false);
        }
        catch (error) {
            logger_js_1.default.error('Failed to terminate agent:', { error });
            // Let the dialog show the error
        }
    };
    // Import components dynamically
    const ErrorBoundary = ErrorBoundary_1.default;
    const AgentList = AgentList_1.default;
    // If detail view is open, show only the detail view
    if (isDetailViewOpen && selectedAgent) {
        return (<ErrorBoundary>
        <DetailView_1.DetailView agent={selectedAgent} onClose={() => setIsDetailViewOpen(false)} agentManager={agentManager}/>
      </ErrorBoundary>);
    }
    return (<ErrorBoundary>
      <ink_1.Box flexDirection="column" width="100%" height={stdout.rows}>
        {/* Main bordered container */}
        <ink_1.Box flexDirection="column" borderStyle="single" width="100%" flexGrow={1} minHeight={stdout.rows - 2}>
          {/* Header */}
          <ink_1.Box paddingX={2} paddingY={1}>
            <Header_1.Header />
          </ink_1.Box>

          {/* Divider */}
          <ink_1.Box paddingX={1}>
            <ink_1.Text>{'─'.repeat(process.stdout.columns - 4)}</ink_1.Text>
          </ink_1.Box>

          {/* Main content with padding */}
          <ink_1.Box flexGrow={1} paddingX={2} paddingY={1}>
            <MainContent_1.MainContent>
              {isLoading ? (<ink_1.Box paddingY={2} justifyContent="center" alignItems="center">
                  <ink_1.Text color="yellow">Loading agents...</ink_1.Text>
                </ink_1.Box>) : error ? (<ink_1.Box paddingY={2} justifyContent="center" alignItems="center">
                  <ink_1.Text color="red">Error: {error.message}</ink_1.Text>
                </ink_1.Box>) : (<AgentList agents={agents} selectedIndex={selectedIndex} onSelectionChange={handleSelectionChange} height={Math.max(10, stdout.rows - 12)} isModalOpen={isSpawnDialogOpen || isTerminationDialogOpen}/>)}
            </MainContent_1.MainContent>
          </ink_1.Box>

          {/* Divider */}
          <ink_1.Box paddingX={1}>
            <ink_1.Text>{'─'.repeat(process.stdout.columns - 4)}</ink_1.Text>
          </ink_1.Box>

          {/* Footer */}
          <ink_1.Box paddingX={2} paddingY={1}>
            <Footer_1.Footer agentCount={agents.length}/>
          </ink_1.Box>
        </ink_1.Box>

        {/* Spawn Dialog Modal */}
        <SpawnDialog_1.SpawnDialog isOpen={isSpawnDialogOpen} onClose={() => setIsSpawnDialogOpen(false)} onSubmit={handleSpawnAgent}/>

        {/* Termination Dialog Modal */}
        <TerminationDialog_1.TerminationDialog isOpen={isTerminationDialogOpen} agent={selectedAgent} onConfirm={handleTerminateAgent} onCancel={() => {
            setIsTerminationDialogOpen(false);
        }}/>
      </ink_1.Box>
    </ErrorBoundary>);
};
// Enable why-did-you-render for this component
App.whyDidYouRender = true;
exports.default = App;
