/**
 * Ink UI Testing Framework
 * Tests the Ink-based UI for functionality and performance
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs').promises;

class InkUITester extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      entryPoint: options.entryPoint || 'bin/napoleon.js',
      timeout: options.timeout || 30000,
      captureOutput: options.captureOutput !== false,
      env: options.env || {},
      ...options,
    };

    this.process = null;
    this.output = [];
    this.isRunning = false;
    this.startTime = null;
  }

  /**
   * Start the UI process
   */
  async startProcess() {
    if (this.isRunning) {
      throw new Error('Process already running');
    }

    this.startTime = Date.now();
    this.isRunning = true;

    // Start Napoleon UI
    this.process = await this.startNapoleonProcess();

    // Wait for initialization
    await this.waitForInitialization();

    this.emit('process-started', {
      pid: this.process.pid,
    });
  }

  /**
   * Start Napoleon UI process
   */
  async startNapoleonProcess() {
    const env = {
      ...process.env,
      ...this.options.env,
      NAPOLEON_UI_MODE: 'ink',
      NAPOLEON_TEST_MODE: 'true',
      FORCE_COLOR: '1',
      NODE_ENV: 'test',
    };

    const proc = spawn('node', [this.options.entryPoint, 'start'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    // Capture output
    if (this.options.captureOutput) {
      proc.stdout.on('data', (data) => {
        const frame = {
          type: 'stdout',
          data: data.toString(),
          timestamp: Date.now() - this.startTime,
        };
        this.output.push(frame);
        this.emit('output', frame);
      });

      proc.stderr.on('data', (data) => {
        const frame = {
          type: 'stderr',
          data: data.toString(),
          timestamp: Date.now() - this.startTime,
        };
        this.output.push(frame);
        this.emit('error-output', frame);
      });
    }

    // Handle process exit
    proc.on('exit', (code, signal) => {
      this.emit('process-exit', { code, signal });
      if (this.isRunning) {
        this.handleProcessExit(code, signal);
      }
    });

    proc.on('error', (error) => {
      this.emit('process-error', { error });
    });

    return proc;
  }

  /**
   * Wait for process initialization
   */
  async waitForInitialization() {
    const timeout = this.options.initTimeout || 5000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // Check if process is ready
        if (this.process && !this.process.killed) {
          clearInterval(checkInterval);
          resolve();
        }

        // Timeout check
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Process initialization timeout'));
        }
      }, 100);
    });
  }

  /**
   * Send input to the process
   */
  async sendInput(input) {
    if (!this.isRunning) {
      throw new Error('Process not running');
    }

    const inputData = this.normalizeInput(input);

    await this.sendToProcess(inputData);

    // Wait for processing
    if (input.waitAfter) {
      await this.delay(input.waitAfter);
    }
  }

  /**
   * Send input to process
   */
  async sendToProcess(input) {
    return new Promise((resolve, reject) => {
      if (!this.process || this.process.killed) {
        reject(new Error('Process not available'));
        return;
      }

      try {
        this.process.stdin.write(input.data, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Normalize input data
   */
  normalizeInput(input) {
    if (typeof input === 'string') {
      return { data: input };
    }

    let data = '';

    if (input.key) {
      // Handle special keys
      switch (input.key) {
        case 'up': data = '\x1b[A'; break;
        case 'down': data = '\x1b[B'; break;
        case 'left': data = '\x1b[D'; break;
        case 'right': data = '\x1b[C'; break;
        case 'enter': data = '\r'; break;
        case 'escape': data = '\x1b'; break;
        case 'tab': data = '\t'; break;
        case 'backspace': data = '\x7f'; break;
        default: data = input.key;
      }

      // Add modifiers
      if (input.ctrl) data = String.fromCharCode(data.charCodeAt(0) - 64);
      if (input.meta) data = `\x1b${data}`;
    } else if (input.text) {
      data = input.text;
    }

    return { data, ...input };
  }

  /**
   * Stop the process
   */
  async stopProcess() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.process && !this.process.killed) {
      await this.terminateProcess();
    }

    this.emit('process-stopped');
  }

  /**
   * Terminate the process
   */
  async terminateProcess() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!this.process.killed) {
          this.process.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      this.process.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Try graceful shutdown first
      this.process.stdin.end();
      this.process.kill('SIGTERM');
    });
  }

  /**
   * Handle unexpected process exit
   */
  handleProcessExit(code, signal) {
    console.warn('UI process exited unexpectedly:', { code, signal });
    this.stopProcess().catch(console.error);
  }

  /**
   * Get captured output
   */
  getOutput() {
    return [...this.output];
  }

  /**
   * Clear captured output
   */
  clearOutput() {
    this.output = [];
  }

  /**
   * Wait for stability (no output for specified time)
   */
  async waitForStability(timeout = 1000) {
    const startTime = Date.now();
    let lastOutputTime = Date.now();

    // Track output
    const outputHandler = () => {
      lastOutputTime = Date.now();
    };

    this.on('output', outputHandler);

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const now = Date.now();

        if (now - lastOutputTime >= timeout) {
          clearInterval(checkInterval);
          this.removeListener('output', outputHandler);
          resolve();
        }

        // Overall timeout to prevent hanging
        if (now - startTime > timeout * 10) {
          clearInterval(checkInterval);
          this.removeListener('output', outputHandler);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Save test results
   */
  async saveResults(filename) {
    const results = {
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      output: this.getOutput(),
      metadata: {
        entryPoint: this.options.entryPoint,
        env: this.options.env,
      },
    };

    await fs.writeFile(filename, JSON.stringify(results, null, 2));
  }
}

module.exports = { InkUITester };
