"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const agent_manager_js_1 = __importDefault(require("../core/agent-manager.js"));
const startWithManager_1 = __importDefault(require("./ink/startWithManager"));
/**
 * Napoleon UI Entry Point
 * Now exclusively uses the modern Ink-based React UI
 */
class InkUIWrapper {
    constructor() {
        this.agentManager = null;
    }
    async initialize() {
        logger_js_1.default.info('Initializing Napoleon Ink UI');
        try {
            // Initialize AgentManager
            this.agentManager = new agent_manager_js_1.default();
            await this.agentManager.initialize();
            // Start Ink UI with AgentManager
            await (0, startWithManager_1.default)(this.agentManager);
            logger_js_1.default.info('Ink UI initialized successfully');
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize Ink UI', { error: error.message });
            // Show user-friendly error message
            console.error(chalk_1.default.red('\n❌ Failed to start Napoleon UI\n'));
            console.error('Error:', error.message);
            console.error('\nPlease check:');
            console.error('• Your terminal supports modern UI features');
            console.error('• Node.js version is >= 18.0.0');
            console.error('• No conflicting terminal settings');
            console.error('\nFor support, visit: https://github.com/pbassut/napoleon/issues\n');
            throw error;
        }
    }
}
// Export the UI class directly
exports.default = InkUIWrapper;
