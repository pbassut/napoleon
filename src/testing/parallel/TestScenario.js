/**
 * Test Scenario Framework for Parallel UI Testing
 * Defines and executes test scenarios for comparing UIs
 */

const { EventEmitter } = require('events');

class TestScenario extends EventEmitter {
  constructor(config) {
    super();
    
    this.name = config.name;
    this.description = config.description;
    this.steps = config.steps || [];
    this.expectedOutcome = config.expectedOutcome;
    this.knownDifferences = config.knownDifferences || [];
    this.timeout = config.timeout || 30000;
    this.setup = config.setup || null;
    this.teardown = config.teardown || null;
    this.validation = config.validation || null;
  }

  /**
   * Execute the test scenario
   */
  async execute(tester, inputMultiplexer) {
    const startTime = Date.now();
    const results = {
      scenario: this.name,
      startTime,
      steps: [],
      errors: [],
      success: false
    };
    
    try {
      // Run setup if provided
      if (this.setup) {
        await this.setup(tester);
      }
      
      // Execute each step
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];
        const stepResult = await this.executeStep(step, i, inputMultiplexer);
        results.steps.push(stepResult);
        
        if (!stepResult.success) {
          throw new Error(`Step ${i + 1} failed: ${stepResult.error}`);
        }
      }
      
      // Wait for stability
      await tester.waitForStability();
      
      // Run validation if provided
      if (this.validation) {
        const validationResult = await this.validation(tester);
        results.validation = validationResult;
        results.success = validationResult.success;
      } else {
        results.success = true;
      }
      
    } catch (error) {
      results.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now() - startTime
      });
      results.success = false;
    } finally {
      // Run teardown if provided
      if (this.teardown) {
        try {
          await this.teardown(tester);
        } catch (error) {
          results.errors.push({
            phase: 'teardown',
            message: error.message
          });
        }
      }
    }
    
    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * Execute a single step
   */
  async executeStep(step, index, inputMultiplexer) {
    const stepStart = Date.now();
    const result = {
      index,
      description: step.description || `Step ${index + 1}`,
      success: false,
      duration: 0
    };
    
    try {
      this.emit('step-start', { step, index });
      
      // Handle different step types
      if (step.input) {
        await this.executeInput(step.input, inputMultiplexer);
      } else if (step.key) {
        await this.executeKeyPress(step, inputMultiplexer);
      } else if (step.text) {
        await this.executeTextInput(step, inputMultiplexer);
      } else if (step.wait) {
        await this.delay(step.wait);
      } else if (step.action) {
        await step.action();
      }
      
      result.success = true;
      
    } catch (error) {
      result.error = error.message;
      result.success = false;
    }
    
    result.duration = Date.now() - stepStart;
    this.emit('step-complete', result);
    
    return result;
  }

  /**
   * Execute input step
   */
  async executeInput(input, inputMultiplexer) {
    if (Array.isArray(input)) {
      for (const inp of input) {
        await inputMultiplexer.send(inp);
      }
    } else {
      await inputMultiplexer.send(input);
    }
  }

  /**
   * Execute key press step
   */
  async executeKeyPress(step, inputMultiplexer) {
    const input = {
      key: step.key,
      ctrl: step.ctrl || false,
      meta: step.meta || false,
      shift: step.shift || false,
      waitAfter: step.waitAfter || 100
    };
    
    if (step.repeat) {
      for (let i = 0; i < step.repeat; i++) {
        await inputMultiplexer.send(input);
      }
    } else {
      await inputMultiplexer.send(input);
    }
  }

  /**
   * Execute text input step
   */
  async executeTextInput(step, inputMultiplexer) {
    const input = {
      text: step.text,
      waitAfter: step.waitAfter || 100
    };
    
    await inputMultiplexer.send(input);
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Test Scenario Builder
 * Provides fluent API for building test scenarios
 */
class TestScenarioBuilder {
  constructor(name) {
    this.scenario = {
      name,
      steps: []
    };
  }

  description(desc) {
    this.scenario.description = desc;
    return this;
  }

  setup(fn) {
    this.scenario.setup = fn;
    return this;
  }

  teardown(fn) {
    this.scenario.teardown = fn;
    return this;
  }

  timeout(ms) {
    this.scenario.timeout = ms;
    return this;
  }

  // Step builders
  pressKey(key, options = {}) {
    this.scenario.steps.push({
      key,
      ...options,
      description: options.description || `Press ${key}`
    });
    return this;
  }

  typeText(text, options = {}) {
    this.scenario.steps.push({
      text,
      ...options,
      description: options.description || `Type "${text}"`
    });
    return this;
  }

  wait(ms, description) {
    this.scenario.steps.push({
      wait: ms,
      description: description || `Wait ${ms}ms`
    });
    return this;
  }

  navigate(direction, count = 1) {
    const key = {
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right'
    }[direction];
    
    this.scenario.steps.push({
      key,
      repeat: count,
      description: `Navigate ${direction} ${count} times`
    });
    return this;
  }

  enter() {
    return this.pressKey('enter', { description: 'Press Enter' });
  }

  escape() {
    return this.pressKey('escape', { description: 'Press Escape' });
  }

  tab(count = 1) {
    this.scenario.steps.push({
      key: 'tab',
      repeat: count,
      description: `Press Tab ${count} times`
    });
    return this;
  }

  // Validation
  validate(fn) {
    this.scenario.validation = fn;
    return this;
  }

  expectOutput(pattern) {
    this.scenario.validation = async (tester) => {
      const output = tester.getOutput();
      const combined = [...output.blessed, ...output.ink]
        .map(frame => frame.content)
        .join('\n');
      
      const matches = pattern.test ? pattern.test(combined) : combined.includes(pattern);
      
      return {
        success: matches,
        message: matches ? 'Output matches expected pattern' : 'Output does not match expected pattern'
      };
    };
    return this;
  }

  // Build the scenario
  build() {
    return new TestScenario(this.scenario);
  }
}

/**
 * Pre-defined test scenarios
 */
const commonScenarios = {
  // Basic navigation test
  basicNavigation: () => new TestScenarioBuilder('Basic Navigation')
    .description('Test basic keyboard navigation in agent list')
    .navigate('down', 3)
    .navigate('up', 2)
    .navigate('down', 1)
    .enter()
    .wait(500)
    .escape()
    .build(),

  // Agent spawn test
  spawnAgent: (agentName) => new TestScenarioBuilder('Spawn Agent')
    .description(`Spawn a new agent named "${agentName}"`)
    .pressKey('n')
    .wait(200)
    .typeText(agentName)
    .wait(100)
    .enter()
    .wait(1000)
    .expectOutput(agentName)
    .build(),

  // Rapid input test
  rapidInput: () => new TestScenarioBuilder('Rapid Input')
    .description('Test UI responsiveness with rapid input')
    .setup(async (tester) => {
      // Ensure we have multiple agents for scrolling
      const spawner = commonScenarios.spawnAgent('test-agent-1');
      await spawner.execute(tester);
    })
    .navigate('down', 20)
    .navigate('up', 20)
    .navigate('down', 10)
    .build(),

  // Terminal resize test
  terminalResize: () => new TestScenarioBuilder('Terminal Resize')
    .description('Test UI adaptation to terminal resize')
    .wait(500)
    .pressKey('r', { ctrl: true }) // Refresh
    .wait(500)
    .build(),

  // Error handling test
  errorHandling: () => new TestScenarioBuilder('Error Handling')
    .description('Test error state handling')
    .pressKey('n')
    .wait(200)
    .typeText('test-agent-error')
    .enter()
    .wait(500)
    .pressKey('e', { meta: true }) // Simulate error
    .wait(1000)
    .expectOutput(/error/i)
    .build()
};

module.exports = { 
  TestScenario, 
  TestScenarioBuilder,
  commonScenarios
};