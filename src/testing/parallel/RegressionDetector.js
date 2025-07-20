/**
 * Regression Detection System for Parallel UI Testing
 * Identifies regressions by comparing current results with baselines
 */

const fs = require('fs').promises;
const path = require('path');

class RegressionDetector {
  constructor(options = {}) {
    this.options = {
      baselineDir: options.baselineDir || './test/baselines',
      threshold: options.threshold || 0.95, // 95% similarity required
      knownDifferencesFile: options.knownDifferencesFile || './test/known-differences.json',
      ...options
    };
    
    this.baselines = new Map();
    this.knownDifferences = new Map();
    this.loadPromise = this.loadBaselines();
  }

  /**
   * Load baselines from disk
   */
  async loadBaselines() {
    try {
      // Ensure baseline directory exists
      await fs.mkdir(this.options.baselineDir, { recursive: true });
      
      // Load all baseline files
      const files = await fs.readdir(this.options.baselineDir);
      const baselineFiles = files.filter(f => f.endsWith('.baseline.json'));
      
      for (const file of baselineFiles) {
        const content = await fs.readFile(
          path.join(this.options.baselineDir, file),
          'utf8'
        );
        const baseline = JSON.parse(content);
        this.baselines.set(baseline.scenarioName, baseline);
      }
      
      // Load known differences
      await this.loadKnownDifferences();
      
    } catch (error) {
      console.warn('Failed to load baselines:', error.message);
    }
  }

  /**
   * Load known differences configuration
   */
  async loadKnownDifferences() {
    try {
      const content = await fs.readFile(this.options.knownDifferencesFile, 'utf8');
      const differences = JSON.parse(content);
      
      for (const [key, value] of Object.entries(differences)) {
        this.knownDifferences.set(key, value);
      }
    } catch (error) {
      // File might not exist, which is fine
      if (error.code !== 'ENOENT') {
        console.warn('Failed to load known differences:', error.message);
      }
    }
  }

  /**
   * Check for regression
   */
  async checkRegression(scenario, testResult, comparisonResult) {
    await this.loadPromise; // Ensure baselines are loaded
    
    const baseline = this.baselines.get(scenario.name);
    
    if (!baseline) {
      // No baseline exists, create one
      return await this.createBaseline(scenario, testResult, comparisonResult);
    }
    
    // Compare with baseline
    const regression = await this.compareWithBaseline(
      scenario,
      testResult,
      comparisonResult,
      baseline
    );
    
    return regression;
  }

  /**
   * Create a new baseline
   */
  async createBaseline(scenario, testResult, comparisonResult) {
    const baseline = {
      scenarioName: scenario.name,
      description: scenario.description,
      createdAt: new Date().toISOString(),
      testResult: this.extractBaselineData(testResult),
      comparisonResult: this.extractComparisonData(comparisonResult),
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    // Save baseline
    const filename = `${scenario.name.replace(/\s+/g, '-').toLowerCase()}.baseline.json`;
    await fs.writeFile(
      path.join(this.options.baselineDir, filename),
      JSON.stringify(baseline, null, 2)
    );
    
    this.baselines.set(scenario.name, baseline);
    
    return {
      isRegression: false,
      isNewBaseline: true,
      message: 'New baseline created',
      baseline
    };
  }

  /**
   * Compare current results with baseline
   */
  async compareWithBaseline(scenario, testResult, comparisonResult, baseline) {
    const regressions = [];
    const improvements = [];
    
    // Compare test execution
    const execRegression = this.compareTestExecution(
      testResult,
      baseline.testResult
    );
    if (execRegression) regressions.push(execRegression);
    
    // Compare UI output similarity
    const outputRegression = this.compareOutputSimilarity(
      comparisonResult,
      baseline.comparisonResult
    );
    if (outputRegression) regressions.push(outputRegression);
    
    // Check for improvements
    if (comparisonResult.matchPercentage > baseline.comparisonResult.matchPercentage) {
      improvements.push({
        type: 'similarity-improved',
        previous: baseline.comparisonResult.matchPercentage,
        current: comparisonResult.matchPercentage,
        improvement: comparisonResult.matchPercentage - baseline.comparisonResult.matchPercentage
      });
    }
    
    // Calculate confidence
    const confidence = this.calculateConfidence(
      testResult,
      comparisonResult,
      baseline
    );
    
    // Determine if this is a regression
    const isRegression = regressions.length > 0 && 
                        !this.areKnownDifferences(regressions);
    
    return {
      isRegression,
      regressions,
      improvements,
      confidence,
      baseline: {
        createdAt: baseline.createdAt,
        matchPercentage: baseline.comparisonResult.matchPercentage
      },
      current: {
        matchPercentage: comparisonResult.matchPercentage
      },
      recommendation: this.generateRecommendation(
        isRegression,
        regressions,
        improvements,
        confidence
      )
    };
  }

  /**
   * Compare test execution results
   */
  compareTestExecution(current, baseline) {
    // Check if test still passes
    if (current.success && !baseline.success) {
      return null; // Improvement, not regression
    }
    
    if (!current.success && baseline.success) {
      return {
        type: 'test-failure',
        message: 'Test now failing when it previously passed',
        severity: 'high'
      };
    }
    
    // Check execution time (allow 20% variance)
    const timeVariance = Math.abs(current.duration - baseline.duration) / baseline.duration;
    if (timeVariance > 0.2) {
      return {
        type: 'performance-regression',
        message: `Execution time changed by ${(timeVariance * 100).toFixed(1)}%`,
        baseline: baseline.duration,
        current: current.duration,
        severity: current.duration > baseline.duration ? 'medium' : 'low'
      };
    }
    
    return null;
  }

  /**
   * Compare output similarity
   */
  compareOutputSimilarity(current, baseline) {
    const threshold = this.options.threshold * 100; // Convert to percentage
    
    if (current.matchPercentage < threshold && baseline.matchPercentage >= threshold) {
      return {
        type: 'similarity-regression',
        message: `UI similarity dropped below ${threshold}% threshold`,
        baseline: baseline.matchPercentage,
        current: current.matchPercentage,
        severity: 'high'
      };
    }
    
    // Check for increase in critical differences
    if (current.summary && baseline.summary) {
      const criticalIncrease = (current.summary.criticalIssues?.length || 0) - 
                              (baseline.summary.criticalIssues?.length || 0);
      
      if (criticalIncrease > 0) {
        return {
          type: 'critical-issues-increase',
          message: `${criticalIncrease} new critical issues detected`,
          baseline: baseline.summary.criticalIssues?.length || 0,
          current: current.summary.criticalIssues?.length || 0,
          severity: 'high'
        };
      }
    }
    
    return null;
  }

  /**
   * Check if regressions are known/accepted differences
   */
  areKnownDifferences(regressions) {
    for (const regression of regressions) {
      const known = this.knownDifferences.get(regression.type);
      if (!known || !known.accepted) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculate confidence in results
   */
  calculateConfidence(testResult, comparisonResult, baseline) {
    let confidence = 1.0;
    
    // Test success affects confidence
    if (!testResult.success) {
      confidence *= 0.5;
    }
    
    // Match percentage affects confidence
    confidence *= comparisonResult.matchPercentage / 100;
    
    // Baseline age affects confidence (older baselines = lower confidence)
    const baselineAge = Date.now() - new Date(baseline.createdAt).getTime();
    const daysOld = baselineAge / (1000 * 60 * 60 * 24);
    if (daysOld > 30) {
      confidence *= 0.9; // 10% reduction for baselines older than 30 days
    }
    
    return confidence;
  }

  /**
   * Generate recommendation based on regression analysis
   */
  generateRecommendation(isRegression, regressions, improvements, confidence) {
    if (!isRegression && improvements.length > 0) {
      return {
        status: 'improved',
        message: 'UI compatibility has improved since baseline',
        action: 'Consider updating baseline to capture improvements'
      };
    }
    
    if (!isRegression && confidence > 0.9) {
      return {
        status: 'pass',
        message: 'No regressions detected, high confidence in results',
        action: 'Safe to proceed'
      };
    }
    
    if (isRegression) {
      const highSeverity = regressions.some(r => r.severity === 'high');
      
      if (highSeverity) {
        return {
          status: 'fail',
          message: 'Critical regressions detected',
          action: 'Fix regressions before proceeding with migration',
          details: regressions.filter(r => r.severity === 'high')
        };
      } else {
        return {
          status: 'warning',
          message: 'Minor regressions detected',
          action: 'Review regressions and determine if they are acceptable',
          details: regressions
        };
      }
    }
    
    return {
      status: 'uncertain',
      message: `Low confidence in results (${(confidence * 100).toFixed(1)}%)`,
      action: 'Review results manually or re-run tests'
    };
  }

  /**
   * Extract baseline data from test result
   */
  extractBaselineData(testResult) {
    return {
      success: testResult.success,
      duration: testResult.duration,
      stepCount: testResult.steps?.length || 0,
      errorCount: testResult.errors?.length || 0
    };
  }

  /**
   * Extract comparison data for baseline
   */
  extractComparisonData(comparisonResult) {
    return {
      matchPercentage: comparisonResult.matchPercentage,
      totalFrames: comparisonResult.totalFrames,
      differences: comparisonResult.differences,
      summary: comparisonResult.summary
    };
  }

  /**
   * Update baseline with current results
   */
  async updateBaseline(scenarioName, testResult, comparisonResult) {
    const baseline = this.baselines.get(scenarioName);
    if (!baseline) {
      throw new Error(`No baseline found for scenario: ${scenarioName}`);
    }
    
    baseline.updatedAt = new Date().toISOString();
    baseline.testResult = this.extractBaselineData(testResult);
    baseline.comparisonResult = this.extractComparisonData(comparisonResult);
    
    // Save updated baseline
    const filename = `${scenarioName.replace(/\s+/g, '-').toLowerCase()}.baseline.json`;
    await fs.writeFile(
      path.join(this.options.baselineDir, filename),
      JSON.stringify(baseline, null, 2)
    );
    
    return baseline;
  }

  /**
   * Get all baselines
   */
  getBaselines() {
    return Array.from(this.baselines.values());
  }

  /**
   * Delete a baseline
   */
  async deleteBaseline(scenarioName) {
    const filename = `${scenarioName.replace(/\s+/g, '-').toLowerCase()}.baseline.json`;
    
    try {
      await fs.unlink(path.join(this.options.baselineDir, filename));
      this.baselines.delete(scenarioName);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = { RegressionDetector };