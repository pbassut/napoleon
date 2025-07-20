import { ProcessManager } from './ProcessManager';
import { InputSimulator } from './InputSimulator';
import { OutputParser } from './OutputParser';

export interface UITestContext {
  processManager: ProcessManager;
  inputSimulator: InputSimulator;
  outputParser: OutputParser;
  pid: number;
}

export type UITestFunction = (context: UITestContext) => Promise<void>;

export interface UITest {
  name: string;
  test: UITestFunction;
  timeout?: number;
}

export interface UITestSuite {
  name: string;
  tests: UITest[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

export class TestRunner {
  private processManager: ProcessManager;
  private inputSimulator: InputSimulator;
  private outputParser: OutputParser;
  private currentPid: number | null = null;

  constructor() {
    this.processManager = new ProcessManager();
    this.inputSimulator = new InputSimulator(this.processManager);
    this.outputParser = new OutputParser();
  }

  async runSuite(suite: UITestSuite): Promise<void> {
    console.log(`\n🧪 Running UI Test Suite: ${suite.name}\n`);
    
    let passedCount = 0;
    let failedCount = 0;
    const startTime = Date.now();

    try {
      if (suite.beforeAll) {
        await suite.beforeAll();
      }

      for (const test of suite.tests) {
        try {
          if (suite.beforeEach) {
            await suite.beforeEach();
          }

          // Spawn new Napoleon instance for each test
          this.currentPid = await this.processManager.spawnNapoleon();
          
          // Wait for UI to initialize
          await this.processManager.waitForOutput(this.currentPid, /Napoleon|Ready|›/, 5000);

          const context: UITestContext = {
            processManager: this.processManager,
            inputSimulator: this.inputSimulator,
            outputParser: this.outputParser,
            pid: this.currentPid
          };

          // Run the test with timeout
          const timeout = test.timeout || 30000;
          await this.runWithTimeout(test.test(context), timeout, test.name);
          
          console.log(`  ✅ ${test.name}`);
          passedCount++;

        } catch (error) {
          console.log(`  ❌ ${test.name}`);
          console.error(`     ${error instanceof Error ? error.message : error}`);
          failedCount++;
        } finally {
          // Clean up process
          if (this.currentPid) {
            await this.processManager.terminateProcess(this.currentPid);
            this.currentPid = null;
          }

          if (suite.afterEach) {
            await suite.afterEach();
          }
        }
      }

      if (suite.afterAll) {
        await suite.afterAll();
      }

    } finally {
      // Ensure all processes are cleaned up
      await this.processManager.cleanupAll();
    }

    const duration = Date.now() - startTime;
    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${passedCount}`);
    console.log(`   Failed: ${failedCount}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s\n`);

    if (failedCount > 0) {
      throw new Error(`${failedCount} test(s) failed`);
    }
  }

  async runTest(test: UITest): Promise<void> {
    await this.runSuite({
      name: 'Single Test',
      tests: [test]
    });
  }

  private async runWithTimeout<T>(
    promise: Promise<T>, 
    timeout: number, 
    testName: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Test "${testName}" timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }
}