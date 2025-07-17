#!/usr/bin/env node

/**
 * Improved QA Testing Script for Multiple Agent Spawning and Runtime Counter
 * 
 * This script provides comprehensive testing with proper cleanup between tests
 * and real-world simulation of user interactions.
 */

const AgentManager = require('./src/core/agent-manager');
const TerminalUI = require('./src/ui/index');
const { loadConfig } = require('./src/core/config');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');
const cleanupAllAgents = require('./cleanup_agents');

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
    startTime: new Date(),
    endTime: null,
    summary: {
        multipleAgentSpawning: { passed: 0, failed: 0, total: 0 },
        runtimeCounter: { passed: 0, failed: 0, total: 0 },
        agentIdUniqueness: { passed: 0, failed: 0, total: 0 },
        uiDisplay: { passed: 0, failed: 0, total: 0 },
        agentTermination: { passed: 0, failed: 0, total: 0 },
        performanceTesting: { passed: 0, failed: 0, total: 0 },
        edgeCases: { passed: 0, failed: 0, total: 0 },
    }
};

// Helper function to log test results
function logTestResult(testName, passed, details = '', category = 'general') {
    const result = {
        name: testName,
        passed,
        details,
        category,
        timestamp: new Date().toISOString(),
    };
    
    testResults.tests.push(result);
    
    if (testResults.summary[category]) {
        testResults.summary[category].total++;
        if (passed) {
            testResults.summary[category].passed++;
        } else {
            testResults.summary[category].failed++;
        }
    }
    
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

// Helper function to simulate time passage
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Multiple Agent Spawning with proper cleanup
async function testMultipleAgentSpawning() {
    console.log('\n🔍 Testing Multiple Agent Spawning...');
    
    await cleanupAllAgents();
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    const testInstructions = [
        'Development agent - implement new features',
        'QA agent - perform comprehensive testing',
        'Code review agent - analyze code quality',
    ];
    
    const spawnedAgents = [];
    
    try {
        // Test 1.1: Spawn agents one by one
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(testInstructions[i]);
            spawnedAgents.push(agent);
            
            // Verify agent was created properly
            if (agent && agent.id && agent.status === 'running') {
                logTestResult(`Agent ${i + 1} spawned successfully`, true, 
                    `ID: ${agent.id}, Status: ${agent.status}`, 'multipleAgentSpawning');
            } else {
                logTestResult(`Agent ${i + 1} spawning failed`, false, 
                    'Invalid agent object returned', 'multipleAgentSpawning');
            }
            
            await delay(1000);
        }
        
        // Test 1.2: Verify all agents are active
        const activeAgents = agentManager.getActiveAgents();
        logTestResult('All 3 agents active after spawning', activeAgents.length === 3, 
            `Expected: 3, Actual: ${activeAgents.length}`, 'multipleAgentSpawning');
        
        // Test 1.3: Verify agent limit enforcement
        try {
            await agentManager.spawnAgent('Fourth agent - should fail');
            logTestResult('Agent limit enforcement (4th agent)', false, 
                'Successfully spawned 4th agent when max is 3', 'multipleAgentSpawning');
        } catch (error) {
            logTestResult('Agent limit enforcement (4th agent)', true, 
                'Correctly rejected 4th agent', 'multipleAgentSpawning');
        }
        
        // Test 1.4: Verify agent display data
        for (let i = 0; i < spawnedAgents.length; i++) {
            const agent = spawnedAgents[i];
            const statusDisplay = agentManager.getAgentStatusDisplay(agent.id);
            
            if (statusDisplay && statusDisplay.id && statusDisplay.status && statusDisplay.runtime) {
                logTestResult(`Agent ${i + 1} display data complete`, true, 
                    `ID: ${statusDisplay.id}, Status: ${statusDisplay.status}, Runtime: ${statusDisplay.runtime}`, 
                    'multipleAgentSpawning');
            } else {
                logTestResult(`Agent ${i + 1} display data incomplete`, false, 
                    'Missing required display fields', 'multipleAgentSpawning');
            }
        }
        
        // Clean up agents
        for (const agent of spawnedAgents) {
            await agentManager.terminateAgent(agent.id);
        }
        
        await delay(2000); // Wait for cleanup
        
    } catch (error) {
        logTestResult('Multiple agent spawning test suite', false, 
            error.message, 'multipleAgentSpawning');
    }
}

// Test 2: Runtime Counter Accuracy and Formatting
async function testRuntimeCounterAccuracy() {
    console.log('\n🔍 Testing Runtime Counter Accuracy...');
    
    await cleanupAllAgents();
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Test 2.1: Basic runtime accuracy
        const agent = await agentManager.spawnAgent('Runtime accuracy test agent');
        const agentId = agent.id;
        
        await delay(5000); // Wait 5 seconds
        
        const actualRuntime = agentManager.getAgentRuntime(agentId);
        const expectedRuntime = 5; // 5 seconds
        const timeDiff = Math.abs(actualRuntime - expectedRuntime);
        
        logTestResult('Runtime counter accuracy (5s test)', timeDiff <= 2, 
            `Expected: ~${expectedRuntime}s, Actual: ${actualRuntime}s, Diff: ${timeDiff}s`, 
            'runtimeCounter');
        
        // Test 2.2: HH:MM format validation
        const formattedRuntime = agentManager.formatRuntime(actualRuntime);
        const runtimeRegex = /^\d{2}:\d{2}$/;
        logTestResult('Runtime HH:MM format validation', runtimeRegex.test(formattedRuntime), 
            `Format: ${formattedRuntime}`, 'runtimeCounter');
        
        // Test 2.3: Specific formatting test cases (corrected expectations)
        const formatTestCases = [
            { seconds: 0, expected: '00:00', description: '0 seconds' },
            { seconds: 30, expected: '00:00', description: '30 seconds (rounds down)' },
            { seconds: 60, expected: '00:01', description: '1 minute' },
            { seconds: 90, expected: '00:01', description: '1 minute 30 seconds' },
            { seconds: 120, expected: '00:02', description: '2 minutes' },
            { seconds: 3600, expected: '01:00', description: '1 hour' },
            { seconds: 3660, expected: '01:01', description: '1 hour 1 minute' },
            { seconds: 7200, expected: '02:00', description: '2 hours' },
        ];
        
        for (const testCase of formatTestCases) {
            const formatted = agentManager.formatRuntime(testCase.seconds);
            logTestResult(`Runtime format: ${testCase.description}`, formatted === testCase.expected, 
                `Expected: ${testCase.expected}, Actual: ${formatted}`, 'runtimeCounter');
        }
        
        // Test 2.4: Runtime progression
        const runtime1 = agentManager.getAgentRuntime(agentId);
        await delay(3000); // Wait another 3 seconds
        const runtime2 = agentManager.getAgentRuntime(agentId);
        
        logTestResult('Runtime progression over time', runtime2 > runtime1, 
            `Runtime increased from ${runtime1}s to ${runtime2}s`, 'runtimeCounter');
        
        // Clean up
        await agentManager.terminateAgent(agentId);
        
    } catch (error) {
        logTestResult('Runtime counter accuracy test suite', false, 
            error.message, 'runtimeCounter');
    }
    
    await delay(2000);
}

// Test 3: Agent ID Uniqueness
async function testAgentIdUniqueness() {
    console.log('\n🔍 Testing Agent ID Uniqueness...');
    
    await cleanupAllAgents();
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        const agents = [];
        const agentIds = new Set();
        
        // Test 3.1: Sequential spawning
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(`Uniqueness test agent ${i + 1}`);
            agents.push(agent);
            agentIds.add(agent.id);
            await delay(100);
        }
        
        logTestResult('Agent ID uniqueness (sequential)', agentIds.size === agents.length, 
            `Generated ${agents.length} agents with ${agentIds.size} unique IDs`, 'agentIdUniqueness');
        
        // Test 3.2: ID format validation
        const idRegex = /^agent-\d+-[a-z0-9]+$/;
        let allValidFormat = true;
        
        for (const agent of agents) {
            if (!idRegex.test(agent.id)) {
                allValidFormat = false;
                break;
            }
        }
        
        logTestResult('Agent ID format validation', allValidFormat, 
            `All IDs match pattern: agent-timestamp-random`, 'agentIdUniqueness');
        
        // Test 3.3: Timestamp ordering
        const timestamps = agents.map(agent => {
            const parts = agent.id.split('-');
            return parseInt(parts[1]);
        });
        
        const isAscending = timestamps.every((val, i) => i === 0 || val >= timestamps[i - 1]);
        logTestResult('Agent ID timestamp ordering', isAscending, 
            `Timestamps are in ascending order`, 'agentIdUniqueness');
        
        // Clean up
        for (const agent of agents) {
            await agentManager.terminateAgent(agent.id);
        }
        
    } catch (error) {
        logTestResult('Agent ID uniqueness test suite', false, 
            error.message, 'agentIdUniqueness');
    }
    
    await delay(2000);
}

// Test 4: UI Display Formatting 
async function testUIDisplayFormatting() {
    console.log('\n🔍 Testing UI Display Formatting...');
    
    await cleanupAllAgents();
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Test 4.1: Spawn agents for display testing
        const agents = [];
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(`Display test agent ${i + 1}`);
            agents.push(agent);
            await delay(1000);
        }
        
        // Test 4.2: Agent status display data
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const statusDisplay = agentManager.getAgentStatusDisplay(agent.id);
            
            // Verify all required fields are present
            const requiredFields = ['id', 'status', 'runtime', 'spawnTime', 'lastActivity', 'pid'];
            let allFieldsPresent = true;
            
            for (const field of requiredFields) {
                if (!statusDisplay || statusDisplay[field] === undefined) {
                    allFieldsPresent = false;
                    break;
                }
            }
            
            logTestResult(`Agent ${i + 1} status display completeness`, allFieldsPresent, 
                `All required fields present: ${requiredFields.join(', ')}`, 'uiDisplay');
        }
        
        // Test 4.3: Runtime formatting consistency
        const runtimeFormats = agents.map(agent => {
            const runtime = agentManager.getAgentRuntime(agent.id);
            return agentManager.formatRuntime(runtime);
        });
        
        const formatRegex = /^\d{2}:\d{2}$/;
        const allValidFormats = runtimeFormats.every(format => formatRegex.test(format));
        
        logTestResult('Runtime format consistency', allValidFormats, 
            `All formats valid: ${runtimeFormats.join(', ')}`, 'uiDisplay');
        
        // Test 4.4: Agent list structure
        const activeAgents = agentManager.getActiveAgents();
        const isValidList = Array.isArray(activeAgents) && activeAgents.length === 3;
        
        logTestResult('Agent list structure', isValidList, 
            `Active agents list is valid array with ${activeAgents.length} entries`, 'uiDisplay');
        
        // Test 4.5: Agent ID padding requirements (18 characters as per UI)
        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];
            const paddedId = agent.id.padEnd(18);
            const isPaddingCorrect = paddedId.length === 18;
            
            logTestResult(`Agent ${i + 1} ID padding`, isPaddingCorrect, 
                `ID padded to 18 characters: ${paddedId.length}`, 'uiDisplay');
        }
        
        // Clean up
        for (const agent of agents) {
            await agentManager.terminateAgent(agent.id);
        }
        
    } catch (error) {
        logTestResult('UI display formatting test suite', false, 
            error.message, 'uiDisplay');
    }
    
    await delay(2000);
}

// Test 5: Agent Termination and Cleanup
async function testAgentTermination() {
    console.log('\n🔍 Testing Agent Termination and Cleanup...');
    
    await cleanupAllAgents();
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Test 5.1: Spawn agents for termination testing
        const agents = [];
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(`Termination test agent ${i + 1}`);
            agents.push(agent);
            await delay(500);
        }
        
        // Verify all agents are active
        let activeAgents = agentManager.getActiveAgents();
        logTestResult('All agents active before termination', activeAgents.length === 3, 
            `Active agents: ${activeAgents.length}`, 'agentTermination');
        
        // Test 5.2: Single agent termination
        const firstAgent = agents[0];
        await agentManager.terminateAgent(firstAgent.id);
        await delay(2000); // Wait for cleanup
        
        activeAgents = agentManager.getActiveAgents();
        logTestResult('Single agent termination', activeAgents.length === 2, 
            `Active agents after termination: ${activeAgents.length}`, 'agentTermination');
        
        // Test 5.3: Verify terminated agent is not in active list
        const terminatedAgentStillActive = activeAgents.some(agent => agent.id === firstAgent.id);
        logTestResult('Terminated agent removed from list', !terminatedAgentStillActive, 
            `Terminated agent still in active list: ${terminatedAgentStillActive}`, 'agentTermination');
        
        // Test 5.4: Multiple agent termination
        const remainingAgents = agents.slice(1);
        for (const agent of remainingAgents) {
            await agentManager.terminateAgent(agent.id);
            await delay(1000);
        }
        
        await delay(2000); // Wait for cleanup
        
        activeAgents = agentManager.getActiveAgents();
        logTestResult('All agents terminated', activeAgents.length === 0, 
            `Active agents after all terminations: ${activeAgents.length}`, 'agentTermination');
        
        // Test 5.5: Terminating non-existent agent
        try {
            await agentManager.terminateAgent('non-existent-agent-id');
            logTestResult('Non-existent agent termination handling', false, 
                'Should have thrown error for non-existent agent', 'agentTermination');
        } catch (error) {
            logTestResult('Non-existent agent termination handling', true, 
                'Correctly threw error for non-existent agent', 'agentTermination');
        }
        
    } catch (error) {
        logTestResult('Agent termination test suite', false, 
            error.message, 'agentTermination');
    }
    
    await delay(2000);
}

// Test 6: Performance Testing
async function testPerformance() {
    console.log('\n🔍 Testing Performance with Multiple Agents...');
    
    await cleanupAllAgents();
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Test 6.1: Spawn time performance
        const spawnStartTime = Date.now();
        const agents = [];
        
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(`Performance test agent ${i + 1}`);
            agents.push(agent);
        }
        
        const spawnEndTime = Date.now();
        const spawnTime = spawnEndTime - spawnStartTime;
        
        logTestResult('Agent spawning performance', spawnTime < 15000, 
            `Spawned 3 agents in ${spawnTime}ms`, 'performanceTesting');
        
        // Test 6.2: Status retrieval performance
        const statusStartTime = Date.now();
        for (let i = 0; i < 50; i++) {
            agentManager.getActiveAgents();
        }
        const statusEndTime = Date.now();
        const statusTime = statusEndTime - statusStartTime;
        
        logTestResult('Status retrieval performance', statusTime < 1000, 
            `50 status calls in ${statusTime}ms`, 'performanceTesting');
        
        // Test 6.3: Runtime calculation performance
        const runtimeStartTime = Date.now();
        for (let i = 0; i < 100; i++) {
            for (const agent of agents) {
                agentManager.getAgentRuntime(agent.id);
            }
        }
        const runtimeEndTime = Date.now();
        const runtimeTime = runtimeEndTime - runtimeStartTime;
        
        logTestResult('Runtime calculation performance', runtimeTime < 2000, 
            `300 runtime calculations in ${runtimeTime}ms`, 'performanceTesting');
        
        // Test 6.4: Memory usage (basic check)
        const memoryUsage = process.memoryUsage();
        const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
        
        logTestResult('Memory usage check', memoryMB < 200, 
            `Memory usage: ${memoryMB.toFixed(2)}MB`, 'performanceTesting');
        
        // Clean up
        for (const agent of agents) {
            await agentManager.terminateAgent(agent.id);
        }
        
    } catch (error) {
        logTestResult('Performance testing suite', false, 
            error.message, 'performanceTesting');
    }
    
    await delay(2000);
}

// Test 7: Edge Cases and Error Handling
async function testEdgeCases() {
    console.log('\n🔍 Testing Edge Cases and Error Handling...');
    
    await cleanupAllAgents();
    
    const agentManager = new AgentManager();
    await agentManager.initialize();
    
    try {
        // Test 7.1: Invalid instructions
        const invalidInstructions = [
            { value: '', name: 'empty string' },
            { value: 'Hi', name: 'too short' },
            { value: 'A'.repeat(6000), name: 'too long' },
            { value: 'Test with $(dangerous) chars', name: 'dangerous characters' },
            { value: null, name: 'null value' },
            { value: undefined, name: 'undefined value' },
        ];
        
        for (const testCase of invalidInstructions) {
            try {
                await agentManager.spawnAgent(testCase.value);
                logTestResult(`Invalid instructions: ${testCase.name}`, false, 
                    'Should have thrown error', 'edgeCases');
            } catch (error) {
                logTestResult(`Invalid instructions: ${testCase.name}`, true, 
                    'Correctly rejected invalid instructions', 'edgeCases');
            }
        }
        
        // Test 7.2: Rapid spawning and termination
        const rapidAgents = [];
        for (let i = 0; i < 3; i++) {
            const agent = await agentManager.spawnAgent(`Rapid test agent ${i + 1}`);
            rapidAgents.push(agent);
            await delay(100);
        }
        
        // Rapidly terminate all
        for (const agent of rapidAgents) {
            await agentManager.terminateAgent(agent.id);
            await delay(100);
        }
        
        await delay(2000);
        const remainingAgents = agentManager.getActiveAgents();
        logTestResult('Rapid spawn/terminate handling', remainingAgents.length === 0, 
            `Remaining agents: ${remainingAgents.length}`, 'edgeCases');
        
        // Test 7.3: Runtime calculation edge cases
        const edgeRuntimeTests = [
            { seconds: -1, description: 'negative seconds' },
            { seconds: 0, description: 'zero seconds' },
            { seconds: 86400, description: 'one day (24 hours)' },
        ];
        
        for (const testCase of edgeRuntimeTests) {
            try {
                const formatted = agentManager.formatRuntime(testCase.seconds);
                const isValidFormat = /^\d{2}:\d{2}$/.test(formatted);
                logTestResult(`Runtime format edge case: ${testCase.description}`, isValidFormat, 
                    `Format: ${formatted}`, 'edgeCases');
            } catch (error) {
                logTestResult(`Runtime format edge case: ${testCase.description}`, false, 
                    `Error: ${error.message}`, 'edgeCases');
            }
        }
        
    } catch (error) {
        logTestResult('Edge cases test suite', false, 
            error.message, 'edgeCases');
    }
    
    await delay(2000);
}

// Generate comprehensive test report
function generateTestReport() {
    testResults.endTime = new Date();
    const duration = testResults.endTime - testResults.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE QA TEST REPORT - MULTIPLE AGENT SPAWNING & RUNTIME COUNTER');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Overall Test Summary:`);
    console.log(`   Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`   Passed: ${testResults.passed} ✅`);
    console.log(`   Failed: ${testResults.failed} ❌`);
    console.log(`   Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    
    console.log(`\n📋 Test Categories Results:`);
    
    for (const [category, stats] of Object.entries(testResults.summary)) {
        if (stats.total > 0) {
            const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
            const status = stats.failed === 0 ? '✅' : '⚠️';
            console.log(`   ${status} ${category}: ${stats.passed}/${stats.total} passed (${successRate}%)`);
        }
    }
    
    // Critical functionality assessment
    console.log(`\n🔍 Critical Functionality Assessment:`);
    
    const criticalCategories = {
        'Agent Spawning': testResults.summary.multipleAgentSpawning,
        'Runtime Counter': testResults.summary.runtimeCounter,
        'Agent Termination': testResults.summary.agentTermination,
    };
    
    for (const [category, stats] of Object.entries(criticalCategories)) {
        const isHealthy = stats.failed === 0;
        const healthIcon = isHealthy ? '✅' : '🚨';
        console.log(`   ${healthIcon} ${category}: ${isHealthy ? 'HEALTHY' : 'ISSUES FOUND'}`);
    }
    
    // Performance assessment
    const perfStats = testResults.summary.performanceTesting;
    if (perfStats.total > 0) {
        const perfHealthy = perfStats.failed === 0;
        console.log(`   ${perfHealthy ? '✅' : '⚠️'} Performance: ${perfHealthy ? 'ACCEPTABLE' : 'CONCERNS'}`);
    }
    
    // Failed tests details
    const failedTests = testResults.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
        console.log(`\n🚨 Failed Tests Details:`);
        for (const test of failedTests) {
            console.log(`   • ${test.name} (${test.category})`);
            console.log(`     ${test.details}`);
        }
    }
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    if (testResults.summary.multipleAgentSpawning.failed > 0) {
        console.log(`   • Review agent spawning mechanism for reliability`);
    }
    
    if (testResults.summary.runtimeCounter.failed > 0) {
        console.log(`   • Verify runtime counter calculations and formatting`);
    }
    
    if (testResults.summary.agentTermination.failed > 0) {
        console.log(`   • Check agent cleanup and termination processes`);
    }
    
    if (testResults.summary.performanceTesting.failed > 0) {
        console.log(`   • Optimize performance for better responsiveness`);
    }
    
    if (testResults.summary.edgeCases.failed > 0) {
        console.log(`   • Strengthen error handling and input validation`);
    }
    
    console.log(`\n📄 Test Report Summary:`);
    console.log(`   • Multiple Agent Spawning: ${testResults.summary.multipleAgentSpawning.passed}/${testResults.summary.multipleAgentSpawning.total} ✅`);
    console.log(`   • Runtime Counter Accuracy: ${testResults.summary.runtimeCounter.passed}/${testResults.summary.runtimeCounter.total} ✅`);
    console.log(`   • Agent ID Uniqueness: ${testResults.summary.agentIdUniqueness.passed}/${testResults.summary.agentIdUniqueness.total} ✅`);
    console.log(`   • UI Display Formatting: ${testResults.summary.uiDisplay.passed}/${testResults.summary.uiDisplay.total} ✅`);
    console.log(`   • Agent Termination: ${testResults.summary.agentTermination.passed}/${testResults.summary.agentTermination.total} ✅`);
    console.log(`   • Performance Testing: ${testResults.summary.performanceTesting.passed}/${testResults.summary.performanceTesting.total} ✅`);
    console.log(`   • Edge Cases: ${testResults.summary.edgeCases.passed}/${testResults.summary.edgeCases.total} ✅`);
    
    console.log('\n' + '='.repeat(80));
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'qa-test-report-improved.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed JSON report saved to: ${reportPath}`);
    
    return testResults;
}

// Main test execution
async function runImprovedTests() {
    console.log('🚀 Starting Improved QA Testing...');
    console.log('Comprehensive testing of Multiple Agent Spawning and Runtime Counter Features\n');
    
    try {
        // Execute all test suites with proper cleanup
        await testMultipleAgentSpawning();
        await testRuntimeCounterAccuracy();
        await testAgentIdUniqueness();
        await testUIDisplayFormatting();
        await testAgentTermination();
        await testPerformance();
        await testEdgeCases();
        
        // Final cleanup
        await cleanupAllAgents();
        
        // Generate final report
        const results = generateTestReport();
        
        // Exit with appropriate code
        const exitCode = results.failed > 0 ? 1 : 0;
        
        if (exitCode === 0) {
            console.log('\n🎉 All tests completed successfully!');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the report above.');
        }
        
        process.exit(exitCode);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    runImprovedTests();
}

module.exports = {
    runImprovedTests,
    testResults,
};