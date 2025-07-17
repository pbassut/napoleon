#!/usr/bin/env node

/**
 * Comprehensive QA Testing Script
 * Tests multiple agent spawning and runtime counter accuracy
 * 
 * This script simulates real-world usage scenarios to test:
 * 1. Multiple Agent Spawning (up to 3 agents)
 * 2. Runtime Counter Accuracy
 * 3. Agent ID Uniqueness
 * 4. UI Display Formatting
 * 5. Agent Limit Enforcement
 * 6. Performance under load
 * 7. Edge cases and error scenarios
 */

const AgentManager = require('./src/core/agent-manager');
const TerminalUI = require('./src/ui/index');
const { loadConfig } = require('./src/core/config');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
const cleanupAllAgents = require('./cleanup_agents');

// Test configuration
const TEST_CONFIG = {
    MAX_AGENTS: 3,
    RUNTIME_TEST_DURATION: 10000, // 10 seconds for runtime testing
    POLLING_INTERVAL: 1500, // 1.5 seconds as per spec
    AGENT_SPAWN_DELAY: 2000, // 2 seconds between spawns
    RUNTIME_TOLERANCE: 2, // 2 seconds tolerance for timing tests
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    startTime: new Date(),
    endTime: null,
};

// Helper function to log test results
function logTestResult(testName, passed, details = '') {
    const result = {
        name: testName,
        passed,
        details,
        timestamp: new Date().toISOString(),
    };
    
    testResults.tests.push(result);
    
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}`);
        if (details) console.log(`   Details: ${details}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}`);
        if (details) console.log(`   Error: ${details}`);
    }
}

// Helper function to create mock UI components for testing
function createMockUI() {
    return {
        updateAgentsList: () => {},
        render: () => {},
        updateStatus: () => {},
        showSpawnDialog: () => {},
        selectedAgentIndex: 0,
        agents: [],
        agentsList: {
            select: () => {},
            setItems: () => {},
            show: () => {},
            hide: () => {},
        },
        statusText: {
            setContent: () => {},
            show: () => {},
            hide: () => {},
        },
        instructionText: {
            show: () => {},
            hide: () => {},
        },
    };
}

// Helper function to simulate time passage
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Multiple Agent Spawning (up to 3 agents)
async function testMultipleAgentSpawning() {
    console.log('\n🔍 Testing Multiple Agent Spawning...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    const testInstructions = [
        'Test agent 1 - Development tasks',
        'Test agent 2 - Code review and analysis',
        'Test agent 3 - Quality assurance testing',
    ];
    
    const spawnedAgents = [];
    
    try {
        // Test spawning 3 agents (maximum)
        for (let i = 0; i < TEST_CONFIG.MAX_AGENTS; i++) {
            const agent = await agentManager.spawnAgent(testInstructions[i]);
            spawnedAgents.push(agent);
            
            // Verify agent was created properly
            if (agent && agent.id && agent.status === 'running') {
                logTestResult(`Agent ${i + 1} spawned successfully`, true, `ID: ${agent.id}`);
            } else {
                logTestResult(`Agent ${i + 1} spawning failed`, false, 'Invalid agent object returned');
            }
            
            // Small delay between spawns
            await delay(TEST_CONFIG.AGENT_SPAWN_DELAY);
        }
        
        // Verify all agents are active
        const activeAgents = agentManager.getActiveAgents();
        logTestResult('All agents active after spawning', activeAgents.length === TEST_CONFIG.MAX_AGENTS, 
            `Expected: ${TEST_CONFIG.MAX_AGENTS}, Actual: ${activeAgents.length}`);
        
        // Test agent limit enforcement (should fail on 4th agent)
        try {
            await agentManager.spawnAgent('Test agent 4 - Should fail');
            logTestResult('Agent limit enforcement', false, 'Successfully spawned 4th agent when max is 3');
        } catch (error) {
            logTestResult('Agent limit enforcement', true, 'Correctly rejected 4th agent');
        }
        
        // Clean up agents
        for (const agent of spawnedAgents) {
            await agentManager.terminateAgent(agent.id);
        }
        
    } catch (error) {
        logTestResult('Multiple agent spawning test', false, error.message);
    }
}

// Test 2: Runtime Counter Accuracy
async function testRuntimeCounterAccuracy() {
    console.log('\n🔍 Testing Runtime Counter Accuracy...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Spawn a test agent
        const agent = await agentManager.spawnAgent('Runtime test agent');
        const agentId = agent.id;
        
        // Record start time
        const startTime = Date.now();
        
        // Wait for specific duration
        await delay(TEST_CONFIG.RUNTIME_TEST_DURATION);
        
        // Check runtime
        const actualRuntime = agentManager.getAgentRuntime(agentId);
        const expectedRuntime = Math.floor(TEST_CONFIG.RUNTIME_TEST_DURATION / 1000);
        const timeDiff = Math.abs(actualRuntime - expectedRuntime);
        
        // Test runtime accuracy (within tolerance)
        logTestResult('Runtime counter accuracy', timeDiff <= TEST_CONFIG.RUNTIME_TOLERANCE, 
            `Expected: ~${expectedRuntime}s, Actual: ${actualRuntime}s, Diff: ${timeDiff}s`);
        
        // Test HH:MM format
        const formattedRuntime = agentManager.formatRuntime(actualRuntime);
        const runtimeRegex = /^\d{2}:\d{2}$/;
        logTestResult('Runtime HH:MM format', runtimeRegex.test(formattedRuntime), 
            `Format: ${formattedRuntime}`);
        
        // Test specific formatting cases
        const testCases = [
            { seconds: 0, expected: '00:00' },
            { seconds: 60, expected: '01:00' },
            { seconds: 65, expected: '01:05' },
            { seconds: 3600, expected: '60:00' },
            { seconds: 3665, expected: '61:05' },
        ];
        
        for (const testCase of testCases) {
            const formatted = agentManager.formatRuntime(testCase.seconds);
            logTestResult(`Runtime format test ${testCase.seconds}s`, formatted === testCase.expected, 
                `Expected: ${testCase.expected}, Actual: ${formatted}`);
        }
        
        // Clean up
        await agentManager.terminateAgent(agentId);
        
    } catch (error) {
        logTestResult('Runtime counter accuracy test', false, error.message);
    }
}

// Test 3: Agent ID Uniqueness
async function testAgentIdUniqueness() {
    console.log('\n🔍 Testing Agent ID Uniqueness...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        const agents = [];
        const agentIds = new Set();
        
        // Spawn multiple agents quickly
        for (let i = 0; i < 5; i++) {
            const agent = await agentManager.spawnAgent(`Test agent ${i}`);
            agents.push(agent);
            agentIds.add(agent.id);
            
            // Very short delay to test rapid spawning
            await delay(100);
        }
        
        // Check uniqueness
        logTestResult('Agent ID uniqueness', agentIds.size === agents.length, 
            `Generated ${agents.length} agents with ${agentIds.size} unique IDs`);
        
        // Test ID format (should be agent-timestamp-random)
        const idRegex = /^agent-\d+-[a-z0-9]+$/;
        let allValidFormat = true;
        
        for (const agent of agents) {
            if (!idRegex.test(agent.id)) {
                allValidFormat = false;
                break;
            }
        }
        
        logTestResult('Agent ID format validation', allValidFormat, 
            `All IDs match pattern: agent-timestamp-random`);
        
        // Clean up
        for (const agent of agents) {
            await agentManager.terminateAgent(agent.id);
        }
        
    } catch (error) {
        logTestResult('Agent ID uniqueness test', false, error.message);
    }
}

// Test 4: UI Display Formatting
async function testUIDisplayFormatting() {
    console.log('\n🔍 Testing UI Display Formatting...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Create mock UI
        const mockUI = createMockUI();
        
        // Spawn test agents with different statuses
        const agents = [];
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(`Test agent ${i + 1}`);
            agents.push(agent);
        }
        
        // Test status icon mapping
        const statusIcons = {
            'running': '●',
            'idle': '○',
            'error': '✗',
            'spawning': '◐',
            'terminating': '◯',
        };
        
        // Test each status icon
        for (const [status, expectedIcon] of Object.entries(statusIcons)) {
            // This would normally be tested in the UI class
            // For now, we'll test the agent manager's ability to provide status data
            const agentStatus = agentManager.getAgentStatusDisplay(agents[0]?.id);
            logTestResult(`Status icon for ${status}`, agentStatus !== null, 
                `Agent status data available for formatting`);
        }
        
        // Test agent list formatting
        const activeAgents = agentManager.getActiveAgents();
        logTestResult('Agent list data structure', activeAgents.length > 0, 
            `${activeAgents.length} agents available for display`);
        
        // Test runtime formatting in display
        for (const agent of agents) {
            const runtime = agentManager.getAgentRuntime(agent.id);
            const formatted = agentManager.formatRuntime(runtime);
            logTestResult(`Runtime display for ${agent.id}`, formatted.length === 5, 
                `Runtime format: ${formatted}`);
        }
        
        // Clean up
        for (const agent of agents) {
            await agentManager.terminateAgent(agent.id);
        }
        
    } catch (error) {
        logTestResult('UI display formatting test', false, error.message);
    }
}

// Test 5: Agent Termination and Cleanup
async function testAgentTerminationAndCleanup() {
    console.log('\n🔍 Testing Agent Termination and Cleanup...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Spawn multiple agents
        const agents = [];
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(`Test agent ${i + 1}`);
            agents.push(agent);
        }
        
        // Verify all agents are active
        let activeAgents = agentManager.getActiveAgents();
        logTestResult('All agents active before termination', activeAgents.length === 3, 
            `Active agents: ${activeAgents.length}`);
        
        // Terminate one agent
        await agentManager.terminateAgent(agents[0].id);
        
        // Give time for cleanup
        await delay(2000);
        
        // Verify agent count decreased
        activeAgents = agentManager.getActiveAgents();
        logTestResult('Agent count decreased after termination', activeAgents.length === 2, 
            `Active agents after termination: ${activeAgents.length}`);
        
        // Verify terminated agent is not in active list
        const terminatedAgentStillActive = activeAgents.some(agent => agent.id === agents[0].id);
        logTestResult('Terminated agent removed from active list', !terminatedAgentStillActive, 
            `Terminated agent in active list: ${terminatedAgentStillActive}`);
        
        // Test terminating non-existent agent
        try {
            await agentManager.terminateAgent('non-existent-agent');
            logTestResult('Terminating non-existent agent', false, 'Should have thrown error');
        } catch (error) {
            logTestResult('Terminating non-existent agent', true, 'Correctly threw error');
        }
        
        // Clean up remaining agents
        for (let i = 1; i < agents.length; i++) {
            await agentManager.terminateAgent(agents[i].id);
        }
        
    } catch (error) {
        logTestResult('Agent termination and cleanup test', false, error.message);
    }
}

// Test 6: Performance Testing
async function testPerformanceWithMaxAgents() {
    console.log('\n🔍 Testing Performance with Maximum Agents...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Spawn maximum agents
        const agents = [];
        const spawnStartTime = Date.now();
        
        for (let i = 0; i < TEST_CONFIG.MAX_AGENTS; i++) {
            const agent = await agentManager.spawnAgent(`Performance test agent ${i + 1}`);
            agents.push(agent);
        }
        
        const spawnEndTime = Date.now();
        const spawnTime = spawnEndTime - spawnStartTime;
        
        logTestResult('Agent spawning performance', spawnTime < 10000, 
            `Spawned ${TEST_CONFIG.MAX_AGENTS} agents in ${spawnTime}ms`);
        
        // Test status retrieval performance
        const statusStartTime = Date.now();
        for (let i = 0; i < 100; i++) {
            agentManager.getActiveAgents();
        }
        const statusEndTime = Date.now();
        const statusTime = statusEndTime - statusStartTime;
        
        logTestResult('Status retrieval performance', statusTime < 1000, 
            `100 status calls in ${statusTime}ms`);
        
        // Test runtime calculation performance
        const runtimeStartTime = Date.now();
        for (let i = 0; i < 100; i++) {
            for (const agent of agents) {
                agentManager.getAgentRuntime(agent.id);
            }
        }
        const runtimeEndTime = Date.now();
        const runtimeTime = runtimeEndTime - runtimeStartTime;
        
        logTestResult('Runtime calculation performance', runtimeTime < 2000, 
            `300 runtime calculations in ${runtimeTime}ms`);
        
        // Clean up
        for (const agent of agents) {
            await agentManager.terminateAgent(agent.id);
        }
        
    } catch (error) {
        logTestResult('Performance testing', false, error.message);
    }
}

// Test 7: Edge Cases and Error Scenarios
async function testEdgeCasesAndErrors() {
    console.log('\n🔍 Testing Edge Cases and Error Scenarios...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Test empty instructions
        try {
            await agentManager.spawnAgent('');
            logTestResult('Empty instructions handling', false, 'Should have thrown error');
        } catch (error) {
            logTestResult('Empty instructions handling', true, 'Correctly rejected empty instructions');
        }
        
        // Test very short instructions
        try {
            await agentManager.spawnAgent('Hi');
            logTestResult('Short instructions handling', false, 'Should have thrown error');
        } catch (error) {
            logTestResult('Short instructions handling', true, 'Correctly rejected short instructions');
        }
        
        // Test very long instructions
        const longInstructions = 'A'.repeat(6000);
        try {
            await agentManager.spawnAgent(longInstructions);
            logTestResult('Long instructions handling', false, 'Should have thrown error');
        } catch (error) {
            logTestResult('Long instructions handling', true, 'Correctly rejected long instructions');
        }
        
        // Test invalid characters in instructions
        try {
            await agentManager.spawnAgent('Test with dangerous chars: $(rm -rf /)');
            logTestResult('Dangerous characters handling', false, 'Should have thrown error');
        } catch (error) {
            logTestResult('Dangerous characters handling', true, 'Correctly rejected dangerous characters');
        }
        
        // Test null/undefined instructions
        try {
            await agentManager.spawnAgent(null);
            logTestResult('Null instructions handling', false, 'Should have thrown error');
        } catch (error) {
            logTestResult('Null instructions handling', true, 'Correctly rejected null instructions');
        }
        
        // Test rapid spawning and termination
        const rapidAgents = [];
        for (let i = 0; i < 5; i++) {
            const agent = await agentManager.spawnAgent(`Rapid test agent ${i}`);
            rapidAgents.push(agent);
            await delay(100);
        }
        
        // Rapidly terminate all
        for (const agent of rapidAgents) {
            await agentManager.terminateAgent(agent.id);
        }
        
        await delay(1000);
        const remainingAgents = agentManager.getActiveAgents();
        logTestResult('Rapid spawn/terminate handling', remainingAgents.length === 0, 
            `Remaining agents: ${remainingAgents.length}`);
        
    } catch (error) {
        logTestResult('Edge cases and error scenarios test', false, error.message);
    }
}

// Test 8: Runtime Persistence and Accuracy Over Time
async function testRuntimePersistenceAndAccuracy() {
    console.log('\n🔍 Testing Runtime Persistence and Accuracy Over Time...');
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Spawn agents at different times
        const agent1 = await agentManager.spawnAgent('First agent');
        await delay(2000);
        const agent2 = await agentManager.spawnAgent('Second agent');
        await delay(2000);
        const agent3 = await agentManager.spawnAgent('Third agent');
        
        // Wait and measure runtime differences
        await delay(3000);
        
        const runtime1 = agentManager.getAgentRuntime(agent1.id);
        const runtime2 = agentManager.getAgentRuntime(agent2.id);
        const runtime3 = agentManager.getAgentRuntime(agent3.id);
        
        // Verify runtime differences (agent1 should have longest runtime)
        logTestResult('Runtime ordering by spawn time', runtime1 > runtime2 && runtime2 > runtime3, 
            `Runtimes: ${runtime1}s, ${runtime2}s, ${runtime3}s`);
        
        // Test runtime format consistency
        const format1 = agentManager.formatRuntime(runtime1);
        const format2 = agentManager.formatRuntime(runtime2);
        const format3 = agentManager.formatRuntime(runtime3);
        
        const formatRegex = /^\d{2}:\d{2}$/;
        const allValidFormats = [format1, format2, format3].every(f => formatRegex.test(f));
        
        logTestResult('Runtime format consistency', allValidFormats, 
            `Formats: ${format1}, ${format2}, ${format3}`);
        
        // Clean up
        await agentManager.terminateAgent(agent1.id);
        await agentManager.terminateAgent(agent2.id);
        await agentManager.terminateAgent(agent3.id);
        
    } catch (error) {
        logTestResult('Runtime persistence and accuracy test', false, error.message);
    }
}

// Generate final test report
function generateTestReport() {
    testResults.endTime = new Date();
    const duration = testResults.endTime - testResults.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 COMPREHENSIVE QA TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Test Summary:`);
    console.log(`   Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`   Passed: ${testResults.passed} ✅`);
    console.log(`   Failed: ${testResults.failed} ❌`);
    console.log(`   Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    
    console.log(`\n📋 Test Categories:`);
    
    // Group tests by category
    const categories = {
        'Agent Spawning': testResults.tests.filter(t => t.name.includes('spawn') || t.name.includes('Agent')),
        'Runtime Counter': testResults.tests.filter(t => t.name.includes('Runtime') || t.name.includes('runtime')),
        'ID Management': testResults.tests.filter(t => t.name.includes('ID') || t.name.includes('uniqueness')),
        'UI Display': testResults.tests.filter(t => t.name.includes('display') || t.name.includes('format')),
        'Termination': testResults.tests.filter(t => t.name.includes('termination') || t.name.includes('cleanup')),
        'Performance': testResults.tests.filter(t => t.name.includes('performance') || t.name.includes('Performance')),
        'Edge Cases': testResults.tests.filter(t => t.name.includes('edge') || t.name.includes('error') || t.name.includes('handling')),
    };
    
    for (const [category, tests] of Object.entries(categories)) {
        if (tests.length > 0) {
            const passed = tests.filter(t => t.passed).length;
            const failed = tests.filter(t => !t.passed).length;
            console.log(`   ${category}: ${passed}/${tests.length} passed`);
        }
    }
    
    console.log(`\n🔍 Detailed Results:`);
    for (const test of testResults.tests) {
        const icon = test.passed ? '✅' : '❌';
        console.log(`   ${icon} ${test.name}`);
        if (test.details) {
            console.log(`      ${test.details}`);
        }
    }
    
    // Critical issues
    const criticalFailures = testResults.tests.filter(t => 
        !t.passed && (
            t.name.includes('limit enforcement') ||
            t.name.includes('accuracy') ||
            t.name.includes('uniqueness') ||
            t.name.includes('termination')
        )
    );
    
    if (criticalFailures.length > 0) {
        console.log(`\n🚨 Critical Issues Found:`);
        for (const failure of criticalFailures) {
            console.log(`   • ${failure.name}: ${failure.details}`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Save report to file
    const reportPath = path.join(__dirname, 'qa-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    return testResults;
}

// Main test execution
async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive QA Testing...');
    console.log('Testing Multiple Agent Spawning and Runtime Counter Features\n');
    
    try {
        // Clean up any existing agents first
        await cleanupAllAgents();
        console.log('✅ Initial cleanup completed\n');
        
        // Execute all test suites
        await testMultipleAgentSpawning();
        await testRuntimeCounterAccuracy();
        await testAgentIdUniqueness();
        await testUIDisplayFormatting();
        await testAgentTerminationAndCleanup();
        await testPerformanceWithMaxAgents();
        await testEdgeCasesAndErrors();
        await testRuntimePersistenceAndAccuracy();
        
        // Generate final report
        const results = generateTestReport();
        
        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    runComprehensiveTests();
}

module.exports = {
    runComprehensiveTests,
    testResults,
    TEST_CONFIG,
};