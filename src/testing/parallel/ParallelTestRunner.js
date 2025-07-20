/**
 * Main Test Runner for Parallel UI Testing
 * Orchestrates the complete testing workflow
 */

const { ParallelUITester } = require('./ParallelUITester');
const { InputMultiplexer } = require('./InputMultiplexer');
const { OutputComparator } = require('./OutputComparator');
const { RegressionDetector } = require('./RegressionDetector');
const { TestScenario, commonScenarios } = require('./TestScenario');
const fs = require('fs').promises;
const path = require('path');

class ParallelTestRunner {
  constructor(options = {}) {
    this.options = {
      reportDir: options.reportDir || './test/reports',
      baselineDir: options.baselineDir || './test/baselines',
      knownDifferencesFile: options.knownDifferencesFile || './test/known-differences.json',
      saveReports: options.saveReports !== false,
      verbose: options.verbose || false,
      ...options
    };
    
    this.results = [];
    this.startTime = null;
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario, options = {}) {
    const testId = `${scenario.name}-${Date.now()}`;
    console.log(`\n🧪 Running scenario: ${scenario.name}`);
    
    const tester = new ParallelUITester({
      ...this.options,
      ...options
    });
    
    const inputMultiplexer = new InputMultiplexer();
    const outputComparator = new OutputComparator({
      ignoreTimingDifferences: true,
      timingTolerance: 200
    });
    
    const regressionDetector = new RegressionDetector({
      baselineDir: this.options.baselineDir,
      knownDifferencesFile: this.options.knownDifferencesFile
    });
    
    let result = {
      testId,
      scenario: scenario.name,
      description: scenario.description,
      startTime: Date.now(),
      success: false
    };
    
    try {
      // Start processes
      await tester.startProcesses();
      
      // Setup input multiplexing
      inputMultiplexer.addProcess(tester.blessedProcess, 'blessed');
      inputMultiplexer.addProcess(tester.inkProcess, 'ink');
      
      // Capture output
      tester.on('blessed-output', (frame) => {
        outputComparator.captureFrame('blessed', frame);
      });
      
      tester.on('ink-output', (frame) => {
        outputComparator.captureFrame('ink', frame);
      });
      
      // Execute scenario
      const testResult = await scenario.execute(tester, inputMultiplexer);
      result.testResult = testResult;
      
      // Compare outputs
      const comparison = outputComparator.compare();
      result.comparison = comparison;
      
      // Check for regression
      const regression = await regressionDetector.checkRegression(
        scenario,
        testResult,
        comparison
      );
      result.regression = regression;
      
      // Determine overall success
      result.success = testResult.success && 
                      comparison.matchPercentage >= 85 &&
                      !regression.isRegression;
      
      // Generate summary
      result.summary = this.generateScenarioSummary(result);
      
      // Log results
      this.logScenarioResult(result);
      
    } catch (error) {
      result.error = {
        message: error.message,
        stack: error.stack
      };
      console.error(`❌ Scenario failed with error: ${error.message}`);
    } finally {
      // Cleanup
      await tester.stopProcesses();
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
    }
    
    // Save results if enabled
    if (this.options.saveReports) {
      await this.saveScenarioReport(result);
    }
    
    this.results.push(result);
    return result;
  }

  /**
   * Run multiple scenarios
   */
  async runScenarios(scenarios, options = {}) {
    this.startTime = Date.now();
    const results = [];
    
    console.log(`\n🚀 Running ${scenarios.length} test scenarios...`);
    
    for (const scenario of scenarios) {
      try {
        const result = await this.runScenario(scenario, options);
        results.push(result);
        
        // Stop on critical failure if requested
        if (options.stopOnFailure && !result.success) {
          console.log('\n⛔ Stopping due to test failure');
          break;
        }
      } catch (error) {
        console.error(`Failed to run scenario ${scenario.name}:`, error);
        if (options.stopOnFailure) break;
      }
    }
    
    // Generate overall report
    const report = await this.generateReport(results);
    
    return report;
  }

  /**
   * Run all common scenarios
   */
  async runCommonScenarios(options = {}) {
    const scenarios = [
      commonScenarios.basicNavigation(),
      commonScenarios.spawnAgent('test-migration-agent'),
      commonScenarios.rapidInput(),
      commonScenarios.terminalResize(),
      commonScenarios.errorHandling()
    ];
    
    return this.runScenarios(scenarios, options);
  }

  /**
   * Generate scenario summary
   */
  generateScenarioSummary(result) {
    const summary = {
      status: result.success ? '✅ PASS' : '❌ FAIL',
      matchPercentage: result.comparison?.matchPercentage?.toFixed(2) + '%' || 'N/A',
      regression: result.regression?.isRegression ? '⚠️ REGRESSION' : '✅ OK',
      duration: `${(result.duration / 1000).toFixed(2)}s`
    };
    
    if (!result.success) {
      if (result.error) {
        summary.failureReason = 'Test execution error';
      } else if (result.testResult && !result.testResult.success) {
        summary.failureReason = 'Scenario validation failed';
      } else if (result.comparison && result.comparison.matchPercentage < 85) {
        summary.failureReason = 'Low UI similarity';
      } else if (result.regression?.isRegression) {
        summary.failureReason = 'Regression detected';
      }
    }
    
    return summary;
  }

  /**
   * Log scenario result
   */
  logScenarioResult(result) {
    console.log(`\n📊 Results for: ${result.scenario}`);
    console.log(`   Status: ${result.summary.status}`);
    console.log(`   UI Match: ${result.summary.matchPercentage}`);
    console.log(`   Regression: ${result.summary.regression}`);
    console.log(`   Duration: ${result.summary.duration}`);
    
    if (!result.success && result.summary.failureReason) {
      console.log(`   ⚠️  Failure: ${result.summary.failureReason}`);
    }
    
    if (result.regression?.recommendation) {
      console.log(`   💡 ${result.regression.recommendation.message}`);
    }
  }

  /**
   * Generate overall test report
   */
  async generateReport(results) {
    const totalDuration = Date.now() - this.startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        total: results.length,
        passed,
        failed,
        passRate: `${((passed / results.length) * 100).toFixed(1)}%`
      },
      scenarios: results.map(r => ({
        name: r.scenario,
        ...r.summary,
        details: {
          testSuccess: r.testResult?.success,
          matchPercentage: r.comparison?.matchPercentage,
          regressionDetected: r.regression?.isRegression,
          duration: r.duration
        }
      })),
      overallRecommendation: this.generateOverallRecommendation(results)
    };
    
    // Save report if enabled
    if (this.options.saveReports) {
      await this.saveReport(report);
    }
    
    // Print summary
    this.printReportSummary(report);
    
    return report;
  }

  /**
   * Generate overall recommendation
   */
  generateOverallRecommendation(results) {
    const passRate = results.filter(r => r.success).length / results.length;
    const avgMatch = results
      .filter(r => r.comparison?.matchPercentage)
      .reduce((sum, r) => sum + r.comparison.matchPercentage, 0) / results.length;
    
    const regressions = results.filter(r => r.regression?.isRegression).length;
    
    if (passRate === 1 && avgMatch >= 95 && regressions === 0) {
      return {
        status: 'excellent',
        message: '🎉 All tests passed with excellent UI compatibility',
        action: 'Safe to proceed with migration'
      };
    } else if (passRate >= 0.8 && avgMatch >= 85 && regressions <= 1) {
      return {
        status: 'good',
        message: '👍 Most tests passed with good compatibility',
        action: 'Review failed tests and minor issues before migration'
      };
    } else if (passRate >= 0.6 && avgMatch >= 70) {
      return {
        status: 'fair',
        message: '⚠️ Significant compatibility issues detected',
        action: 'Address major issues before considering migration'
      };
    } else {
      return {
        status: 'poor',
        message: '❌ Critical compatibility problems found',
        action: 'Major rework needed before migration is viable'
      };
    }
  }

  /**
   * Print report summary
   */
  printReportSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PARALLEL UI TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log(`\nSummary:`);
    console.log(`  Total Scenarios: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed} ✅`);
    console.log(`  Failed: ${report.summary.failed} ❌`);
    console.log(`  Pass Rate: ${report.summary.passRate}`);
    console.log(`\nRecommendation:`);
    console.log(`  ${report.overallRecommendation.message}`);
    console.log(`  Action: ${report.overallRecommendation.action}`);
    console.log('='.repeat(60));
  }

  /**
   * Save scenario report
   */
  async saveScenarioReport(result) {
    await fs.mkdir(this.options.reportDir, { recursive: true });
    
    const filename = `${result.testId}.json`;
    const filepath = path.join(this.options.reportDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
  }

  /**
   * Save overall report
   */
  async saveReport(report) {
    await fs.mkdir(this.options.reportDir, { recursive: true });
    
    const filename = `parallel-test-report-${Date.now()}.json`;
    const filepath = path.join(this.options.reportDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    // Also save as latest
    const latestPath = path.join(this.options.reportDir, 'latest-report.json');
    await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📁 Report saved to: ${filepath}`);
  }
}

module.exports = { ParallelTestRunner };