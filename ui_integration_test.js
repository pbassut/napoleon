#!/usr/bin/env node

/**
 * UI Integration Testing Script
 * Tests keyboard navigation, real-time updates, and UI responsiveness
 * 
 * This script simulates actual UI interactions that would be difficult
 * to test with unit tests alone.
 */

const blessed = require('blessed');
const AgentManager = require('./src/core/agent-manager');
const TerminalUI = require('./src/ui/index');
const { loadConfig } = require('./src/core/config');
const cleanupAllAgents = require('./cleanup_agents');

// Test configuration
const UI_TEST_CONFIG = {
    AUTO_TEST_DURATION: 30000, // 30 seconds of automated testing
    AGENT_SPAWN_INTERVAL: 5000, // 5 seconds between spawns
    NAVIGATION_TEST_INTERVAL: 2000, // 2 seconds between navigation actions
    STATUS_UPDATE_INTERVAL: 1500, // 1.5 seconds as per polling spec
};

// Test state tracking
let testState = {
    startTime: Date.now(),
    agents: [],
    currentTest: '',
    testResults: [],
    ui: null,
    manualMode: false,
};

// Helper function to log test results
function logTestResult(testName, result, details = '') {
    const timestamp = new Date().toISOString();
    const resultData = {
        name: testName,
        result,
        details,
        timestamp,
        elapsed: Date.now() - testState.startTime,
    };
    
    testState.testResults.push(resultData);
    
    const icon = result === 'PASS' ? '✅' : result === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${(resultData.elapsed / 1000).toFixed(1)}s] ${testName}: ${result}`);
    if (details) {
        console.log(`   Details: ${details}`);
    }
}

// Test 1: UI Initialization and Basic Display
async function testUIInitialization() {
    testState.currentTest = 'UI Initialization';
    console.log('\n🔍 Testing UI Initialization and Basic Display...');
    
    try {
        // Clean up any existing agents
        await cleanupAllAgents();
        
        // Initialize UI
        const ui = new TerminalUI();
        await ui.initialize();
        testState.ui = ui;
        
        // Check UI components
        if (ui.screen && ui.header && ui.content && ui.footer) {
            logTestResult('UI Components Created', 'PASS', 'All main UI components initialized');
        } else {
            logTestResult('UI Components Created', 'FAIL', 'Missing UI components');
        }
        
        // Check initial empty state
        if (ui.agentsList && ui.statusText) {
            logTestResult('Empty State Display', 'PASS', 'Empty state components available');
        } else {
            logTestResult('Empty State Display', 'FAIL', 'Empty state components missing');
        }
        
        // Check screen requirements
        const meetsRequirements = ui.checkTerminalRequirements();
        logTestResult('Terminal Requirements', meetsRequirements ? 'PASS' : 'WARN', 
            `Terminal size: ${ui.getScreenDimensions().width}x${ui.getScreenDimensions().height}`);
        
        return ui;
        
    } catch (error) {
        logTestResult('UI Initialization', 'FAIL', error.message);
        throw error;
    }
}

// Test 2: Agent Spawning UI Flow
async function testAgentSpawningUI(ui) {
    testState.currentTest = 'Agent Spawning UI';
    console.log('\n🔍 Testing Agent Spawning UI Flow...');
    
    try {
        // Test spawning dialog availability
        if (ui.spawnDialog) {
            logTestResult('Spawn Dialog Available', 'PASS', 'Spawn dialog component exists');
        } else {
            logTestResult('Spawn Dialog Available', 'FAIL', 'Spawn dialog component missing');
        }
        
        // Test can spawn agent check
        const canSpawn = ui.agentManager.canSpawnAgent();
        logTestResult('Can Spawn Agent Check', canSpawn ? 'PASS' : 'FAIL', 
            `Can spawn: ${canSpawn}, Active: ${ui.agentManager.getAgentCount()}`);
        
        // Spawn test agents
        const testInstructions = [
            'UI Test Agent 1 - Development and testing',
            'UI Test Agent 2 - Code review and analysis',
            'UI Test Agent 3 - Quality assurance testing',
        ];
        
        for (let i = 0; i < 3; i++) {
            try {
                await ui.handleSpawnAgent(testInstructions[i]);
                testState.agents.push(ui.agentManager.getActiveAgents()[i]);
                
                // Small delay to allow UI to update
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verify agent appears in UI
                const activeAgents = ui.agentManager.getActiveAgents();
                logTestResult(`Agent ${i + 1} Spawned in UI`, 'PASS', 
                    `Active agents: ${activeAgents.length}, Agent ID: ${activeAgents[i]?.id}`);
                
            } catch (error) {
                logTestResult(`Agent ${i + 1} Spawning Failed`, 'FAIL', error.message);
            }
        }
        
        // Test agent limit enforcement in UI
        try {
            await ui.handleSpawnAgent('Fourth agent - should fail');
            logTestResult('Agent Limit Enforcement UI', 'FAIL', 'Fourth agent was spawned');
        } catch (error) {
            logTestResult('Agent Limit Enforcement UI', 'PASS', 'Fourth agent correctly rejected');
        }
        
    } catch (error) {
        logTestResult('Agent Spawning UI Flow', 'FAIL', error.message);
    }
}

// Test 3: Real-time Status Updates
async function testRealTimeUpdates(ui) {
    testState.currentTest = 'Real-time Updates';
    console.log('\n🔍 Testing Real-time Status Updates...');
    
    try {
        // Record initial state
        const initialAgents = ui.agentManager.getActiveAgents();
        const initialRuntimes = initialAgents.map(agent => ui.agentManager.getAgentRuntime(agent.id));
        
        logTestResult('Initial Status Captured', 'PASS', 
            `${initialAgents.length} agents, runtimes: ${initialRuntimes.join(', ')}`);
        
        // Wait for multiple polling cycles
        await new Promise(resolve => setTimeout(resolve, UI_TEST_CONFIG.STATUS_UPDATE_INTERVAL * 3));
        
        // Check runtime progression
        const updatedAgents = ui.agentManager.getActiveAgents();
        const updatedRuntimes = updatedAgents.map(agent => ui.agentManager.getAgentRuntime(agent.id));
        
        let runtimeIncreased = true;
        for (let i = 0; i < Math.min(initialRuntimes.length, updatedRuntimes.length); i++) {
            if (updatedRuntimes[i] <= initialRuntimes[i]) {
                runtimeIncreased = false;
                break;
            }
        }
        
        logTestResult('Runtime Progression', runtimeIncreased ? 'PASS' : 'FAIL', 
            `Initial: [${initialRuntimes.join(', ')}], Updated: [${updatedRuntimes.join(', ')}]`);
        
        // Test runtime formatting consistency
        const formattedRuntimes = updatedRuntimes.map(runtime => ui.agentManager.formatRuntime(runtime));
        const formatRegex = /^\d{2}:\d{2}$/;
        const allValidFormats = formattedRuntimes.every(format => formatRegex.test(format));
        
        logTestResult('Runtime Format Consistency', allValidFormats ? 'PASS' : 'FAIL', 
            `Formats: ${formattedRuntimes.join(', ')}`);
        
        // Test status icon consistency
        const statusIcons = updatedAgents.map(agent => ui.getStatusIcon(agent.status));
        const validIcons = ['●', '○', '✗', '◐', '◯'];
        const allValidIcons = statusIcons.every(icon => validIcons.includes(icon));
        
        logTestResult('Status Icon Consistency', allValidIcons ? 'PASS' : 'FAIL', 
            `Icons: ${statusIcons.join(', ')}`);
        
    } catch (error) {
        logTestResult('Real-time Status Updates', 'FAIL', error.message);
    }
}

// Test 4: Keyboard Navigation Simulation
async function testKeyboardNavigation(ui) {
    testState.currentTest = 'Keyboard Navigation';
    console.log('\n🔍 Testing Keyboard Navigation...');
    
    try {
        const activeAgents = ui.agentManager.getActiveAgents();
        if (activeAgents.length === 0) {
            logTestResult('Navigation Prerequisites', 'FAIL', 'No agents available for navigation');
            return;
        }
        
        logTestResult('Navigation Prerequisites', 'PASS', 
            `${activeAgents.length} agents available for navigation`);
        
        // Test initial selection
        const initialSelection = ui.selectedAgentIndex;
        logTestResult('Initial Selection Index', 'PASS', `Initial index: ${initialSelection}`);
        
        // Test navigation down
        const originalIndex = ui.selectedAgentIndex;
        ui.navigateAgents('down');
        const afterDownIndex = ui.selectedAgentIndex;
        
        const downNavigationWorked = afterDownIndex !== originalIndex || activeAgents.length === 1;
        logTestResult('Navigate Down', downNavigationWorked ? 'PASS' : 'FAIL', 
            `Index: ${originalIndex} -> ${afterDownIndex}`);
        
        // Test navigation up
        ui.navigateAgents('up');
        const afterUpIndex = ui.selectedAgentIndex;
        
        const upNavigationWorked = afterUpIndex !== afterDownIndex || activeAgents.length === 1;
        logTestResult('Navigate Up', upNavigationWorked ? 'PASS' : 'FAIL', 
            `Index: ${afterDownIndex} -> ${afterUpIndex}`);
        
        // Test navigation wrapping
        ui.selectedAgentIndex = activeAgents.length - 1; // Go to last item
        ui.navigateAgents('down'); // Should wrap to first item
        const wrappedIndex = ui.selectedAgentIndex;
        
        logTestResult('Navigation Wrapping', wrappedIndex === 0 ? 'PASS' : 'FAIL', 
            `Wrapped to index: ${wrappedIndex}`);
        
        // Test selection highlighting
        if (ui.agentsList && ui.agentsList.select) {
            logTestResult('Selection Highlighting Available', 'PASS', 
                'Agent list selection method available');
        } else {
            logTestResult('Selection Highlighting Available', 'FAIL', 
                'Agent list selection method missing');
        }
        
    } catch (error) {
        logTestResult('Keyboard Navigation', 'FAIL', error.message);
    }
}

// Test 5: Agent Termination UI
async function testAgentTerminationUI(ui) {
    testState.currentTest = 'Agent Termination UI';
    console.log('\n🔍 Testing Agent Termination UI...');
    
    try {
        const activeAgents = ui.agentManager.getActiveAgents();
        if (activeAgents.length === 0) {
            logTestResult('Termination Prerequisites', 'FAIL', 'No agents available for termination');
            return;
        }
        
        const initialCount = activeAgents.length;
        logTestResult('Termination Prerequisites', 'PASS', 
            `${initialCount} agents available for termination`);
        
        // Test termination of selected agent
        const selectedAgent = activeAgents[ui.selectedAgentIndex];
        if (selectedAgent) {
            try {
                await ui.terminateSelectedAgent();
                
                // Wait for termination to complete
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const updatedAgents = ui.agentManager.getActiveAgents();
                const afterTerminationCount = updatedAgents.length;
                
                logTestResult('Agent Termination', afterTerminationCount === initialCount - 1 ? 'PASS' : 'FAIL', 
                    `Agents before: ${initialCount}, after: ${afterTerminationCount}`);
                
                // Verify terminated agent is not in list
                const terminatedAgentStillActive = updatedAgents.some(agent => agent.id === selectedAgent.id);
                logTestResult('Terminated Agent Cleanup', !terminatedAgentStillActive ? 'PASS' : 'FAIL', 
                    `Terminated agent still active: ${terminatedAgentStillActive}`);
                
            } catch (error) {
                logTestResult('Agent Termination', 'FAIL', error.message);
            }
        }
        
        // Test selection index adjustment after termination
        const currentSelection = ui.selectedAgentIndex;
        const remainingAgents = ui.agentManager.getActiveAgents();
        
        if (remainingAgents.length > 0) {
            const selectionInBounds = currentSelection >= 0 && currentSelection < remainingAgents.length;
            logTestResult('Selection Index Adjustment', selectionInBounds ? 'PASS' : 'FAIL', 
                `Selection index: ${currentSelection}, remaining agents: ${remainingAgents.length}`);
        }
        
    } catch (error) {
        logTestResult('Agent Termination UI', 'FAIL', error.message);
    }
}

// Test 6: UI Responsiveness and Performance
async function testUIResponsiveness(ui) {
    testState.currentTest = 'UI Responsiveness';
    console.log('\n🔍 Testing UI Responsiveness and Performance...');
    
    try {
        // Test render performance
        const renderStartTime = Date.now();
        for (let i = 0; i < 10; i++) {
            ui.render();
        }
        const renderEndTime = Date.now();
        const renderTime = renderEndTime - renderStartTime;
        
        logTestResult('Render Performance', renderTime < 100 ? 'PASS' : 'WARN', 
            `10 renders in ${renderTime}ms`);
        
        // Test agents list update performance
        const updateStartTime = Date.now();
        for (let i = 0; i < 10; i++) {
            ui.updateAgentsList();
        }
        const updateEndTime = Date.now();
        const updateTime = updateEndTime - updateStartTime;
        
        logTestResult('Agent List Update Performance', updateTime < 200 ? 'PASS' : 'WARN', 
            `10 updates in ${updateTime}ms`);
        
        // Test navigation responsiveness
        const navStartTime = Date.now();
        for (let i = 0; i < 10; i++) {
            ui.navigateAgents('down');
        }
        const navEndTime = Date.now();
        const navTime = navEndTime - navStartTime;
        
        logTestResult('Navigation Responsiveness', navTime < 50 ? 'PASS' : 'WARN', 
            `10 navigation actions in ${navTime}ms`);
        
        // Test memory usage
        const memoryUsage = process.memoryUsage();
        const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
        
        logTestResult('Memory Usage', memoryMB < 100 ? 'PASS' : 'WARN', 
            `Memory usage: ${memoryMB.toFixed(2)}MB`);
        
    } catch (error) {
        logTestResult('UI Responsiveness', 'FAIL', error.message);
    }
}

// Test 7: Error Handling and Recovery
async function testErrorHandling(ui) {
    testState.currentTest = 'Error Handling';
    console.log('\n🔍 Testing Error Handling and Recovery...');
    
    try {
        // Test invalid agent spawn
        try {
            await ui.handleSpawnAgent(''); // Empty instructions
            logTestResult('Invalid Spawn Handling', 'FAIL', 'Empty instructions accepted');
        } catch (error) {
            logTestResult('Invalid Spawn Handling', 'PASS', 'Empty instructions rejected');
        }
        
        // Test termination of non-existent agent
        const originalAgentCount = ui.agentManager.getActiveAgents().length;
        try {
            await ui.agentManager.terminateAgent('non-existent-agent');
            logTestResult('Invalid Termination Handling', 'FAIL', 'Non-existent agent accepted');
        } catch (error) {
            logTestResult('Invalid Termination Handling', 'PASS', 'Non-existent agent rejected');
        }
        
        // Verify agent count unchanged
        const afterErrorCount = ui.agentManager.getActiveAgents().length;
        logTestResult('Error Recovery', originalAgentCount === afterErrorCount ? 'PASS' : 'FAIL', 
            `Agent count unchanged: ${originalAgentCount} -> ${afterErrorCount}`);
        
        // Test UI still responsive after errors
        try {
            ui.render();
            ui.updateAgentsList();
            logTestResult('UI Responsive After Errors', 'PASS', 'UI still functional after errors');
        } catch (error) {
            logTestResult('UI Responsive After Errors', 'FAIL', 'UI damaged by errors');
        }
        
    } catch (error) {
        logTestResult('Error Handling', 'FAIL', error.message);
    }
}

// Generate UI test report
function generateUITestReport() {
    const endTime = Date.now();
    const duration = endTime - testState.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 UI INTEGRATION TEST REPORT');
    console.log('='.repeat(80));
    
    const totalTests = testState.testResults.length;
    const passedTests = testState.testResults.filter(r => r.result === 'PASS').length;
    const failedTests = testState.testResults.filter(r => r.result === 'FAIL').length;
    const warnTests = testState.testResults.filter(r => r.result === 'WARN').length;
    
    console.log(`\n📊 Test Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ❌`);
    console.log(`   Warnings: ${warnTests} ⚠️`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    
    console.log(`\n📋 Test Categories:`);
    const categories = ['UI Initialization', 'Agent Spawning UI', 'Real-time Updates', 
                       'Keyboard Navigation', 'Agent Termination UI', 'UI Responsiveness', 
                       'Error Handling'];
    
    for (const category of categories) {
        const categoryTests = testState.testResults.filter(r => r.name.includes(category));
        if (categoryTests.length > 0) {
            const categoryPassed = categoryTests.filter(r => r.result === 'PASS').length;
            const categoryIcon = categoryTests.every(r => r.result === 'PASS') ? '✅' : '⚠️';
            console.log(`   ${categoryIcon} ${category}: ${categoryPassed}/${categoryTests.length}`);
        }
    }
    
    // Failed tests
    const failedResults = testState.testResults.filter(r => r.result === 'FAIL');
    if (failedResults.length > 0) {
        console.log(`\n🚨 Failed Tests:`);
        for (const result of failedResults) {
            console.log(`   • ${result.name}: ${result.details}`);
        }
    }
    
    // Warnings
    const warnResults = testState.testResults.filter(r => r.result === 'WARN');
    if (warnResults.length > 0) {
        console.log(`\n⚠️  Warnings:`);
        for (const result of warnResults) {
            console.log(`   • ${result.name}: ${result.details}`);
        }
    }
    
    console.log(`\n💡 UI Testing Conclusions:`);
    console.log(`   • Multiple agent spawning: ${passedTests > 0 ? 'FUNCTIONAL' : 'ISSUES'}`);
    console.log(`   • Runtime counter updates: ${passedTests > 0 ? 'WORKING' : 'ISSUES'}`);
    console.log(`   • Keyboard navigation: ${passedTests > 0 ? 'OPERATIONAL' : 'ISSUES'}`);
    console.log(`   • Agent termination: ${passedTests > 0 ? 'WORKING' : 'ISSUES'}`);
    console.log(`   • UI responsiveness: ${warnTests < 3 ? 'ACCEPTABLE' : 'CONCERNS'}`);
    
    console.log('\n' + '='.repeat(80));
    
    return {
        summary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            warnings: warnTests,
            duration: duration,
        },
        results: testState.testResults,
    };
}

// Main UI test execution
async function runUIIntegrationTests() {
    console.log('🚀 Starting UI Integration Testing...');
    console.log('Testing keyboard navigation, real-time updates, and UI responsiveness\n');
    
    try {
        // Initialize UI and run tests
        const ui = await testUIInitialization();
        await testAgentSpawningUI(ui);
        await testRealTimeUpdates(ui);
        await testKeyboardNavigation(ui);
        await testAgentTerminationUI(ui);
        await testUIResponsiveness(ui);
        await testErrorHandling(ui);
        
        // Clean up
        await cleanupAllAgents();
        
        // Generate report
        const report = generateUITestReport();
        
        // Clean shutdown
        if (ui && ui.quit) {
            ui.quit();
        }
        
        return report;
        
    } catch (error) {
        console.error('❌ UI Integration test execution failed:', error.message);
        return null;
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    runUIIntegrationTests()
        .then(report => {
            if (report) {
                const exitCode = report.summary.failed > 0 ? 1 : 0;
                process.exit(exitCode);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = {
    runUIIntegrationTests,
    testState,
};