/**
 * Tests for UI Test Framework ProcessManager
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

// Mock dependencies first
const mockExecAsync = jest.fn();
const mockExec = jest.fn();
const mockSpawn = jest.fn();

jest.mock('child_process', () => ({
  spawn: mockSpawn,
  exec: mockExec,
}));

jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync),
}));

// Import after mocks
import { ProcessManager } from '../../../src/ui-tests/framework/ProcessManager';

describe('ProcessManager', () => {
  let processManager: ProcessManager;
  let mockProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create comprehensive mock process
    mockProcess = {
      pid: 12345,
      killed: false,
      stdout: {
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      },
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
      },
      on: jest.fn(),
      kill: jest.fn(),
    };

    mockSpawn.mockReturnValue(mockProcess);
    processManager = new ProcessManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with empty collections', () => {
      expect((processManager as any).processCleanupQueue.size).toBe(0);
      expect((processManager as any).outputBuffers.size).toBe(0);
      expect((processManager as any).bufferIntervals.size).toBe(0);
      expect((processManager as any).processes.size).toBe(0);
    });
  });

  describe('spawnNapoleon', () => {
    it('should spawn Napoleon process with default configuration', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500); // Wait for initialization timeout
      
      const pid = await spawnPromise;
      
      expect(pid).toBe(12345);
      expect(mockSpawn).toHaveBeenCalledWith('node', ['./src/ui-tests/mock-napoleon.js'], {
        env: expect.objectContaining({
          ...process.env,
        }),
        cwd: process.cwd(),
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should use real Napoleon when USE_REAL_NAPOLEON is true', async () => {
      const env = { USE_REAL_NAPOLEON: 'true' };
      const spawnPromise = processManager.spawnNapoleon(env);
      
      jest.advanceTimersByTime(2500);
      
      await spawnPromise;
      
      expect(mockSpawn).toHaveBeenCalledWith('node', ['./bin/napoleon.js', 'start'], {
        env: expect.objectContaining({
          ...process.env,
          USE_REAL_NAPOLEON: 'true',
        }),
        cwd: process.cwd(),
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should use mock Napoleon by default', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      await spawnPromise;
      
      expect(mockSpawn).toHaveBeenCalledWith('node', ['./src/ui-tests/mock-napoleon.js'], {
        env: expect.objectContaining(process.env),
        cwd: process.cwd(),
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should pass custom environment variables', async () => {
      const customEnv = { CUSTOM_VAR: 'value', TEST_MODE: 'true' };
      const spawnPromise = processManager.spawnNapoleon(customEnv);
      
      jest.advanceTimersByTime(2500);
      
      await spawnPromise;
      
      expect(mockSpawn).toHaveBeenCalledWith('node', ['./src/ui-tests/mock-napoleon.js'], {
        env: expect.objectContaining({
          ...process.env,
          CUSTOM_VAR: 'value',
          TEST_MODE: 'true',
        }),
        cwd: process.cwd(),
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    it('should reject if process fails to spawn', async () => {
      mockProcess.pid = undefined;
      
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      await expect(spawnPromise).rejects.toThrow('Failed to spawn Napoleon process');
    });

    it('should handle spawn rejection', async () => {
      const spawnError = new Error('Spawn failed');
      
      const spawnPromise = processManager.spawnNapoleon();
      
      // Simulate error event
      const errorHandler = mockProcess.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(spawnError);
      
      await expect(spawnPromise).rejects.toThrow('Spawn failed');
    });

    it('should setup output capture for stdout', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      await spawnPromise;
      
      expect(mockProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      
      // Test stdout handler
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('test output'));
      
      const buffer = (processManager as any).outputBuffers.get(12345);
      expect(buffer).toEqual(['test output']);
    });

    it('should setup output capture for stderr', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      await spawnPromise;
      
      expect(mockProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      
      // Test stderr handler
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const stderrHandler = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];
      stderrHandler(Buffer.from('error output'));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Napoleon stderr: error output');
      consoleErrorSpy.mockRestore();
    });

    it('should limit output buffer size to 1000 entries', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      const pid = await spawnPromise;
      
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      
      // Add 1005 entries to exceed limit
      for (let i = 0; i < 1005; i++) {
        stdoutHandler(Buffer.from(`output ${i}`));
      }
      
      const buffer = (processManager as any).outputBuffers.get(pid);
      expect(buffer.length).toBe(1000);
      expect(buffer[0]).toBe('output 5'); // First 5 should be removed
      expect(buffer[999]).toBe('output 1004'); // Last entry
    });

    it('should store process in internal collections', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      const pid = await spawnPromise;
      
      expect((processManager as any).processes.get(pid)).toBe(mockProcess);
      expect((processManager as any).processCleanupQueue.has(pid)).toBe(true);
      expect((processManager as any).outputBuffers.has(pid)).toBe(true);
    });
  });

  describe('terminateProcess', () => {
    let pid: number;

    beforeEach(async () => {
      const spawnPromise = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      pid = await spawnPromise;
    });

    it('should terminate process using stored process reference', async () => {
      await processManager.terminateProcess(pid);
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect((processManager as any).processes.has(pid)).toBe(false);
      expect((processManager as any).processCleanupQueue.has(pid)).toBe(false);
      expect((processManager as any).outputBuffers.has(pid)).toBe(false);
    });

    it('should fallback to system kill if no stored process', async () => {
      const unknownPid = 99999;
      
      await processManager.terminateProcess(unknownPid);
      
      expect(mockExecAsync).toHaveBeenCalledWith(`kill ${unknownPid}`);
    });

    it('should clean up buffer intervals', async () => {
      const mockInterval = {} as NodeJS.Timeout;
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      // Set up interval
      (processManager as any).bufferIntervals.set(pid, mockInterval);
      
      await processManager.terminateProcess(pid);
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(mockInterval);
      expect((processManager as any).bufferIntervals.has(pid)).toBe(false);
      
      clearIntervalSpy.mockRestore();
    });

    it('should handle termination errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      mockProcess.kill.mockImplementation(() => {
        throw new Error('Kill failed');
      });
      
      await processManager.terminateProcess(pid);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Failed to terminate process ${pid}:`, expect.any(Error));
      consoleWarnSpy.mockRestore();
    });

    it('should handle system kill errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const unknownPid = 99999;
      
      mockExecAsync.mockRejectedValue(new Error('System kill failed'));
      
      await processManager.terminateProcess(unknownPid);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Failed to terminate process ${unknownPid}:`, expect.any(Error));
      consoleWarnSpy.mockRestore();
    });
  });

  describe('readProcessOutput', () => {
    let pid: number;

    beforeEach(async () => {
      const spawnPromise = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      pid = await spawnPromise;
    });

    it('should return buffered output', async () => {
      // Add output to buffer
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('line 1\n'));
      stdoutHandler(Buffer.from('line 2\n'));
      
      const output = await processManager.readProcessOutput(pid);
      
      expect(output).toBe('line 1\nline 2\n');
    });

    it('should return output after last clear character', async () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('old content\n'));
      stdoutHandler(Buffer.from('\u001bc')); // Clear screen
      stdoutHandler(Buffer.from('new content\n'));
      
      const output = await processManager.readProcessOutput(pid);
      
      expect(output).toBe('new content\n');
    });

    it('should return full output if no clear character found', async () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('full content without clear\n'));
      
      const output = await processManager.readProcessOutput(pid);
      
      expect(output).toBe('full content without clear\n');
    });

    it('should return empty string for unknown PID', async () => {
      const output = await processManager.readProcessOutput(99999);
      
      expect(output).toBe('');
    });

    it('should handle multiple clear characters correctly', async () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('content 1\n'));
      stdoutHandler(Buffer.from('\u001bc')); // Clear 1
      stdoutHandler(Buffer.from('content 2\n'));
      stdoutHandler(Buffer.from('\u001bc')); // Clear 2
      stdoutHandler(Buffer.from('final content\n'));
      
      const output = await processManager.readProcessOutput(pid);
      
      expect(output).toBe('final content\n');
    });
  });

  describe('sendInput', () => {
    let pid: number;

    beforeEach(async () => {
      const spawnPromise = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      pid = await spawnPromise;
    });

    it('should send input to process stdin', async () => {
      await processManager.sendInput(pid, 'test input');
      
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('test input');
    });

    it('should throw error for unknown PID', async () => {
      await expect(processManager.sendInput(99999, 'test')).rejects.toThrow('No process found with PID 99999');
    });

    it('should throw error if process has no stdin', async () => {
      mockProcess.stdin = null;
      
      await expect(processManager.sendInput(pid, 'test')).rejects.toThrow(`No process found with PID ${pid}`);
    });

    it('should handle various input types', async () => {
      await processManager.sendInput(pid, 'string input');
      await processManager.sendInput(pid, '\x1b[A'); // Arrow key
      await processManager.sendInput(pid, '\r'); // Enter
      
      expect(mockProcess.stdin.write).toHaveBeenCalledTimes(3);
      expect(mockProcess.stdin.write).toHaveBeenNthCalledWith(1, 'string input');
      expect(mockProcess.stdin.write).toHaveBeenNthCalledWith(2, '\x1b[A');
      expect(mockProcess.stdin.write).toHaveBeenNthCalledWith(3, '\r');
    });
  });

  describe('waitForOutput', () => {
    let pid: number;

    beforeEach(async () => {
      const spawnPromise = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      pid = await spawnPromise;
    });

    it('should resolve when string pattern is found', async () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      
      const waitPromise = processManager.waitForOutput(pid, 'ready');
      
      // Add output that contains pattern
      stdoutHandler(Buffer.from('System is ready'));
      
      jest.advanceTimersByTime(200); // Advance past delay
      
      const result = await waitPromise;
      
      expect(result).toContain('System is ready');
    });

    it('should resolve when regex pattern matches', async () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      
      const waitPromise = processManager.waitForOutput(pid, /ready|started/);
      
      stdoutHandler(Buffer.from('Application started'));
      
      jest.advanceTimersByTime(200);
      
      const result = await waitPromise;
      
      expect(result).toContain('Application started');
    });

    it.skip('should timeout if pattern not found', async () => {
      const now = Date.now();
      const mockDateNow = jest.spyOn(Date, 'now');
      
      // First call returns start time, subsequent calls simulate timeout
      mockDateNow
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 1100); // Exceed timeout
      
      await expect(processManager.waitForOutput(pid, 'never-found', 1000))
        .rejects.toThrow('Timeout waiting for pattern: never-found');
      
      mockDateNow.mockRestore();
    });

    it.skip('should use default timeout of 5000ms', async () => {
      const now = Date.now();
      const mockDateNow = jest.spyOn(Date, 'now');
      
      // First call returns start time, subsequent calls simulate timeout  
      mockDateNow
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 5100); // Exceed default timeout
      
      await expect(processManager.waitForOutput(pid, 'never-found'))
        .rejects.toThrow('Timeout waiting for pattern: never-found');
      
      mockDateNow.mockRestore();
    });

    it('should check output continuously with delays', async () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      
      const waitPromise = processManager.waitForOutput(pid, 'final');
      
      // Add output over time
      jest.advanceTimersByTime(200);
      stdoutHandler(Buffer.from('first'));
      
      jest.advanceTimersByTime(200);
      stdoutHandler(Buffer.from('second'));
      
      jest.advanceTimersByTime(200);
      stdoutHandler(Buffer.from('final'));
      
      jest.advanceTimersByTime(200);
      
      const result = await waitPromise;
      
      expect(result).toContain('final');
    });

    it.skip('should handle regex timeout correctly', async () => {
      const now = Date.now();
      const mockDateNow = jest.spyOn(Date, 'now');
      
      // First call returns start time, subsequent calls simulate timeout
      mockDateNow
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 900); // Exceed timeout
      
      await expect(processManager.waitForOutput(pid, /never-matches/, 800))
        .rejects.toThrow('Timeout waiting for pattern: /never-matches/');
      
      mockDateNow.mockRestore();
    });
  });

  describe('cleanupAll', () => {
    it('should terminate all processes in cleanup queue', async () => {
      // Spawn multiple processes
      const spawnPromise1 = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      const pid1 = await spawnPromise1;
      
      const mockProcess2 = { ...mockProcess, pid: 54321 };
      mockSpawn.mockReturnValueOnce(mockProcess2);
      
      const spawnPromise2 = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      const pid2 = await spawnPromise2;
      
      expect((processManager as any).processCleanupQueue.size).toBe(2);
      
      await processManager.cleanupAll();
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess2.kill).toHaveBeenCalledWith('SIGTERM');
      expect((processManager as any).processCleanupQueue.size).toBe(0);
    });

    it('should handle empty cleanup queue', async () => {
      await processManager.cleanupAll();
      
      // Should complete without errors
      expect((processManager as any).processCleanupQueue.size).toBe(0);
    });

    it('should handle termination failures during cleanup', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      await spawnPromise;
      
      mockProcess.kill.mockImplementation(() => {
        throw new Error('Termination failed');
      });
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await processManager.cleanupAll();
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('delay', () => {
    it('should resolve after specified delay', async () => {
      const delayPromise = (processManager as any).delay(1000);
      
      jest.advanceTimersByTime(1000);
      
      await delayPromise;
      
      // Should resolve without issues
    });

    it('should handle zero delay', async () => {
      const delayPromise = (processManager as any).delay(0);
      
      jest.advanceTimersByTime(0);
      
      await delayPromise;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle spawn process without PID gracefully', async () => {
      mockProcess.pid = null;
      
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      await expect(spawnPromise).rejects.toThrow('Failed to spawn Napoleon process');
    });

    it('should handle process spawn with undefined PID', async () => {
      mockProcess.pid = undefined;
      
      const spawnPromise = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      await expect(spawnPromise).rejects.toThrow('Failed to spawn Napoleon process');
    });

    it('should handle concurrent operations safely', async () => {
      const mockProcess2 = { ...mockProcess, pid: 54321 };
      mockSpawn.mockReturnValueOnce(mockProcess).mockReturnValueOnce(mockProcess2);
      
      const spawnPromise1 = processManager.spawnNapoleon();
      const spawnPromise2 = processManager.spawnNapoleon();
      
      jest.advanceTimersByTime(2500);
      
      const [pid1, pid2] = await Promise.all([spawnPromise1, spawnPromise2]);
      
      expect(pid1).toBe(12345);
      expect(pid2).toBe(54321);
      expect((processManager as any).processCleanupQueue.size).toBe(2);
    });

    it('should handle large output buffers efficiently', async () => {
      const spawnPromise = processManager.spawnNapoleon();
      jest.advanceTimersByTime(2500);
      const pid = await spawnPromise;
      
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      
      // Generate large amounts of output
      for (let i = 0; i < 2000; i++) {
        stdoutHandler(Buffer.from(`Large output line ${i}\n`));
      }
      
      const output = await processManager.readProcessOutput(pid);
      
      // Should handle large output and maintain buffer limit
      expect(output.length).toBeGreaterThan(0);
      expect((processManager as any).outputBuffers.get(pid).length).toBe(1000);
    });
  });
});