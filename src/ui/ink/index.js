"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Ink UI entry point for direct testing with real AgentManager
require("./wdyr"); // Must be first import
const react_1 = __importDefault(require("react"));
const ink_1 = require("ink");
const App_1 = __importDefault(require("./App"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const agent_manager_js_1 = __importDefault(require("../../core/agent-manager.js"));
async function startInkUI() {
    try {
        // Use real AgentManager instead of mock
        const agentManager = new agent_manager_js_1.default();
        await agentManager.initialize();
        logger_js_1.default.info('Real AgentManager initialized for testing');
        // Enable debug mode when performance debugging is active
        const debugMode = process.env.NAPOLEON_DEBUG_RENDERS === 'true' ||
            process.env.NODE_ENV === 'development';
        const { clear } = (0, ink_1.render)(<App_1.default agentManager={agentManager}/>, {
            debug: debugMode
        });
        process.on('exit', () => {
            clear();
        });
        logger_js_1.default.info('Ink UI started successfully with real AgentManager');
    }
    catch (error) {
        logger_js_1.default.error('Failed to start Ink UI', { error: error.message });
        throw error;
    }
}
// Start the UI
startInkUI().catch((error) => {
    console.error('Failed to initialize Ink UI:', error.message);
    process.exit(1);
});
