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
});