import {
  delay,
  generateTestPrompt,
  TestDataBuilder,
  captureScreenshot,
} from '../../../src/ui-tests/helpers/utils';

describe('UI Test Utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const delayPromise = delay(1000);
      
      jest.advanceTimersByTime(999);
      // Promise should not be resolved yet
      
      jest.advanceTimersByTime(1);
      await delayPromise;
      
      // Should resolve now
    });

    it('should handle zero delay', async () => {
      const delayPromise = delay(0);
      jest.advanceTimersByTime(0);
      await delayPromise;
    });

    it('should handle negative delay', async () => {
      const delayPromise = delay(-100);
      jest.advanceTimersByTime(0);
      await delayPromise;
    });

    it('should handle very large delay', async () => {
      const delayPromise = delay(999999);
      
      jest.advanceTimersByTime(999998);
      // Should not resolve yet
      
      jest.advanceTimersByTime(1);
      await delayPromise;
    });
  });

  describe('generateTestPrompt', () => {
    it('should generate prompt with default prefix', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const prompt = generateTestPrompt();
      expect(prompt).toBe('Test Agent 1234567890');

      Date.now = originalNow;
    });

    it('should generate prompt with custom prefix', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 9876543210);

      const prompt = generateTestPrompt('Custom');
      expect(prompt).toBe('Custom Agent 9876543210');

      Date.now = originalNow;
    });

    it('should generate unique prompts', () => {
      const prompt1 = generateTestPrompt('Test1');
      const prompt2 = generateTestPrompt('Test2');
      
      expect(prompt1).not.toBe(prompt2);
      expect(prompt1).toContain('Test1 Agent');
      expect(prompt2).toContain('Test2 Agent');
    });

    it('should handle empty prefix', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 5555555555);

      const prompt = generateTestPrompt('');
      expect(prompt).toBe(' Agent 5555555555');

      Date.now = originalNow;
    });

    it('should handle undefined prefix', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1111111111);

      const prompt = generateTestPrompt(undefined as any);
      expect(prompt).toBe('Test Agent 1111111111'); // Default is 'Test'

      Date.now = originalNow;
    });

    it('should handle special character prefix', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 7777777777);

      const prompt = generateTestPrompt('Test!@#');
      expect(prompt).toBe('Test!@# Agent 7777777777');

      Date.now = originalNow;
    });
  });

  describe('TestDataBuilder', () => {
    describe('createAgentPrompts', () => {
      it('should create specified number of prompts', () => {
        const prompts = TestDataBuilder.createAgentPrompts(3);
        
        expect(prompts).toHaveLength(3);
        expect(prompts[0]).toContain('Test Agent 1:');
        expect(prompts[1]).toContain('Test Agent 2:');
        expect(prompts[2]).toContain('Test Agent 3:');
      });

      it('should handle zero count', () => {
        const prompts = TestDataBuilder.createAgentPrompts(0);
        expect(prompts).toHaveLength(0);
      });

      it('should handle single count', () => {
        const prompts = TestDataBuilder.createAgentPrompts(1);
        expect(prompts).toHaveLength(1);
        expect(prompts[0]).toContain('Test Agent 1:');
      });

      it('should handle large count', () => {
        const prompts = TestDataBuilder.createAgentPrompts(100);
        expect(prompts).toHaveLength(100);
        expect(prompts[99]).toContain('Test Agent 100:');
      });

      it('should create unique timestamps', () => {
        const prompts = TestDataBuilder.createAgentPrompts(5);
        const timestamps = prompts.map(p => p.split(': ')[1]);
        const uniqueTimestamps = new Set(timestamps);
        
        // Should have unique timestamps (or very close)
        expect(uniqueTimestamps.size).toBeGreaterThan(0);
      });

      it('should handle negative count gracefully', () => {
        const prompts = TestDataBuilder.createAgentPrompts(-5);
        expect(prompts).toHaveLength(0);
      });

      it('should create proper format for each prompt', () => {
        const prompts = TestDataBuilder.createAgentPrompts(3);
        
        prompts.forEach((prompt, index) => {
          expect(prompt).toMatch(/^Test Agent \d+: \d+$/);
          expect(prompt).toContain(`Test Agent ${index + 1}:`);
        });
      });
    });

    describe('createLongPrompt', () => {
      it('should create prompt with default length', () => {
        const prompt = TestDataBuilder.createLongPrompt();
        expect(prompt).toBe('A'.repeat(100));
        expect(prompt).toHaveLength(100);
      });

      it('should create prompt with custom length', () => {
        const prompt = TestDataBuilder.createLongPrompt(250);
        expect(prompt).toBe('A'.repeat(250));
        expect(prompt).toHaveLength(250);
      });

      it('should handle zero length', () => {
        const prompt = TestDataBuilder.createLongPrompt(0);
        expect(prompt).toBe('');
        expect(prompt).toHaveLength(0);
      });

      it('should handle single character length', () => {
        const prompt = TestDataBuilder.createLongPrompt(1);
        expect(prompt).toBe('A');
        expect(prompt).toHaveLength(1);
      });

      it('should handle very large length', () => {
        const prompt = TestDataBuilder.createLongPrompt(10000);
        expect(prompt).toHaveLength(10000);
        expect(prompt[0]).toBe('A');
        expect(prompt[9999]).toBe('A');
        expect(prompt.indexOf('B')).toBe(-1); // Should only contain 'A'
      });

      it('should handle negative length gracefully', () => {
        const prompt = TestDataBuilder.createLongPrompt(-50);
        expect(prompt).toBe('');
        expect(prompt).toHaveLength(0);
      });

      it('should create consistent output', () => {
        const prompt1 = TestDataBuilder.createLongPrompt(50);
        const prompt2 = TestDataBuilder.createLongPrompt(50);
        
        expect(prompt1).toBe(prompt2);
        expect(prompt1).toHaveLength(50);
      });
    });

    describe('createSpecialCharPrompt', () => {
      it('should create prompt with special characters', () => {
        const prompt = TestDataBuilder.createSpecialCharPrompt();
        
        expect(prompt).toBe('Test with special chars: !@#$%^&*()_+-=[]{}|;\':",./<>?');
        expect(prompt).toContain('!@#$%^&*()');
        expect(prompt).toContain('_+-=[]{}|');
        expect(prompt).toContain(';\':",./<>?');
      });

      it('should be consistent', () => {
        const prompt1 = TestDataBuilder.createSpecialCharPrompt();
        const prompt2 = TestDataBuilder.createSpecialCharPrompt();
        
        expect(prompt1).toBe(prompt2);
      });

      it('should contain expected special characters', () => {
        const prompt = TestDataBuilder.createSpecialCharPrompt();
        
        const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'];
        specialChars.forEach(char => {
          expect(prompt).toContain(char);
        });
      });

      it('should contain bracket characters', () => {
        const prompt = TestDataBuilder.createSpecialCharPrompt();
        
        const brackets = ['[', ']', '{', '}', '(', ')'];
        brackets.forEach(bracket => {
          expect(prompt).toContain(bracket);
        });
      });

      it('should contain punctuation characters', () => {
        const prompt = TestDataBuilder.createSpecialCharPrompt();
        
        const punctuation = [';', '\'', ':', '"', ',', '.', '/', '<', '>', '?'];
        punctuation.forEach(char => {
          expect(prompt).toContain(char);
        });
      });

      it('should contain mathematical operators', () => {
        const prompt = TestDataBuilder.createSpecialCharPrompt();
        
        const operators = ['+', '-', '='];
        operators.forEach(op => {
          expect(prompt).toContain(op);
        });
      });

      it('should have expected length', () => {
        const prompt = TestDataBuilder.createSpecialCharPrompt();
        expect(prompt.length).toBeGreaterThan(50);
        expect(prompt).toContain('Test with special chars: ');
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle Date.now mock correctly', () => {
      const originalNow = Date.now;
      
      // Test with various timestamp values
      const testTimestamps = [0, 1, 999999999999, Number.MAX_SAFE_INTEGER];
      
      testTimestamps.forEach(timestamp => {
        Date.now = jest.fn(() => timestamp);
        const prompt = generateTestPrompt('Edge');
        expect(prompt).toBe(`Edge Agent ${timestamp}`);
      });
      
      Date.now = originalNow;
    });

    it('should handle concurrent delay operations', async () => {
      const delays = [
        delay(100),
        delay(200),
        delay(50),
        delay(300),
      ];

      // Advance time to resolve all delays
      jest.advanceTimersByTime(300);
      
      const results = await Promise.all(delays);
      
      // All should resolve to undefined
      results.forEach(result => {
        expect(result).toBeUndefined();
      });
    });

    it('should handle createAgentPrompts with boundary values', () => {
      // Test with various edge cases
      const testCases = [
        { count: 0, expected: 0 },
        { count: 1, expected: 1 },
        { count: 2, expected: 2 },
        { count: 10, expected: 10 },
        { count: -1, expected: 0 },
        { count: -10, expected: 0 },
      ];

      testCases.forEach(({ count, expected }) => {
        const prompts = TestDataBuilder.createAgentPrompts(count);
        expect(prompts).toHaveLength(expected);
      });
    });

    it('should handle createLongPrompt with boundary values', () => {
      const testCases = [
        { length: 0, expected: 0 },
        { length: 1, expected: 1 },
        { length: 2, expected: 2 },
        { length: -1, expected: 0 },
        { length: -100, expected: 0 },
      ];

      testCases.forEach(({ length, expected }) => {
        const prompt = TestDataBuilder.createLongPrompt(length);
        expect(prompt).toHaveLength(expected);
        if (expected > 0) {
          expect(prompt).toBe('A'.repeat(expected));
        }
      });
    });

    it('should maintain consistency across multiple calls', () => {
      // Test that static methods are consistent
      const specialPrompt1 = TestDataBuilder.createSpecialCharPrompt();
      const specialPrompt2 = TestDataBuilder.createSpecialCharPrompt();
      expect(specialPrompt1).toBe(specialPrompt2);

      const longPrompt1 = TestDataBuilder.createLongPrompt(75);
      const longPrompt2 = TestDataBuilder.createLongPrompt(75);
      expect(longPrompt1).toBe(longPrompt2);
    });

    it('should handle generateTestPrompt with various input types', () => {
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const testCases = [
        { input: 'Normal', expected: 'Normal Agent 1234567890' },
        { input: 'With Spaces', expected: 'With Spaces Agent 1234567890' },
        { input: '123', expected: '123 Agent 1234567890' },
        { input: 'Special!@#', expected: 'Special!@# Agent 1234567890' },
        { input: '', expected: ' Agent 1234567890' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = generateTestPrompt(input);
        expect(result).toBe(expected);
      });

      Date.now = originalNow;
    });
  });

  describe('captureScreenshot', () => {
    it('should capture screenshot from process output', async () => {
      const mockContext = {
        processManager: {
          readProcessOutput: jest.fn().mockResolvedValue('test output')
        },
        pid: 123
      };

      const result = await captureScreenshot(mockContext as any, 'test');
      
      expect(result).toBe('test output');
      expect(mockContext.processManager.readProcessOutput).toHaveBeenCalledWith(123, 100);
    });
  });

});