/**
 * Parallel UI Testing Framework
 * Runs both Blessed and Ink UIs simultaneously for comparison testing
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class ParallelUITester extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      blessedEntry: options.blessedEntry || 'src/index.js',
      inkEntry: options.inkEntry || 'src/ui/ink/index.js',
      timeout: options.timeout || 30000,
      captureOutput: options.captureOutput !== false,
      env: options.env || {},
      ...options
    };
    
    this.blessedProcess = null;
    this.inkProcess = null;
    this.blessedOutput = [];
    this.inkOutput = [];
    this.isRunning = false;
    this.startTime = null;
  }

  /**
   * Start both UI processes
   */
  async startProcesses() {
    if (this.isRunning) {
      throw new Error('Processes already running');
    }

    this.startTime = Date.now();
    this.isRunning = true;
    
    // Start Blessed UI
    this.blessedProcess = await this.startProcess('blessed', this.options.blessedEntry);
    
    // Start Ink UI  
    this.inkProcess = await this.startProcess('ink', this.options.inkEntry);
    
    // Wait for both processes to initialize
    await this.waitForInitialization();
    
    this.emit('processes-started', {
      blessed: this.blessedProcess.pid,
      ink: this.inkProcess.pid
    });
  }

  /**
   * Start a single UI process
   */
  async startProcess(type, entryPoint) {
    const env = {
      ...process.env,
      ...this.options.env,
      NAPOLEON_UI_MODE: type,
      NAPOLEON_TEST_MODE: 'true',
      FORCE_COLOR: '1',
      NODE_ENV: 'test'
    };

    const proc = spawn('node', [entryPoint], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    // Capture output
    if (this.options.captureOutput) {
      const output = type === 'blessed' ? this.blessedOutput : this.inkOutput;
      
      proc.stdout.on('data', (data) => {
        const frame = {
          type: 'stdout',
          data: data.toString(),
          timestamp: Date.now() - this.startTime
        };
        output.push(frame);
        this.emit(`${type}-output`, frame);
      });

      proc.stderr.on('data', (data) => {
        const frame = {
          type: 'stderr',
          data: data.toString(),
          timestamp: Date.now() - this.startTime
        };
        output.push(frame);
        this.emit(`${type}-error`, frame);
      });
    }

    // Handle process exit
    proc.on('exit', (code, signal) => {
      this.emit(`${type}-exit`, { code, signal });
      if (this.isRunning) {
        this.handleProcessExit(type, code, signal);
      }
    });

    proc.on('error', (error) => {
      this.emit(`${type}-error`, { error });
    });

    return proc;
  }

  /**
   * Wait for both processes to initialize
   */
  async waitForInitialization() {
    const timeout = this.options.initTimeout || 5000;
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        // Check if both processes are ready
        // This could be enhanced to wait for specific initialization markers
        if (this.blessedProcess && this.inkProcess && 
            !this.blessedProcess.killed && !this.inkProcess.killed) {
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
   * Send input to both processes
   */
  async sendInput(input) {
    if (!this.isRunning) {
      throw new Error('Processes not running');
    }

    const inputData = this.normalizeInput(input);
    
    // Send to both processes
    const promises = [
      this.sendToProcess(this.blessedProcess, inputData),
      this.sendToProcess(this.inkProcess, inputData)
    ];
    
    await Promise.all(promises);
    
    // Wait for processing
    if (input.waitAfter) {
      await this.delay(input.waitAfter);
    }
  }

  /**
   * Send input to a specific process
   */
  async sendToProcess(proc, input) {
    return new Promise((resolve, reject) => {
      if (!proc || proc.killed) {
        reject(new Error('Process not available'));
        return;
      }

      try {
        proc.stdin.write(input.data, (err) => {
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
      if (input.meta) data = '\x1b' + data;
    } else if (input.text) {
      data = input.text;
    }

    return { data, ...input };
  }

  /**
   * Stop both processes
   */
  async stopProcesses() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    const promises = [];
    
    if (this.blessedProcess && !this.blessedProcess.killed) {
      promises.push(this.terminateProcess(this.blessedProcess, 'blessed'));
    }
    
    if (this.inkProcess && !this.inkProcess.killed) {
      promises.push(this.terminateProcess(this.inkProcess, 'ink'));
    }
    
    await Promise.all(promises);
    
    this.emit('processes-stopped');
  }

  /**
   * Terminate a single process
   */
  async terminateProcess(proc, type) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      proc.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Try graceful shutdown first
      proc.stdin.end();
      proc.kill('SIGTERM');
    });
  }

  /**
   * Handle unexpected process exit
   */
  handleProcessExit(type, code, signal) {
    console.warn(`${type} process exited unexpectedly:`, { code, signal });
    
    // Stop all processes if one exits unexpectedly
    this.stopProcesses().catch(console.error);
  }

  /**
   * Get captured output
   */
  getOutput() {
    return {
      blessed: [...this.blessedOutput],
      ink: [...this.inkOutput]
    };
  }

  /**
   * Clear captured output
   */
  clearOutput() {
    this.blessedOutput = [];
    this.inkOutput = [];
  }

  /**
   * Wait for stability (no output for specified time)
   */
  async waitForStability(timeout = 1000) {
    const startTime = Date.now();
    let lastOutputTime = Date.now();
    
    // Track output from both processes
    const outputHandler = () => {
      lastOutputTime = Date.now();
    };
    
    this.on('blessed-output', outputHandler);
    this.on('ink-output', outputHandler);
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const now = Date.now();
        
        if (now - lastOutputTime >= timeout) {
          clearInterval(checkInterval);
          this.removeListener('blessed-output', outputHandler);
          this.removeListener('ink-output', outputHandler);
          resolve();
        }
        
        // Overall timeout to prevent hanging
        if (now - startTime > timeout * 10) {
          clearInterval(checkInterval);
          this.removeListener('blessed-output', outputHandler);
          this.removeListener('ink-output', outputHandler);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        blessedEntry: this.options.blessedEntry,
        inkEntry: this.options.inkEntry,
        env: this.options.env
      }
    };
    
    await fs.writeFile(filename, JSON.stringify(results, null, 2));
  }
}

module.exports = { ParallelUITester };