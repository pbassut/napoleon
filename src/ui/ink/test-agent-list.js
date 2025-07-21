#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const ink_1 = require("ink");
const AgentList_1 = __importDefault(require("./components/AgentList/AgentList"));
// Mock agent data generator
function generateMockAgents(count) {
    const statuses = ['running', 'pending', 'error', 'terminated', 'success'];
    const prefixes = ['feature', 'bugfix', 'refactor', 'docs', 'test', 'perf', 'security', 'deploy'];
    const suffixes = ['auth', 'ui', 'api', 'database', 'cache', 'logging', 'monitoring', 'config'];
    const agents = [];
    for (let i = 0; i < count; i++) {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        agents.push({
            id: `agent-${i + 1}`,
            name: `${prefix}-${suffix}-agent-${i + 1}`,
            status,
            startTime: new Date(),
        });
    }
    return agents;
}
// Test App
const TestApp = () => {
    const [agents] = (0, react_1.useState)(() => generateMockAgents(50));
    const [selectedIndex, setSelectedIndex] = (0, react_1.useState)(0);
    // Import AgentList dynamically
    const AgentList = AgentList_1.default;
    return react_1.default.createElement(ink_1.Box, { flexDirection: 'column', height: '100%' }, react_1.default.createElement(ink_1.Box, { borderStyle: 'single', paddingX: 1 }, react_1.default.createElement(ink_1.Text, { color: 'cyan', bold: true }, 'Agent List Test - 50 Agents')), react_1.default.createElement(ink_1.Box, { flexGrow: 1, paddingX: 1, paddingY: 1 }, react_1.default.createElement(AgentList, {
        agents,
        selectedIndex,
        onSelectionChange: setSelectedIndex,
        height: 20,
    })), react_1.default.createElement(ink_1.Box, { paddingX: 1 }, react_1.default.createElement(ink_1.Text, { color: 'gray' }, `Selected: ${agents[selectedIndex]?.name || 'None'} | Use ↑/↓ or j/k to navigate | Press q to quit`)));
};
// Run the test
const { clear } = (0, ink_1.render)(react_1.default.createElement(TestApp));
process.on('exit', () => {
    clear();
});
