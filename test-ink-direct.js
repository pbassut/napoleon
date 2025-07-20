#!/usr/bin/env node

// Direct test of Ink UI without git checks
const path = require('path');
const os = require('os');

// Mock minimal config
const config = {
  napoleonDir: path.join(os.homedir(), '.napoleon'),
  apiKey: process.env.ANTHROPIC_API_KEY,
};

// Create minimal AgentManager
const AgentManager = require('./src/core/agent-manager');
const agentManager = new AgentManager();

// Initialize and start Ink UI
async function testInkUI() {
  try {
    await agentManager.initialize();
    
    // Start Ink UI with manager
    const startInkWithManager = require('./src/ui/ink/startWithManager');
    await startInkWithManager(agentManager);
  } catch (error) {
    console.error('Error starting Ink UI:', error);
    process.exit(1);
  }
}

testInkUI();