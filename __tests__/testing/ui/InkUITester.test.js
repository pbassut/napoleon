/**
 * Tests for Ink UI Testing Framework
 */

// Mock dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
  },
}));

const { spawn } = require('child_process');
const fs = require('fs').promises;
const { InkUITester } = require('../../../src/testing/ui/InkUITester');

describe('InkUITester', () => {
  let tester;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock process object
    mockProcess = {
      pid: 12345,
      killed: false,
      stdout: {
        on: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
      },
      stdin: {
        write: jest.fn((data, callback) => {
          if (callback) callback();
        }),
        end: jest.fn(),
      },
      on: jest.fn(),
      once: jest.fn(),
      kill: jest.fn(),
    };

    // Mock spawn to return our mock process
    spawn.mockReturnValue(mockProcess);
    
    tester = new InkUITester();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultTester = new InkUITester();
      
      expect(defaultTester.options.entryPoint).toBe('bin/napoleon.js');
      expect(defaultTester.options.timeout).toBe(30000);
      expect(defaultTester.options.captureOutput).toBe(true);
      expect(defaultTester.options.env).toEqual({});
      expect(defaultTester.process).toBeNull();
      expect(defaultTester.output).toEqual([]);
      expect(defaultTester.isRunning).toBe(false);
      expect(defaultTester.startTime).toBeNull();
    });

    it('should accept custom options', () => {
      const customOptions = {
        entryPoint: 'custom/entry.js',
        timeout: 60000,
        captureOutput: false,
        env: { TEST_VAR: 'test' },
        customOption: 'value',
      };
      
      const customTester = new InkUITester(customOptions);
      
      expect(customTester.options.entryPoint).toBe('custom/entry.js');
      expect(customTester.options.timeout).toBe(60000);
      expect(customTester.options.captureOutput).toBe(false);
      expect(customTester.options.env).toEqual({ TEST_VAR: 'test' });
      expect(customTester.options.customOption).toBe('value');
    });

    it('should extend EventEmitter', () => {
      expect(tester.on).toBeDefined();
      expect(tester.emit).toBeDefined();
      expect(tester.removeListener).toBeDefined();
    });
  });

  describe('startProcess', () => {
    it('should start the process successfully', async () => {
      const processStartedSpy = jest.fn();
      tester.on('process-started', processStartedSpy);
      
      const startPromise = tester.startProcess();
      
      // Advance timers to allow initialization
      jest.advanceTimersByTime(200);
      
      await startPromise;
      
      expect(tester.isRunning).toBe(true);
      expect(tester.startTime).toBeDefined();
      expect(tester.process).toBe(mockProcess);
      expect(processStartedSpy).toHaveBeenCalledWith({
        pid: 12345,
      });
    });

    it('should throw error if process already running', async () => {
      tester.isRunning = true;
      
      await expect(tester.startProcess()).rejects.toThrow('Process already running');
    });

    it('should configure process environment correctly', async () => {
      const customEnv = { CUSTOM_VAR: 'value' };
      const customTester = new InkUITester({ env: customEnv });
      
      const startPromise = customTester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      expect(spawn).toHaveBeenCalledWith('node', ['bin/napoleon.js', 'start'], {
        env: expect.objectContaining({
          NAPOLEON_UI_MODE: 'ink',
          NAPOLEON_TEST_MODE: 'true',
          FORCE_COLOR: '1',
          NODE_ENV: 'test',
          CUSTOM_VAR: 'value',
        }),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });
    });

    it('should setup output capture when enabled', async () => {
      const outputSpy = jest.fn();
      const errorOutputSpy = jest.fn();
      
      tester.on('output', outputSpy);
      tester.on('error-output', errorOutputSpy);
      
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      expect(mockProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      
      // Test stdout handler
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      const testData = Buffer.from('test output');
      stdoutHandler(testData);
      
      expect(tester.output).toHaveLength(1);
      expect(tester.output[0]).toEqual({
        type: 'stdout',
        data: 'test output',
        timestamp: expect.any(Number),
      });
      expect(outputSpy).toHaveBeenCalled();
      
      // Test stderr handler
      const stderrHandler = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];
      const errorData = Buffer.from('error output');
      stderrHandler(errorData);
      
      expect(tester.output).toHaveLength(2);
      expect(tester.output[1]).toEqual({
        type: 'stderr',
        data: 'error output',
        timestamp: expect.any(Number),
      });
      expect(errorOutputSpy).toHaveBeenCalled();
    });

    it('should not setup output capture when disabled', async () => {
      const noCaptureTeser = new InkUITester({ captureOutput: false });
      
      const startPromise = noCaptureTeser.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      expect(mockProcess.stdout.on).not.toHaveBeenCalled();
      expect(mockProcess.stderr.on).not.toHaveBeenCalled();
    });

    it('should handle process exit events', async () => {
      const processExitSpy = jest.fn();
      tester.on('process-exit', processExitSpy);
      
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      // Simulate process exit
      const exitHandler = mockProcess.on.mock.calls.find(call => call[0] === 'exit')[1];
      exitHandler(0, 'SIGTERM');
      
      expect(processExitSpy).toHaveBeenCalledWith({ code: 0, signal: 'SIGTERM' });
    });

    it('should handle process error events', async () => {
      const processErrorSpy = jest.fn();
      tester.on('process-error', processErrorSpy);
      
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      // Simulate process error
      const errorHandler = mockProcess.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Process error');
      errorHandler(testError);
      
      expect(processErrorSpy).toHaveBeenCalledWith({ error: testError });
    });
  });

  describe('waitForInitialization', () => {
    it('should resolve when process is ready', async () => {
      tester.process = mockProcess;
      
      const initPromise = tester.waitForInitialization();
      jest.advanceTimersByTime(200);
      
      await expect(initPromise).resolves.toBeUndefined();
    });

    it('should reject on initialization timeout', async () => {
      tester.process = null;
      
      const initPromise = tester.waitForInitialization();
      jest.advanceTimersByTime(6000); // Exceed default 5s timeout
      
      await expect(initPromise).rejects.toThrow('Process initialization timeout');
    });

    it('should use custom init timeout', async () => {
      const customTester = new InkUITester({ initTimeout: 2000 });
      customTester.process = null;
      
      const initPromise = customTester.waitForInitialization();
      jest.advanceTimersByTime(2500); // Exceed custom 2s timeout
      
      await expect(initPromise).rejects.toThrow('Process initialization timeout');
    });

    it('should reject if process is killed', async () => {
      mockProcess.killed = true;
      tester.process = mockProcess;
      
      const initPromise = tester.waitForInitialization();
      jest.advanceTimersByTime(6000);
      
      await expect(initPromise).rejects.toThrow('Process initialization timeout');
    });
  });

  describe('sendInput', () => {
    beforeEach(async () => {
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
    });

    it('should send string input to process', async () => {
      await tester.sendInput('test input');
      
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('test input', expect.any(Function));
    });

    it('should send object input to process', async () => {
      await tester.sendInput({ text: 'test input' });
      
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('test input', expect.any(Function));
    });

    it('should handle special keys', async () => {
      const keyMappings = [
        { key: 'up', expected: '\x1b[A' },
        { key: 'down', expected: '\x1b[B' },
        { key: 'left', expected: '\x1b[D' },
        { key: 'right', expected: '\x1b[C' },
        { key: 'enter', expected: '\r' },
        { key: 'escape', expected: '\x1b' },
        { key: 'tab', expected: '\t' },
        { key: 'backspace', expected: '\x7f' },
      ];
      
      for (const mapping of keyMappings) {
        mockProcess.stdin.write.mockClear();
        await tester.sendInput({ key: mapping.key });
        expect(mockProcess.stdin.write).toHaveBeenCalledWith(mapping.expected, expect.any(Function));
      }
    });

    it('should handle control key modifiers', async () => {
      await tester.sendInput({ key: 'c', ctrl: true });
      
      // Ctrl+C should be ASCII 3 (C is 67, 67-64 = 3)
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('\x03', expect.any(Function));
    });

    it('should handle meta key modifiers', async () => {
      await tester.sendInput({ key: 'x', meta: true });
      
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('\x1bx', expect.any(Function));
    });

    it('should wait after input if specified', async () => {
      const waitTime = 1000;
      const inputPromise = tester.sendInput({ text: 'test', waitAfter: waitTime });
      
      jest.advanceTimersByTime(waitTime);
      
      await inputPromise;
      
      expect(mockProcess.stdin.write).toHaveBeenCalledWith('test', expect.any(Function));
    });

    it('should throw error if process not running', async () => {
      tester.isRunning = false;
      
      await expect(tester.sendInput('test')).rejects.toThrow('Process not running');
    });

    it('should handle process write errors', async () => {
      mockProcess.stdin.write.mockImplementation((data, callback) => {
        callback(new Error('Write failed'));
      });
      
      await expect(tester.sendInput('test')).rejects.toThrow('Write failed');
    });

    it('should handle killed process', async () => {
      mockProcess.killed = true;
      
      await expect(tester.sendInput('test')).rejects.toThrow('Process not available');
    });
  });

  describe('normalizeInput', () => {
    it('should normalize string input', () => {
      const result = tester.normalizeInput('test string');
      expect(result).toEqual({ data: 'test string' });
    });

    it('should normalize text object input', () => {
      const result = tester.normalizeInput({ text: 'test text' });
      expect(result).toEqual({ data: 'test text', text: 'test text' });
    });

    it('should normalize key object input', () => {
      const result = tester.normalizeInput({ key: 'enter' });
      expect(result).toEqual({ data: '\r', key: 'enter' });
    });

    it('should handle unknown keys', () => {
      const result = tester.normalizeInput({ key: 'unknownkey' });
      expect(result).toEqual({ data: 'unknownkey', key: 'unknownkey' });
    });

    it('should preserve additional properties', () => {
      const input = { text: 'test', waitAfter: 1000, custom: 'value' };
      const result = tester.normalizeInput(input);
      
      expect(result).toEqual({
        data: 'test',
        text: 'test',
        waitAfter: 1000,
        custom: 'value',
      });
    });
  });

  describe('stopProcess', () => {
    beforeEach(async () => {
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
    });

    it('should stop running process', async () => {
      const processStoppedSpy = jest.fn();
      tester.on('process-stopped', processStoppedSpy);
      
      const stopPromise = tester.stopProcess();
      
      // Simulate process exit
      const exitHandler = mockProcess.once.mock.calls.find(call => call[0] === 'exit')[1];
      exitHandler();
      
      await stopPromise;
      
      expect(tester.isRunning).toBe(false);
      expect(mockProcess.stdin.end).toHaveBeenCalled();
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(processStoppedSpy).toHaveBeenCalled();
    });

    it('should handle already stopped process', async () => {
      tester.isRunning = false;
      
      await tester.stopProcess();
      
      expect(mockProcess.kill).not.toHaveBeenCalled();
    });

    it('should force kill process on timeout', async () => {
      const stopPromise = tester.stopProcess();
      
      // Don't trigger exit handler, let timeout occur
      jest.advanceTimersByTime(6000);
      
      await stopPromise;
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('should handle already killed process', async () => {
      mockProcess.killed = true;
      
      await tester.stopProcess();
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('handleProcessExit', () => {
    it('should handle unexpected process exit', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Start process first
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      // Simulate unexpected exit while running
      tester.handleProcessExit(1, 'SIGKILL');
      
      expect(consoleSpy).toHaveBeenCalledWith('UI process exited unexpectedly:', { code: 1, signal: 'SIGKILL' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Output Management', () => {
    beforeEach(async () => {
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
    });

    it('should capture and return output', () => {
      // Simulate output
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('test output 1'));
      stdoutHandler(Buffer.from('test output 2'));
      
      const output = tester.getOutput();
      
      expect(output).toHaveLength(2);
      expect(output[0].data).toBe('test output 1');
      expect(output[1].data).toBe('test output 2');
      expect(output[0]).not.toBe(tester.output[0]); // Should return copy
    });

    it('should clear output', () => {
      // Add some output
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('test output'));
      
      expect(tester.output).toHaveLength(1);
      
      tester.clearOutput();
      
      expect(tester.output).toHaveLength(0);
    });
  });

  describe('waitForStability', () => {
    beforeEach(async () => {
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
    });

    it('should wait for output stability', async () => {
      const stabilityPromise = tester.waitForStability(500);
      
      // Simulate some output
      tester.emit('output', { data: 'test' });
      
      jest.advanceTimersByTime(300); // Not enough time for stability
      
      // More output
      tester.emit('output', { data: 'more' });
      
      jest.advanceTimersByTime(600); // Now stable
      
      await stabilityPromise;
      
      // Should resolve when stable
      expect(true).toBe(true);
    });

    it('should timeout if taking too long', async () => {
      const stabilityPromise = tester.waitForStability(1000);
      
      // Keep emitting output to prevent stability
      const interval = setInterval(() => {
        tester.emit('output', { data: 'continuous' });
      }, 500);
      
      jest.advanceTimersByTime(11000); // Exceed overall timeout (10x stability timeout)
      
      clearInterval(interval);
      
      await stabilityPromise;
      
      // Should resolve even with timeout
      expect(true).toBe(true);
    });
  });

  describe('delay', () => {
    it('should delay for specified time', async () => {
      const delayPromise = tester.delay(1000);
      
      jest.advanceTimersByTime(1000);
      
      await delayPromise;
      
      expect(true).toBe(true); // Should resolve after delay
    });
  });

  describe('saveResults', () => {
    beforeEach(async () => {
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
    });

    it('should save test results to file', async () => {
      const filename = 'test-results.json';
      
      // Add some output
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      stdoutHandler(Buffer.from('test output'));
      
      jest.advanceTimersByTime(5000); // Simulate some runtime
      
      await tester.saveResults(filename);
      
      expect(fs.writeFile).toHaveBeenCalledWith(filename, expect.stringContaining('"startTime"'));
      
      const savedData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(savedData).toHaveProperty('startTime');
      expect(savedData).toHaveProperty('duration');
      expect(savedData).toHaveProperty('output');
      expect(savedData).toHaveProperty('metadata');
      expect(savedData.metadata.entryPoint).toBe('bin/napoleon.js');
    });

    it('should handle custom options in saved results', async () => {
      const customTester = new InkUITester({
        entryPoint: 'custom.js',
        env: { CUSTOM: 'value' },
      });
      
      const startPromise = customTester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      await customTester.saveResults('custom-results.json');
      
      const savedData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(savedData.metadata.entryPoint).toBe('custom.js');
      expect(savedData.metadata.env).toEqual({ CUSTOM: 'value' });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle spawn process creation failure', async () => {
      spawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });
      
      await expect(new InkUITester().startNapoleonProcess()).rejects.toThrow('Spawn failed');
    });

    it('should handle missing process in sendToProcess', async () => {
      tester.process = null;
      
      await expect(tester.sendToProcess({ data: 'test' })).rejects.toThrow('Process not available');
    });

    it('should handle stdin write exceptions', async () => {
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
      
      mockProcess.stdin.write.mockImplementation(() => {
        throw new Error('Write exception');
      });
      
      await expect(tester.sendToProcess({ data: 'test' })).rejects.toThrow('Write exception');
    });

    it('should handle control key edge cases', () => {
      // Test control character at boundary
      const result = tester.normalizeInput({ key: '@', ctrl: true }); // @ is ASCII 64
      expect(result.data).toBe('\x00'); // 64-64 = 0
    });

    it('should handle empty input normalization', () => {
      const result = tester.normalizeInput({});
      expect(result.data).toBe('');
    });
  });

  describe('Additional Coverage Tests', () => {
    beforeEach(async () => {
      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;
    });

    it('should handle process stdin.end error', async () => {
      mockProcess.stdin.end.mockImplementation(() => {
        throw new Error('End failed');
      });

      // Should not throw error
      await expect(tester.stopProcess()).resolves.toBeUndefined();
    });

    it('should handle killed process in terminateProcess', async () => {
      mockProcess.killed = true;

      const terminatePromise = tester.terminateProcess();
      jest.advanceTimersByTime(6000); // Force timeout

      await terminatePromise;
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle process that exits before timeout in terminateProcess', async () => {
      const terminatePromise = tester.terminateProcess();
      
      // Simulate process exit before timeout
      const exitHandler = mockProcess.once.mock.calls.find(call => call[0] === 'exit')[1];
      exitHandler();

      await terminatePromise;
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle environment variable inheritance', async () => {
      const originalEnv = process.env.TEST_VAR;
      process.env.TEST_VAR = 'original-value';

      const customTester = new InkUITester({
        env: { CUSTOM_VAR: 'custom-value' },
      });

      const startPromise = customTester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;

      const spawnCall = spawn.mock.calls[spawn.mock.calls.length - 1];
      const spawnEnv = spawnCall[2].env;

      expect(spawnEnv.TEST_VAR).toBe('original-value');
      expect(spawnEnv.CUSTOM_VAR).toBe('custom-value');
      expect(spawnEnv.NAPOLEON_UI_MODE).toBe('ink');

      // Cleanup
      if (originalEnv !== undefined) {
        process.env.TEST_VAR = originalEnv;
      } else {
        delete process.env.TEST_VAR;
      }
    });

    it('should handle process error during startup', async () => {
      const errorSpy = jest.fn();
      tester.on('process-error', errorSpy);

      const startPromise = tester.startProcess();
      jest.advanceTimersByTime(200);
      await startPromise;

      // Simulate process error
      const errorHandler = mockProcess.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Process startup error');
      errorHandler(testError);

      expect(errorSpy).toHaveBeenCalledWith({ error: testError });
    });

    it('should calculate correct duration in saveResults', async () => {
      const startTime = Date.now();
      tester.startTime = startTime;

      // Mock Date.now to return a later time
      const mockNow = startTime + 5000;
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => mockNow);

      await tester.saveResults('test-results.json');

      const savedData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(savedData.duration).toBe(5000);
      expect(savedData.startTime).toBe(startTime);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should handle output capture with binary data', () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      const binaryData = Buffer.from([0, 1, 255, 128, 64]);
      
      stdoutHandler(binaryData);

      expect(tester.output).toHaveLength(1);
      expect(tester.output[0].data).toBe(binaryData.toString());
      expect(tester.output[0].type).toBe('stdout');
    });

    it('should handle stderr output capture', () => {
      const stderrHandler = mockProcess.stderr.on.mock.calls.find(call => call[0] === 'data')[1];
      const errorData = Buffer.from('Error output');
      
      stderrHandler(errorData);

      expect(tester.output).toHaveLength(1);
      expect(tester.output[0].data).toBe('Error output');
      expect(tester.output[0].type).toBe('stderr');
    });

    it('should handle large output volumes', () => {
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      
      // Add 1000 output entries
      for (let i = 0; i < 1000; i++) {
        stdoutHandler(Buffer.from(`Output line ${i}`));
      }

      expect(tester.output).toHaveLength(1000);
      expect(tester.output[0].data).toBe('Output line 0');
      expect(tester.output[999].data).toBe('Output line 999');
    });

    it('should handle key mappings for all special keys', () => {
      const specialKeys = [
        { key: 'up', expected: '\x1b[A' },
        { key: 'down', expected: '\x1b[B' },
        { key: 'left', expected: '\x1b[D' },
        { key: 'right', expected: '\x1b[C' },
        { key: 'enter', expected: '\r' },
        { key: 'escape', expected: '\x1b' },
        { key: 'tab', expected: '\t' },
        { key: 'backspace', expected: '\x7f' },
      ];

      specialKeys.forEach(mapping => {
        const result = tester.normalizeInput({ key: mapping.key });
        expect(result.data).toBe(mapping.expected);
      });
    });

    it('should handle ctrl key combinations', () => {
      const ctrlKeys = [
        { key: 'a', expected: '\x01' },
        { key: 'c', expected: '\x03' },
        { key: 'z', expected: '\x1a' },
        { key: 'A', expected: '\x01' }, // Should work with uppercase too
      ];

      ctrlKeys.forEach(mapping => {
        const result = tester.normalizeInput({ key: mapping.key, ctrl: true });
        expect(result.data).toBe(mapping.expected);
      });
    });

    it('should handle meta key combinations', () => {
      const metaKeys = [
        { key: 'a', expected: '\x1ba' },
        { key: 'x', expected: '\x1bx' },
        { key: 'enter', expected: '\x1b\r' },
      ];

      metaKeys.forEach(mapping => {
        const result = tester.normalizeInput({ key: mapping.key, meta: true });
        expect(result.data).toBe(mapping.expected);
      });
    });

    it('should handle complex input objects with all properties', () => {
      const complexInput = {
        text: 'test input',
        waitAfter: 500,
        immediate: true,
        customProp: 'custom value',
      };

      const result = tester.normalizeInput(complexInput);

      expect(result.data).toBe('test input');
      expect(result.text).toBe('test input');
      expect(result.waitAfter).toBe(500);
      expect(result.immediate).toBe(true);
      expect(result.customProp).toBe('custom value');
    });

    it('should handle waitForStability with immediate stability', async () => {
      // No output events, should resolve immediately after timeout
      const stabilityPromise = tester.waitForStability(100);
      
      jest.advanceTimersByTime(150);
      
      await stabilityPromise;
      // Should complete without errors
    });

    it('should handle error in output handler', () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Mock stdout handler to throw error
      const stdoutHandler = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
      
      // Temporarily break the output array to cause an error
      const originalPush = tester.output.push;
      tester.output.push = jest.fn(() => {
        throw new Error('Output handling failed');
      });

      // Should not crash the process
      expect(() => stdoutHandler(Buffer.from('test'))).not.toThrow();

      // Restore
      tester.output.push = originalPush;
      console.error = originalConsoleError;
    });

    it('should handle entry point with different extensions', () => {
      const testerJs = new InkUITester({ entryPoint: 'bin/app.js' });
      const testerTs = new InkUITester({ entryPoint: 'src/main.ts' });
      const testerMjs = new InkUITester({ entryPoint: 'dist/index.mjs' });

      expect(testerJs.options.entryPoint).toBe('bin/app.js');
      expect(testerTs.options.entryPoint).toBe('src/main.ts');
      expect(testerMjs.options.entryPoint).toBe('dist/index.mjs');
    });
  });
});