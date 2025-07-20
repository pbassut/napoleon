#!/usr/bin/env node

/**
 * Parallel UI Testing Script
 * Runs both Blessed and Ink UIs side-by-side for comparison
 */

const { ParallelTestRunner } = require('./src/testing/parallel/ParallelTestRunner');
const { TestScenarioBuilder, commonScenarios } = require('./src/testing/parallel/TestScenario');

async function runParallelTests() {
  console.log('🔬 Napoleon Parallel UI Testing Framework');
  console.log('========================================\n');
  
  const runner = new ParallelTestRunner({
    verbose: true,
    saveReports: true,
    reportDir: './test/reports/parallel',
    baselineDir: './test/baselines',
    // Override with test-specific entry points if needed
    blessedEntry: 'src/index.js',
    inkEntry: 'src/ui/ink/index.js'
  });

  // Define custom test scenarios
  const customScenarios = [
    // Test 1: Basic UI rendering
    new TestScenarioBuilder('UI Initialization')
      .description('Test that both UIs start and render correctly')
      .wait(2000) // Wait for UIs to fully initialize
      .validate(async (tester) => {
        const output = tester.getOutput();
        const hasBlessed = output.blessed.length > 0;
        const hasInk = output.ink.length > 0;
        
        return {
          success: hasBlessed && hasInk,
          message: `Blessed output: ${hasBlessed}, Ink output: ${hasInk}`
        };
      })
      .build(),

    // Test 2: Navigation consistency
    new TestScenarioBuilder('Navigation Consistency')
      .description('Test that navigation behaves identically in both UIs')
      .pressKey('j', { waitAfter: 200 }) // Navigate down
      .pressKey('j', { waitAfter: 200 })
      .pressKey('k', { waitAfter: 200 }) // Navigate up
      .pressKey('enter', { waitAfter: 500 }) // Select
      .pressKey('escape', { waitAfter: 200 }) // Go back
      .build(),

    // Test 3: Agent spawn workflow
    new TestScenarioBuilder('Agent Spawn Workflow')
      .description('Test complete agent spawn workflow')
      .pressKey('n', { waitAfter: 300 }) // Open spawn dialog
      .typeText('parallel-test-agent', { waitAfter: 200 })
      .pressKey('enter', { ctrl: true, waitAfter: 1000 }) // Submit
      .expectOutput('parallel-test-agent')
      .build(),

    // Test 4: Stress test with rapid input
    new TestScenarioBuilder('Rapid Input Stress Test')
      .description('Test UI responsiveness under rapid input')
      .navigate('down', 10)
      .navigate('up', 10)
      .navigate('down', 5)
      .validate(async (tester) => {
        const output = tester.getOutput();
        // Check that neither UI crashed or became unresponsive
        const recentBlessed = output.blessed.filter(
          f => f.timestamp > Date.now() - 2000
        );
        const recentInk = output.ink.filter(
          f => f.timestamp > Date.now() - 2000
        );
        
        return {
          success: recentBlessed.length > 0 && recentInk.length > 0,
          message: 'Both UIs remained responsive during rapid input'
        };
      })
      .build(),

    // Test 5: Error state handling
    new TestScenarioBuilder('Error State Handling')
      .description('Test how both UIs handle error states')
      .pressKey('n', { waitAfter: 300 })
      .typeText('error-test-agent', { waitAfter: 200 })
      .pressKey('enter', { ctrl: true, waitAfter: 1000 })
      // Simulate an error condition (this would need to be implemented)
      .wait(2000)
      .build()
  ];

  // Run tests based on command line arguments
  const args = process.argv.slice(2);
  const testMode = args[0] || 'all';

  try {
    let report;

    switch (testMode) {
      case 'common':
        console.log('Running common test scenarios...\n');
        report = await runner.runCommonScenarios();
        break;

      case 'custom':
        console.log('Running custom test scenarios...\n');
        report = await runner.runScenarios(customScenarios);
        break;

      case 'single':
        const scenarioName = args[1];
        if (!scenarioName) {
          console.error('Please specify a scenario name for single mode');
          process.exit(1);
        }
        
        const scenario = [...Object.values(commonScenarios).map(s => s()), ...customScenarios]
          .find(s => s.name.toLowerCase().includes(scenarioName.toLowerCase()));
        
        if (!scenario) {
          console.error(`Scenario not found: ${scenarioName}`);
          process.exit(1);
        }
        
        console.log(`Running single scenario: ${scenario.name}\n`);
        const result = await runner.runScenario(scenario);
        report = await runner.generateReport([result]);
        break;

      case 'quick':
        console.log('Running quick smoke test...\n');
        const quickScenarios = [
          commonScenarios.basicNavigation(),
          customScenarios[0] // UI Initialization
        ];
        report = await runner.runScenarios(quickScenarios);
        break;

      default: // 'all'
        console.log('Running all test scenarios...\n');
        const allScenarios = [
          ...Object.values(commonScenarios).map(s => s()),
          ...customScenarios
        ];
        report = await runner.runScenarios(allScenarios);
    }

    // Exit with appropriate code
    const exitCode = report.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(130);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error);
  process.exit(1);
});

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node test-parallel-ui.js [mode] [options]

Modes:
  all      Run all test scenarios (default)
  common   Run only common/standard scenarios
  custom   Run only custom scenarios
  single   Run a single scenario by name
  quick    Run a quick smoke test

Examples:
  node test-parallel-ui.js                    # Run all tests
  node test-parallel-ui.js common             # Run common tests
  node test-parallel-ui.js single navigation  # Run navigation test
  node test-parallel-ui.js quick              # Quick smoke test

Options:
  --help, -h   Show this help message
`);
  process.exit(0);
}

// Run the tests
runParallelTests().catch(console.error);