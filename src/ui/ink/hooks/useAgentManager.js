"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAgentManager = void 0;
const react_1 = require("react");
const logger_js_1 = __importDefault(require("../../../utils/logger.js"));
// Agent status types from AgentManager
const AgentStatus = {
    SPAWNING: 'spawning',
    FORKING: 'forking',
    STARTING: 'starting',
    RUNNING: 'running',
    PENDING: 'pending',
    IDLE: 'idle',
    ERROR: 'error',
    FAILED: 'failed',
    TERMINATED: 'terminated',
    TERMINATING: 'terminating',
};
/**
 * Hook to integrate Ink UI with AgentManager
 * Handles real-time synchronization of agent state
 */
const useAgentManager = (agentManager) => {
    const [agents, setAgents] = (0, react_1.useState)([]);
    const [selectedAgentId, setSelectedAgentId] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const pollIntervalRef = (0, react_1.useRef)(null);
    // Convert AgentManager agent to UI Agent type
    const convertAgent = (0, react_1.useCallback)((agentData) => ({
        id: agentData.id,
        name: agentData.id, // Use ID as name for now
        status: agentData.status || 'unknown',
        startTime: agentData.createdAt ? new Date(agentData.createdAt) : new Date(),
        instructions: agentData.instructions,
        workingDirectory: agentData.workingDirectory,
        error: agentData.error,
        progress: agentData.progress,
    }), []);
    // Fetch agents from AgentManager
    const fetchAgents = (0, react_1.useCallback)(() => {
        if (!agentManager) {
            setAgents([]);
            setIsLoading(false);
            return;
        }
        try {
            const activeAgents = agentManager.getActiveAgents();
            const convertedAgents = activeAgents.map(convertAgent);
            setAgents(convertedAgents);
            setError(null);
            // Check if selected agent still exists without adding selectedAgentId to dependencies
            setSelectedAgentId((currentSelectedId) => {
                if (currentSelectedId && !convertedAgents.find((a) => a.id === currentSelectedId)) {
                    return null;
                }
                return currentSelectedId;
            });
        }
        catch (err) {
            setError(err);
            console.error('Failed to fetch agents:', err);
        }
        finally {
            setIsLoading(false);
        }
    }, [agentManager, convertAgent]);
    // Set up polling for agent updates
    // Note: In the future, this should be replaced with event-based updates
    (0, react_1.useEffect)(() => {
        if (!agentManager)
            return;
        // Create a stable reference to fetchAgents to avoid recreating interval
        const stableFetchAgents = () => {
            if (!agentManager) {
                setAgents([]);
                setIsLoading(false);
                return;
            }
            try {
                const activeAgents = agentManager.getActiveAgents();
                const convertedAgents = activeAgents.map((agentData) => ({
                    id: agentData.id,
                    name: agentData.id,
                    status: agentData.status || 'unknown',
                    startTime: agentData.createdAt ? new Date(agentData.createdAt) : new Date(),
                    instructions: agentData.instructions,
                    workingDirectory: agentData.workingDirectory,
                    error: agentData.error,
                    progress: agentData.progress,
                }));
                // Only update if agents actually changed
                setAgents(prevAgents => {
                    const hasChanged = prevAgents.length !== convertedAgents.length ||
                        prevAgents.some((prevAgent, i) => {
                            const newAgent = convertedAgents[i];
                            return !newAgent ||
                                prevAgent.id !== newAgent.id ||
                                prevAgent.status !== newAgent.status ||
                                prevAgent.name !== newAgent.name;
                        });
                    if (hasChanged) {
                        logger_js_1.default.debug('useAgentManager: Agents changed', {
                            prevCount: prevAgents.length,
                            newCount: convertedAgents.length,
                            agents: convertedAgents.map(a => ({ id: a.id, name: a.name, status: a.status }))
                        });
                    }
                    return hasChanged ? convertedAgents : prevAgents;
                });
                setError(null);
                // Check if selected agent still exists
                setSelectedAgentId((currentSelectedId) => {
                    if (currentSelectedId && !convertedAgents.find((a) => a.id === currentSelectedId)) {
                        return null;
                    }
                    return currentSelectedId;
                });
            }
            catch (err) {
                setError(err);
                console.error('Failed to fetch agents:', err);
            }
            finally {
                setIsLoading(false);
            }
        };
        // Initial fetch
        stableFetchAgents();
        // Poll for updates every 500ms per spec
        pollIntervalRef.current = setInterval(stableFetchAgents, 500);
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [agentManager]); // Remove fetchAgents from dependencies
    // Select agent
    const selectAgent = (0, react_1.useCallback)((agentId) => {
        setSelectedAgentId(agentId);
    }, []);
    // Spawn new agent
    const spawnAgent = (0, react_1.useCallback)(async ({ instructions, workingDirectory }) => {
        if (!agentManager) {
            throw new Error('AgentManager not initialized');
        }
        if (!agentManager.canSpawnAgent()) {
            throw new Error(`Maximum number of agents (${agentManager.maxAgents}) reached`);
        }
        try {
            logger_js_1.default.debug('useAgentManager: Calling agentManager.spawnAgent', {
                instructions,
                workingDirectory,
                instructionsType: typeof instructions,
                instructionsEmpty: !instructions || instructions.trim() === ''
            });
            // Call with correct signature: spawnAgent(instructions, options)
            await agentManager.spawnAgent(instructions, {
                workingDirectory: workingDirectory || process.cwd(),
            });
            // Trigger a manual refresh without depending on fetchAgents
            if (agentManager) {
                const activeAgents = agentManager.getActiveAgents();
                const convertedAgents = activeAgents.map(convertAgent);
                setAgents(convertedAgents);
            }
        }
        catch (err) {
            logger_js_1.default.error('useAgentManager: Error in spawnAgent', { error: err });
            setError(err);
            throw err;
        }
    }, [agentManager, convertAgent]);
    // Terminate agent
    const terminateAgent = (0, react_1.useCallback)(async (agentId) => {
        if (!agentManager) {
            throw new Error('AgentManager not initialized');
        }
        try {
            await agentManager.terminateAgent(agentId);
            // Clear selection if terminated agent was selected
            setSelectedAgentId((currentSelectedId) => {
                return currentSelectedId === agentId ? null : currentSelectedId;
            });
            // Trigger a manual refresh without depending on fetchAgents
            if (agentManager) {
                const activeAgents = agentManager.getActiveAgents();
                const convertedAgents = activeAgents.map(convertAgent);
                setAgents(convertedAgents);
            }
        }
        catch (err) {
            setError(err);
            throw err;
        }
    }, [agentManager, convertAgent]);
    // Memoize canSpawnAgent to prevent re-evaluation on every render
    const canSpawnAgent = (0, react_1.useMemo)(() => {
        return agentManager?.canSpawnAgent() ?? false;
    }, [agentManager, agents.length]); // Re-evaluate when agent count changes
    // Memoize maxAgents
    const maxAgents = (0, react_1.useMemo)(() => {
        return agentManager?.maxAgents ?? 3;
    }, [agentManager]);
    return {
        agents,
        selectedAgentId,
        selectAgent,
        spawnAgent,
        terminateAgent,
        canSpawnAgent,
        maxAgents,
        isLoading,
        error,
    };
};
exports.useAgentManager = useAgentManager;
