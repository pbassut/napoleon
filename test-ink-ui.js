#!/usr/bin/env node

/**
 * Ink UI Testing Script
 * Tests the Ink-based UI for functionality and performance
 */

const { InkUITester } = require('./src/testing/ui/InkUITester');

/**
 * Simple test scenario builder for Ink UI testing
 */
class SimpleTestScenario {
  constructor(name) {
    this.name = name;
    this.description = '';
    this.steps = [];
  }

  setDescription(desc) {
    this.description = desc;
    return this;
  }

  wait(ms) {
    this.steps.push({ type: 'wait', duration: ms });
    return this;
  }

  pressKey(key, options = {}) {
    this.steps.push({ type: 'key', key, ...options });
    return this;
  }

  navigate(direction, count = 1) {
    for (let i = 0; i < count; i++) {
      this.steps.push({ type: 'key', key: direction, waitAfter: 50 });
    }
    return this;
  }

  validate(validatorFn) {
    this.steps.push({ type: 'validate', validator: validatorFn });
    return this;
  }

  async execute(tester) {
    try {
      for (const step of this.steps) {
        switch (step.type) {
          case 'wait':
            await new Promise(resolve => setTimeout(resolve, step.duration));
            break;
          case 'key':
            await tester.sendInput({ key: step.key, waitAfter: step.waitAfter });
            break;
          case 'validate':
            const result = await step.validator(tester);
            if (!result.success) {
              return { success: false, errors: [{ message: result.message }] };
            }
            break;
        }
      }
      return { success: true };
    } catch (error) {
      return { success: false, errors: [{ message: error.message }] };
    }
  }
}

async function runInkUITests() {
  console.log('🎨 Napoleon Ink UI Testing Framework');
  console.log('==================================\n');

  const tester = new InkUITester({
    timeout: 30000,
    captureOutput: true,
  });

  // Define test scenarios for Ink UI
  const scenarios = [
    // Test 1: Basic UI startup
    new SimpleTestScenario('UI Startup')
      .setDescription('Test that the UI starts successfully')
      .wait(3000) // Wait for UI to fully initialize
      .validate(async (tester) => {
        const output = tester.getOutput();
        const hasOutput = output.length > 0;
        const noErrors = !output.some((o) => o.type === 'stderr' && o.data.includes('Error'));

        return {
          success: hasOutput && noErrors,
          message: `Output frames: ${output.length}, Errors: ${!noErrors}`,
        };
      }),

    // Test 2: Basic navigation
    new SimpleTestScenario('Basic Navigation')
      .setDescription('Test basic keyboard navigation')
      .wait(2000)
      .pressKey('j', { waitAfter: 200 }) // Navigate down
      .pressKey('j', { waitAfter: 200 })
      .pressKey('k', { waitAfter: 200 }) // Navigate up
      .wait(500),

    // Test 3: UI responsiveness
    new SimpleTestScenario('UI Responsiveness')
      .setDescription('Test UI responsiveness with rapid input')
      .wait(2000)
      .navigate('down', 5)
      .navigate('up', 5)
      .navigate('down', 3)
      .wait(500)
      .validate(async (tester) => {
        const output = tester.getOutput();
        const recentOutput = output.filter(
          (f) => f.timestamp > Date.now() - 3000,
        );

        return {
          success: recentOutput.length > 0,
          message: 'UI remained responsive during rapid input',
        };
      }),

    // Test 4: Help system
    new SimpleTestScenario('Help System')
      .setDescription('Test help functionality')
      .wait(2000)
      .pressKey('?', { waitAfter: 1000 }) // Open help
      .pressKey('escape', { waitAfter: 500 }), // Close help

    // Test 5: Quit functionality
    new SimpleTestScenario('Quit Functionality')
      .setDescription('Test clean exit')
      .wait(2000)
      .pressKey('q', { waitAfter: 1000 }), // Quit
  ];

  const results = [];
  let passed = 0;
  let failed = 0;

  console.log(`Running ${scenarios.length} test scenarios...\n`);

  for (const scenario of scenarios) {
    console.log(`🧪 Testing: ${scenario.name}`);

    try {
      // Start the UI process
      await tester.startProcess();

      // Execute the scenario
      const result = await scenario.execute(tester);

      if (result.success) {
        console.log('   ✅ PASSED');
        passed++;
      } else {
        console.log(`   ❌ FAILED: ${result.errors?.[0]?.message || 'Unknown error'}`);
        failed++;
      }

      results.push({
        scenario: scenario.name,
        ...result,
      });
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      failed++;
      results.push({
        scenario: scenario.name,
        success: false,
        error: error.message,
      });
    } finally {
      // Clean up
      await tester.stopProcess();
      tester.clearOutput();
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Generate report
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${scenarios.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / scenarios.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Ink UI is working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the issues above.`);
  }

  console.log('='.repeat(50));

  // Save detailed results
  const reportPath = `./test/reports/ink-ui-test-${Date.now()}.json`;
  try {
    await require('fs').promises.mkdir('./test/reports', { recursive: true });
    await require('fs').promises.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total: scenarios.length, passed, failed },
      results,
    }, null, 2));
    console.log(`\n📁 Detailed report saved to: ${reportPath}`);
  } catch (error) {
    console.warn('Could not save report:', error.message);
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
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
Usage: node test-ink-ui.js

Tests the Ink-based UI for functionality and performance.

Examples:
  node test-ink-ui.js                # Run all UI tests

Options:
  --help, -h   Show this help message
`);
  process.exit(0);
}

// Run the tests
runInkUITests().catch(console.error);
