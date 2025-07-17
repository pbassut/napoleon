#!/usr/bin/env node

/**
 * Agent Cleanup Script
 * Cleans up any running agents before testing
 */

const AgentManager = require('./src/core/agent-manager');
const { SESSIONS_FILE } = require('./src/core/config');
const fs = require('fs');

async function cleanupAllAgents() {
    console.log('🧹 Cleaning up existing agents...');
    
    try {
        const agentManager = new AgentManager();
        await agentManager.initialize();
        
        const activeAgents = agentManager.getActiveAgents();
        console.log(`Found ${activeAgents.length} active agents`);
        
        // Terminate all active agents
        for (const agent of activeAgents) {
            try {
                await agentManager.terminateAgent(agent.id);
                console.log(`✅ Terminated agent: ${agent.id}`);
            } catch (error) {
                console.log(`❌ Failed to terminate agent ${agent.id}: ${error.message}`);
            }
        }
        
        // Clear sessions file
        if (fs.existsSync(SESSIONS_FILE)) {
            const emptySessionsData = {
                sessions: [],
                lastUpdated: new Date().toISOString(),
            };
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify(emptySessionsData, null, 2));
            console.log('✅ Cleared sessions file');
        }
        
        console.log('✅ Cleanup complete');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

// Run cleanup if script is executed directly
if (require.main === module) {
    cleanupAllAgents();
}

module.exports = cleanupAllAgents;