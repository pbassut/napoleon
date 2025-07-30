/**
 * Simple test to verify InkUITester basic functionality
 */

// Mock dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
  },
}));

const { spawn } = require('child_process');
const { InkUITester } = require('../../../src/testing/ui/InkUITester');

describe('InkUITester - Simple', () => {
  let tester;
  let mockProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock process object
    mockProcess = {
      pid: 12345,
      killed: false,
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
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

    spawn.mockReturnValue(mockProcess);
    tester = new InkUITester();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default options', () => {
    expect(tester.options.entryPoint).toBe('bin/napoleon.js');
    expect(tester.options.timeout).toBe(30000);
    expect(tester.isRunning).toBe(false);
  });

  it('should normalize string input', () => {
    const result = tester.normalizeInput('test string');
    expect(result).toEqual({ data: 'test string' });
  });

  it('should handle key input', () => {
    const result = tester.normalizeInput({ key: 'enter' });
    expect(result.data).toBe('\r');
  });

  it('should handle special keys correctly', () => {
    const keys = {
      up: '\x1b[A',
      down: '\x1b[B',
      left: '\x1b[D',
      right: '\x1b[C',
      escape: '\x1b',
      tab: '\t',
      backspace: '\x7f',
    };

    Object.entries(keys).forEach(([key, expected]) => {
      const result = tester.normalizeInput({ key });
      expect(result.data).toBe(expected);
    });
  });

  it('should handle text input', () => {
    const result = tester.normalizeInput({ text: 'hello world' });
    expect(result.data).toBe('hello world');
  });

  it('should handle ctrl modifier', () => {
    const result = tester.normalizeInput({ key: 'c', ctrl: true });
    expect(result.data).toBe(String.fromCharCode('c'.charCodeAt(0) - 64));
  });

  it('should handle meta modifier', () => {
    const result = tester.normalizeInput({ key: 'a', meta: true });
    expect(result.data).toBe('\x1ba');
  });

  it('should handle unknown key', () => {
    const result = tester.normalizeInput({ key: 'z' });
    expect(result.data).toBe('z');
  });

  it('should handle empty input', () => {
    const result = tester.normalizeInput({});
    expect(result.data).toBe('');
  });

  it('should preserve additional properties', () => {
    const result = tester.normalizeInput({ 
      text: 'test', 
      waitAfter: 1000,
      custom: 'value' 
    });
    expect(result).toEqual({
      data: 'test',
      text: 'test',
      waitAfter: 1000,
      custom: 'value',
    });
  });

  it('should get output copy', () => {
    tester.output = [{ test: 'data' }];
    const output = tester.getOutput();
    
    expect(output).toEqual([{ test: 'data' }]);
    
    // Should be a copy, not reference
    output.push({ modified: 'data' });
    expect(tester.output).toHaveLength(1);
  });

  it('should clear output', () => {
    tester.output = [{ test: 'data1' }, { test: 'data2' }];
    expect(tester.output).toHaveLength(2);
    
    tester.clearOutput();
    
    expect(tester.output).toHaveLength(0);
  });

  it('should create delay promise', async () => {
    const delayPromise = tester.delay(1000);
    
    jest.advanceTimersByTime(999);
    // Promise should not be resolved yet
    
    jest.advanceTimersByTime(1);
    await delayPromise;
    
    // Should resolve now
  });

  it('should handle custom options', () => {
    const customTester = new InkUITester({
      entryPoint: 'custom/entry.js',
      timeout: 60000,
      captureOutput: false,
      env: { TEST: 'true' },
    });

    expect(customTester.options.entryPoint).toBe('custom/entry.js');
    expect(customTester.options.timeout).toBe(60000);
    expect(customTester.options.captureOutput).toBe(false);
    expect(customTester.options.env).toEqual({ TEST: 'true' });
  });

  it('should handle process error scenario', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const stopProcessSpy = jest.spyOn(tester, 'stopProcess').mockResolvedValue();
    
    tester.isRunning = true;
    tester.handleProcessExit(1, 'SIGTERM');

    expect(consoleWarnSpy).toHaveBeenCalledWith('UI process exited unexpectedly:', { 
      code: 1, 
      signal: 'SIGTERM' 
    });
    expect(stopProcessSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
    stopProcessSpy.mockRestore();
  });

  it('should reject sendToProcess when process not available', async () => {
    tester.process = null;
    await expect(tester.sendToProcess({ data: 'test' })).rejects.toThrow('Process not available');
  });

  it('should reject sendToProcess when process is killed', async () => {
    tester.process = { ...mockProcess, killed: true };
    await expect(tester.sendToProcess({ data: 'test' })).rejects.toThrow('Process not available');
  });

  it('should stop process when not running', async () => {
    tester.isRunning = false;
    await tester.stopProcess();
    // Should not call process methods
    expect(mockProcess.stdin.end).not.toHaveBeenCalled();
  });
});