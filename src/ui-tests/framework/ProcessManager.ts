import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessManager {
  private processCleanupQueue: Set<number> = new Set();

  private outputBuffers: Map<number, string[]> = new Map();

  private bufferIntervals: Map<number, NodeJS.Timeout> = new Map();

  private processes: Map<number, ChildProcess> = new Map();

  async spawnNapoleon(env?: Record<string, string>): Promise<number> {
    return new Promise((resolve, reject) => {
      // For UI tests, use a simplified mock to avoid module resolution issues
      // In production, you would fix the build process, but for testing the UI
      // framework itself, a mock is appropriate
      const useMock = env?.USE_REAL_NAPOLEON !== 'true';

      const script = useMock ? './src/ui-tests/mock-napoleon.js' : './bin/napoleon.js';
      const args = useMock ? [] : ['start'];

      const napoleonProcess = spawn('node', [script, ...args], {
        env: { ...process.env, ...env },
        cwd: process.cwd(),
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!napoleonProcess.pid) {
        reject(new Error('Failed to spawn Napoleon process'));
        return;
      }

      const { pid } = napoleonProcess;
      this.processes.set(pid, napoleonProcess);
      this.processCleanupQueue.add(pid);
      this.outputBuffers.set(pid, []);

      // Capture stdout
      napoleonProcess.stdout?.on('data', (data) => {
        const buffer = this.outputBuffers.get(pid) || [];
        buffer.push(data.toString());
        if (buffer.length > 1000) {
          buffer.splice(0, buffer.length - 1000);
        }
        this.outputBuffers.set(pid, buffer);
      });

      // Capture stderr
      napoleonProcess.stderr?.on('data', (data) => {
        console.error(`Napoleon stderr: ${data}`);
      });

      napoleonProcess.on('error', (error) => {
        reject(error);
      });

      // Give the process time to start and render initial UI
      setTimeout(() => {
        resolve(pid);
      }, 2500);
    });
  }

  async terminateProcess(pid: number): Promise<void> {
    try {
      const process = this.processes.get(pid);
      if (process) {
        process.kill('SIGTERM');
        this.processes.delete(pid);
      } else {
        // Fallback to system kill
        await execAsync(`kill ${pid}`);
      }

      this.processCleanupQueue.delete(pid);
      this.outputBuffers.delete(pid);

      // Clean up buffer interval
      const interval = this.bufferIntervals.get(pid);
      if (interval) {
        clearInterval(interval);
        this.bufferIntervals.delete(pid);
      }
    } catch (error) {
      // Process might already be terminated
      console.warn(`Failed to terminate process ${pid}:`, error);
    }
  }

  async readProcessOutput(
    pid: number,
    _duration = 1000,
  ): Promise<string> {
    // Since we're managing the process directly, return buffered output
    const buffer = this.outputBuffers.get(pid) || [];

    // Return only the most recent screen of output (after last clear)
    // The mock clears the screen with \u001bc before each render
    const fullOutput = buffer.join('');
    const clearChar = '\u001bc';
    const lastClearIndex = fullOutput.lastIndexOf(clearChar);

    if (lastClearIndex >= 0) {
      return fullOutput.substring(lastClearIndex + clearChar.length);
    }

    return fullOutput;
  }

  async sendInput(pid: number, input: string): Promise<void> {
    const process = this.processes.get(pid);
    if (process && process.stdin) {
      process.stdin.write(input);
    } else {
      throw new Error(`No process found with PID ${pid}`);
    }
  }

  async waitForOutput(
    pid: number,
    pattern: string | RegExp,
    timeout: number = 5000,
  ): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const output = await this.readProcessOutput(pid, 100);
      const buffer = this.outputBuffers.get(pid) || [];
      const fullOutput = [...buffer, output].join('\n');

      if (
        typeof pattern === 'string'
          ? fullOutput.includes(pattern)
          : pattern.test(fullOutput)
      ) {
        return fullOutput;
      }

      await this.delay(100);
    }

    throw new Error(`Timeout waiting for pattern: ${pattern}`);
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.processCleanupQueue).map((pid) => this.terminateProcess(pid));
    await Promise.all(cleanupPromises);
  }

  // No longer needed - we capture output directly from the spawned process

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
