import { TestRunner } from './framework/TestRunner';
import { frameworkValidationTestSuite } from './tests/framework-validation.test';
import { navigationTestSuite } from './tests/navigation.test';
import { agentManagementTestSuite } from './tests/agent-management.test';
import { uiStateTestSuite } from './tests/ui-state.test';

async function runAllUITests() {
  const runner = new TestRunner();
  const suites = [
    frameworkValidationTestSuite,
    navigationTestSuite,
    agentManagementTestSuite,
    uiStateTestSuite,
  ];

  console.log('🚀 Starting Napoleon UI Tests\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (const suite of suites) {
    try {
      await runner.runSuite(suite);
      // Count tests from suite
      totalPassed += suite.tests.length;
    } catch (error) {
      // Extract failed count from error message
      const match = error instanceof Error ? error.message.match(/(\d+) test\(s\) failed/) : null;
      if (match) {
        const failedCount = parseInt(match[1], 10);
        totalFailed += failedCount;
        totalPassed += suite.tests.length - failedCount;
      }
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;

  console.log('\n📈 Overall Summary:');
  console.log(`   Total Tests: ${totalPassed + totalFailed}`);
  console.log(`   Passed: ${totalPassed}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log(`   Total Duration: ${totalTime.toFixed(2)}s`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllUITests().catch((error) => {
    console.error('\n❌ UI Tests failed:', error);
    process.exit(1);
  });
}

export { runAllUITests };
