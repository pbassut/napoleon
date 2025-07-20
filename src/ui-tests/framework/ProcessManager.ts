import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessManager {
  private processCleanupQueue: Set<number> = new Set();
  private outputBuffers: Map<number, string[]> = new Map();
  private bufferIntervals: Map<number, NodeJS.Timeout> = new Map();

  async spawnNapoleon(env?: Record<string, string>): Promise<number> {
    const envString = env ? Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ') : '';
    const command = `${envString} npm run start`;
    
    const { stdout } = await execAsync(`desktop-commander start_process "${command}"`);
    const pid = parseInt(stdout.trim(), 10);
    
    if (isNaN(pid)) {
      throw new Error(`Failed to parse PID from output: ${stdout}`);
    }
    
    this.processCleanupQueue.add(pid);
    this.outputBuffers.set(pid, []);
    
    // Start continuous output buffering
    this.startOutputBuffering(pid);
    
    return pid;
  }

  async terminateProcess(pid: number): Promise<void> {
    try {
      await execAsync(`desktop-commander terminate_process ${pid}`);
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

  async readProcessOutput(pid: number, duration: number = 1000): Promise<string> {
    const { stdout } = await execAsync(`desktop-commander read_process_output ${pid} ${duration}`);
    return stdout;
  }

  async sendInput(pid: number, input: string): Promise<void> {
    await execAsync(`desktop-commander interact_with_process ${pid} "${input}"`);
  }

  async waitForOutput(pid: number, pattern: string | RegExp, timeout: number = 5000): Promise<string> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const output = await this.readProcessOutput(pid, 100);
      const buffer = this.outputBuffers.get(pid) || [];
      const fullOutput = [...buffer, output].join('\n');
      
      if (typeof pattern === 'string' ? fullOutput.includes(pattern) : pattern.test(fullOutput)) {
        return fullOutput;
      }
      
      await this.delay(100);
    }
    
    throw new Error(`Timeout waiting for pattern: ${pattern}`);
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.processCleanupQueue).map(pid => 
      this.terminateProcess(pid)
    );
    await Promise.all(cleanupPromises);
  }

  private async startOutputBuffering(pid: number): Promise<void> {
    const bufferInterval = setInterval(async () => {
      try {
        const output = await this.readProcessOutput(pid, 100);
        if (output) {
          const buffer = this.outputBuffers.get(pid) || [];
          buffer.push(output);
          
          // Keep buffer size manageable
          if (buffer.length > 1000) {
            buffer.splice(0, buffer.length - 1000);
          }
          
          this.outputBuffers.set(pid, buffer);
        }
      } catch (error) {
        // Process might be terminated
        clearInterval(bufferInterval);
        this.bufferIntervals.delete(pid);
      }
    }, 100);
    
    // Store interval for cleanup
    this.bufferIntervals.set(pid, bufferInterval);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}