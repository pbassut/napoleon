# US056: Parallel UI Testing

## Epic
**Epic 7: Blessed to Ink Migration**

## Story
As a Napoleon developer,
I want to run both Blessed and Ink UIs in parallel for comprehensive testing,
so that I can ensure the migration doesn't introduce any regressions before the final cutover.

## Description
This story implements a parallel testing framework that allows running both the Blessed and Ink UIs simultaneously for side-by-side comparison. This includes creating a test harness that can send identical inputs to both UIs, capture their outputs, and compare behaviors. The framework will help identify subtle differences in behavior, performance issues, and edge cases that might not be caught through regular testing. This parallel testing phase is crucial for building confidence in the migration before fully switching over.

## Priority
**MEDIUM** - Critical for migration confidence but not blocking user functionality.

## Acceptance Criteria

### AC1: Parallel Execution Framework
- Run both UIs simultaneously in separate processes
- Synchronize inputs between both UIs
- Capture outputs from both implementations
- Handle process lifecycle management
- Support different testing modes

### AC2: Input Synchronization
- Send identical keyboard inputs to both UIs
- Synchronize timing of inputs
- Handle multi-step workflows
- Support scripted test sequences
- Record input streams for replay

### AC3: Output Comparison
- Capture terminal output from both UIs
- Compare visual output for differences
- Identify behavioral discrepancies
- Generate comparison reports
- Flag unexpected differences

### AC4: Test Scenario Coverage
- Create comprehensive test scenarios
- Cover all major user workflows
- Test edge cases and error conditions
- Include performance stress tests
- Document test coverage

### AC5: Regression Detection
- Automatically detect regressions
- Generate detailed difference reports
- Support visual diff viewing
- Track known differences
- Provide confidence metrics

## Tasks/Subtasks

- [ ] Build parallel execution framework (AC1)
  - [ ] Create process manager for dual UI execution
  - [ ] Implement IPC for coordination
  - [ ] Handle process lifecycle events
  - [ ] Add error recovery mechanisms
  - [ ] Support different OS environments

- [ ] Implement input synchronization (AC2)
  - [ ] Create input multiplexer
  - [ ] Build timing synchronization
  - [ ] Implement test script parser
  - [ ] Add input recording/replay
  - [ ] Handle special key sequences

- [ ] Develop output comparison (AC3)
  - [ ] Capture terminal buffers
  - [ ] Implement diff algorithms
  - [ ] Create visual comparison tools
  - [ ] Build report generator
  - [ ] Add filtering for known differences

- [ ] Create test scenarios (AC4)
  - [ ] Define core workflow tests
  - [ ] Add edge case scenarios
  - [ ] Create stress test suites
  - [ ] Build regression test library
  - [ ] Document test procedures

- [ ] Setup regression detection (AC5)
  - [ ] Implement automatic comparison
  - [ ] Create difference categorization
  - [ ] Build confidence scoring
  - [ ] Add baseline management
  - [ ] Generate test reports

## Dev Notes

### Parallel Testing Architecture

```typescript
class ParallelUITester {
  private blessedProcess: ChildProcess;
  private inkProcess: ChildProcess;
  private inputMultiplexer: InputMultiplexer;
  private outputComparator: OutputComparator;
  
  async runTest(scenario: TestScenario): Promise<TestResult> {
    // Start both UIs
    await this.startProcesses();
    
    // Execute test scenario
    for (const step of scenario.steps) {
      await this.inputMultiplexer.send(step);
      await this.waitForStability();
    }
    
    // Compare outputs
    return this.outputComparator.compare();
  }
}
```

### Input Synchronization

```typescript
class InputMultiplexer {
  constructor(
    private processes: ChildProcess[]
  ) {}
  
  async send(input: TestInput): Promise<void> {
    const promises = this.processes.map(proc => 
      this.sendToProcess(proc, input)
    );
    
    // Ensure synchronized delivery
    await Promise.all(promises);
    
    // Wait for processing
    await this.delay(input.waitAfter || 100);
  }
  
  private sendToProcess(proc: ChildProcess, input: TestInput) {
    if (input.key) {
      proc.stdin.write(input.key);
    } else if (input.text) {
      proc.stdin.write(input.text);
    }
  }
}
```

### Output Capture and Comparison

```typescript
interface OutputFrame {
  timestamp: number;
  content: string;
  cursor: { x: number; y: number };
}

class OutputComparator {
  private blessedFrames: OutputFrame[] = [];
  private inkFrames: OutputFrame[] = [];
  
  captureFrame(ui: 'blessed' | 'ink', frame: OutputFrame) {
    if (ui === 'blessed') {
      this.blessedFrames.push(frame);
    } else {
      this.inkFrames.push(frame);
    }
  }
  
  compare(): ComparisonResult {
    const differences: Difference[] = [];
    
    for (let i = 0; i < Math.max(this.blessedFrames.length, this.inkFrames.length); i++) {
      const blessed = this.blessedFrames[i];
      const ink = this.inkFrames[i];
      
      if (!this.framesMatch(blessed, ink)) {
        differences.push({
          frameIndex: i,
          blessed,
          ink,
          type: this.categorizeDifference(blessed, ink)
        });
      }
    }
    
    return {
      totalFrames: Math.max(this.blessedFrames.length, this.inkFrames.length),
      differences,
      matchPercentage: (1 - differences.length / this.blessedFrames.length) * 100
    };
  }
}
```

### Test Scenario Definition

```typescript
interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
  expectedOutcome: string;
  knownDifferences?: string[];
}

const scenarios: TestScenario[] = [
  {
    name: 'Basic Agent Spawn',
    description: 'Test spawning a new agent',
    steps: [
      { key: 'n', waitAfter: 200 },
      { text: 'Test agent for feature-x', waitAfter: 100 },
      { key: '\r', ctrl: true, waitAfter: 1000 }
    ],
    expectedOutcome: 'New agent appears in list'
  },
  {
    name: 'Rapid Navigation',
    description: 'Test fast keyboard navigation',
    steps: [
      { key: 'j', repeat: 10, waitAfter: 50 },
      { key: 'k', repeat: 10, waitAfter: 50 }
    ],
    expectedOutcome: 'Smooth scrolling without lag'
  }
];
```

### Regression Detection

```typescript
class RegressionDetector {
  private baseline: Map<string, TestResult> = new Map();
  
  async checkRegression(scenario: TestScenario, result: TestResult): Promise<RegressionReport> {
    const baselineResult = this.baseline.get(scenario.name);
    
    if (!baselineResult) {
      // First run, establish baseline
      this.baseline.set(scenario.name, result);
      return { isRegression: false, isNewTest: true };
    }
    
    // Compare with baseline
    const regressions = this.findRegressions(baselineResult, result);
    
    return {
      isRegression: regressions.length > 0,
      regressions,
      confidence: this.calculateConfidence(result)
    };
  }
  
  private calculateConfidence(result: TestResult): number {
    // Higher match percentage = higher confidence
    const matchScore = result.matchPercentage / 100;
    
    // Penalize for critical differences
    const criticalPenalty = result.differences
      .filter(d => d.type === 'critical')
      .length * 0.1;
    
    return Math.max(0, matchScore - criticalPenalty);
  }
}
```

### Known Differences Management

```typescript
const knownDifferences = {
  'animation-timing': {
    description: 'Ink animations use React render cycles',
    severity: 'low',
    accepted: true
  },
  'scroll-physics': {
    description: 'Slightly different scroll acceleration',
    severity: 'medium',
    accepted: false // Needs fixing
  }
};
```

## Status
**Approved**

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-20 | 1.0 | Initial story creation | Scrum Master Bob |
| 2025-07-20 | 1.1 | Story approved | Scrum Master Bob |

## Dev Agent Record

_To be completed by Dev Agent during implementation_

### Agent Model Used
_[Model name]_

### Debug Log References
_[Links to debug logs]_

### Completion Notes
_[Implementation notes]_

### Files List
_[Files created/modified during implementation]_

## QA Results

_To be completed by QA Agent after implementation_