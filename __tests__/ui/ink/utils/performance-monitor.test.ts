/**
 * Tests for performance monitoring utilities
 * Comprehensive coverage including React hooks
 */

// Mock React hooks
jest.mock('react', () => ({
  useRef: jest.fn(),
  useEffect: jest.fn(),
}));

import { useRef, useEffect } from 'react';
import {
  useRenderTime,
  useComponentLifecycle,
  getPerformanceStats,
  getRecentRenders,
  getSlowestRenders,
  clearPerformanceData,
  logPerformanceSummary,
} from '../../../../src/ui/ink/utils/performance-monitor';

// Cast mocks for TypeScript
const mockUseRef = useRef as jest.MockedFunction<typeof useRef>;
const mockUseEffect = useEffect as jest.MockedFunction<typeof useEffect>;

// Mock console methods
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  console.debug = jest.fn();
  // Clear any existing performance data
  clearPerformanceData();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  jest.clearAllMocks();
});

describe('Performance Monitor', () => {
  describe('clearPerformanceData', () => {
    it('should clear all performance data', () => {
      // Clear data
      clearPerformanceData();
      
      // Verify data is cleared
      const statsAfter = getPerformanceStats();
      expect(statsAfter.totalRenders).toBe(0);
      expect(statsAfter.avgRenderTime).toBe(0);
      expect(statsAfter.slowRenders).toBe(0);
      expect(Object.keys(statsAfter.componentStats)).toHaveLength(0);
    });
  });

  describe('getPerformanceStats', () => {
    it('should return initial empty stats', () => {
      const stats = getPerformanceStats();
      
      expect(stats).toEqual({
        totalRenders: 0,
        avgRenderTime: 0,
        slowRenders: 0,
        componentStats: {},
        uptime: expect.any(Number),
      });
    });

    it('should have uptime as a positive number', () => {
      const stats = getPerformanceStats();
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof stats.uptime).toBe('number');
    });
  });

  describe('getRecentRenders', () => {
    it('should return empty array when no renders recorded', () => {
      const recent = getRecentRenders();
      expect(recent).toEqual([]);
    });

    it('should handle different count parameters', () => {
      const recent5 = getRecentRenders(5);
      const recent10 = getRecentRenders(10);
      const recentDefault = getRecentRenders();
      
      expect(Array.isArray(recent5)).toBe(true);
      expect(Array.isArray(recent10)).toBe(true);
      expect(Array.isArray(recentDefault)).toBe(true);
    });
  });

  describe('getSlowestRenders', () => {
    it('should return empty array when no slow renders recorded', () => {
      const slowest = getSlowestRenders();
      expect(slowest).toEqual([]);
    });

    it('should handle different count parameters', () => {
      const slowest3 = getSlowestRenders(3);
      const slowest5 = getSlowestRenders(5);
      const slowestDefault = getSlowestRenders();
      
      expect(Array.isArray(slowest3)).toBe(true);
      expect(Array.isArray(slowest5)).toBe(true);
      expect(Array.isArray(slowestDefault)).toBe(true);
    });
  });

  describe('logPerformanceSummary', () => {
    it('should log basic performance summary', () => {
      logPerformanceSummary();
      
      expect(console.log).toHaveBeenCalledWith('\n=== Performance Summary ===');
      expect(console.log).toHaveBeenCalledWith('Total renders: 0');
      expect(console.log).toHaveBeenCalledWith('Average render time: 0ms');
      expect(console.log).toHaveBeenCalledWith('Slow renders: 0');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Uptime:'));
      expect(console.log).toHaveBeenCalledWith('==========================\n');
    });

    it('should not log component stats section when no components tracked', () => {
      logPerformanceSummary();
      
      expect(console.log).not.toHaveBeenCalledWith('\n--- Component Stats ---');
    });

    it('should not log slowest renders section when no slow renders', () => {
      logPerformanceSummary();
      
      expect(console.log).not.toHaveBeenCalledWith('\n--- Slowest Renders ---');
    });

    it('should log complete summary structure', () => {
      logPerformanceSummary();
      
      // Check that all expected log calls are made
      const logCalls = (console.log as jest.Mock).mock.calls;
      const logTexts = logCalls.map(call => call[0]);
      
      expect(logTexts).toContain('\n=== Performance Summary ===');
      expect(logTexts).toContain('Total renders: 0');
      expect(logTexts).toContain('Average render time: 0ms');
      expect(logTexts).toContain('Slow renders: 0');
      expect(logTexts.some(text => typeof text === 'string' && text.includes('Uptime:'))).toBe(true);
      expect(logTexts).toContain('==========================\n');
    });
  });

  describe('data structure integrity', () => {
    it('should maintain consistent data structure for stats', () => {
      const stats = getPerformanceStats();
      
      expect(stats).toHaveProperty('totalRenders');
      expect(stats).toHaveProperty('avgRenderTime');
      expect(stats).toHaveProperty('slowRenders');
      expect(stats).toHaveProperty('componentStats');
      expect(stats).toHaveProperty('uptime');
      
      expect(typeof stats.totalRenders).toBe('number');
      expect(typeof stats.avgRenderTime).toBe('number');
      expect(typeof stats.slowRenders).toBe('number');
      expect(typeof stats.componentStats).toBe('object');
      expect(typeof stats.uptime).toBe('number');
    });

    it('should return render arrays with proper structure', () => {
      const recent = getRecentRenders(5);
      const slowest = getSlowestRenders(3);
      
      expect(Array.isArray(recent)).toBe(true);
      expect(Array.isArray(slowest)).toBe(true);
      
      // Since no renders are recorded, arrays should be empty
      expect(recent).toHaveLength(0);
      expect(slowest).toHaveLength(0);
    });
  });

  describe('parameter validation', () => {
    it('should handle edge case parameters for getRecentRenders', () => {
      expect(() => getRecentRenders(0)).not.toThrow();
      expect(() => getRecentRenders(-1)).not.toThrow();
      expect(() => getRecentRenders(1000)).not.toThrow();
    });

    it('should handle edge case parameters for getSlowestRenders', () => {
      expect(() => getSlowestRenders(0)).not.toThrow();
      expect(() => getSlowestRenders(-1)).not.toThrow();
      expect(() => getSlowestRenders(1000)).not.toThrow();
    });
  });

  describe('module exports', () => {
    it('should export all expected functions', () => {
      expect(typeof getPerformanceStats).toBe('function');
      expect(typeof getRecentRenders).toBe('function');
      expect(typeof getSlowestRenders).toBe('function');
      expect(typeof clearPerformanceData).toBe('function');
      expect(typeof logPerformanceSummary).toBe('function');
    });
  });

  describe('performance stats calculation', () => {
    it('should handle division by zero safely', () => {
      // With no renders, avgRenderTime should be 0
      const stats = getPerformanceStats();
      expect(stats.avgRenderTime).toBe(0);
      expect(isNaN(stats.avgRenderTime)).toBe(false);
    });

    it('should maintain uptime consistency', () => {
      const stats1 = getPerformanceStats();
      
      // Wait a small amount of time
      const start = Date.now();
      while (Date.now() - start < 1) {
        // Small delay
      }
      
      const stats2 = getPerformanceStats();
      
      // Uptime should be non-decreasing
      expect(stats2.uptime).toBeGreaterThanOrEqual(stats1.uptime);
    });
  });

  describe('React Hooks', () => {
    let mockRef: { current: number };
    let useEffectCallbacks: Array<() => void | (() => void)>;

    beforeEach(() => {
      // Setup mock ref
      mockRef = { current: 0 };
      mockUseRef.mockReturnValue(mockRef);
      
      // Capture useEffect callbacks
      useEffectCallbacks = [];
      mockUseEffect.mockImplementation((callback) => {
        useEffectCallbacks.push(callback);
        return undefined;
      });

      // Mock performance.now()
      Object.defineProperty(global, 'performance', {
        value: { now: jest.fn() },
        writable: true,
      });
    });

    describe('useRenderTime', () => {
      it('should call useRef and useEffect', () => {
        useRenderTime('TestComponent');
        
        expect(mockUseRef).toHaveBeenCalledTimes(1);
        expect(mockUseEffect).toHaveBeenCalledTimes(2);
      });

      it('should set start time in first effect', () => {
        const mockPerformanceNow = performance.now as jest.MockedFunction<typeof performance.now>;
        mockPerformanceNow.mockReturnValue(123.45);
        
        useRenderTime('TestComponent');
        
        // Trigger first useEffect
        useEffectCallbacks[0]();
        
        expect(mockRef.current).toBe(123.45);
      });

      it('should record render time in second effect when start time exists', () => {
        const mockPerformanceNow = performance.now as jest.MockedFunction<typeof performance.now>;
        mockRef.current = 100;
        mockPerformanceNow.mockReturnValue(125);
        
        useRenderTime('TestComponent');
        
        // Trigger second useEffect
        useEffectCallbacks[1]();
        
        // Verify performance data was recorded
        const stats = getPerformanceStats();
        expect(stats.totalRenders).toBe(1);
        expect(stats.avgRenderTime).toBe(25);
      });

      it('should not record when start time is 0', () => {
        mockRef.current = 0;
        
        useRenderTime('TestComponent');
        
        // Trigger second useEffect
        useEffectCallbacks[1]();
        
        // Should have no renders recorded
        expect(getPerformanceStats().totalRenders).toBe(0);
      });

      it('should handle multiple components', () => {
        const mockPerformanceNow = performance.now as jest.MockedFunction<typeof performance.now>;
        
        // Create separate refs for each component
        const componentARef = { current: 0 };
        const componentBRef = { current: 0 };
        
        // Mock useRef to return different refs for each call
        mockUseRef.mockReturnValueOnce(componentARef).mockReturnValueOnce(componentBRef);
        
        // First component
        useRenderTime('ComponentA');
        componentARef.current = 100;
        mockPerformanceNow.mockReturnValue(120); // 20ms
        useEffectCallbacks[1](); // Trigger second useEffect for ComponentA
        
        // Clear previous effects and set up for second component
        useEffectCallbacks = [];
        
        // Second component
        useRenderTime('ComponentB');
        componentBRef.current = 200;
        mockPerformanceNow.mockReturnValue(230); // 30ms
        useEffectCallbacks[1](); // Trigger second useEffect for ComponentB
        
        const stats = getPerformanceStats();
        expect(stats.totalRenders).toBe(2);
        expect(stats.avgRenderTime).toBe(25); // (20+30)/2
      });
    });

    describe('useComponentLifecycle', () => {
      it('should call useEffect with component name dependency', () => {
        useComponentLifecycle('TestComponent');
        
        expect(mockUseEffect).toHaveBeenCalledWith(
          expect.any(Function),
          ['TestComponent']
        );
      });

      it('should log mount message and return cleanup function', () => {
        const mockDateNow = jest.spyOn(Date, 'now');
        mockDateNow.mockReturnValue(1000);
        
        useComponentLifecycle('TestComponent');
        
        // Execute useEffect callback
        const cleanupFunction = useEffectCallbacks[0]() as () => void;
        
        expect(console.debug).toHaveBeenCalledWith('[Performance] TestComponent mounted');
        expect(typeof cleanupFunction).toBe('function');
      });

      it('should log unmount message with lifetime on cleanup', () => {
        const mockDateNow = jest.spyOn(Date, 'now');
        mockDateNow
          .mockReturnValueOnce(1000) // Mount time
          .mockReturnValueOnce(1500); // Unmount time
        
        useComponentLifecycle('TestComponent');
        
        // Execute useEffect and get cleanup
        const cleanupFunction = useEffectCallbacks[0]() as () => void;
        
        // Execute cleanup (unmount)
        cleanupFunction();
        
        expect(console.debug).toHaveBeenCalledWith(
          '[Performance] TestComponent unmounted after 500ms'
        );
      });

      it('should handle different component names', () => {
        useComponentLifecycle('ComponentA');
        expect(mockUseEffect).toHaveBeenCalledWith(expect.any(Function), ['ComponentA']);
        
        useComponentLifecycle('ComponentB');
        expect(mockUseEffect).toHaveBeenCalledWith(expect.any(Function), ['ComponentB']);
      });
    });
  });

  describe('Advanced PerformanceMetrics behavior', () => {
    let mockPerformanceNow: jest.MockedFunction<typeof performance.now>;
    let mockRef: { current: number };

    beforeEach(() => {
      // Setup performance API mock
      mockPerformanceNow = jest.fn();
      Object.defineProperty(global, 'performance', {
        value: { now: mockPerformanceNow },
        writable: true,
      });

      // Setup ref mock
      mockRef = { current: 0 };
      mockUseRef.mockReturnValue(mockRef);
      
      // Setup useEffect to execute immediately
      mockUseEffect.mockImplementation((callback) => {
        const result = callback();
        return result;
      });
    });

    it('should track slow renders (>16.67ms)', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      mockRef.current = 0;
      mockPerformanceNow.mockReturnValue(100);
      
      useRenderTime('SlowComponent');
      
      // Execute first useEffect (sets start time)
      callbacks[0]();
      expect(mockRef.current).toBe(100);
      
      // Execute second useEffect (calculates duration)
      mockPerformanceNow.mockReturnValue(120); // 20ms later
      callbacks[1]();
      
      const stats = getPerformanceStats();
      expect(stats.slowRenders).toBe(1);
      
      const slowest = getSlowestRenders();
      expect(slowest).toHaveLength(1);
      expect(slowest[0].componentName).toBe('SlowComponent');
      expect(slowest[0].duration).toBe(20);
    });

    it('should not track fast renders as slow (<16.67ms)', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      mockRef.current = 0;
      mockPerformanceNow.mockReturnValue(100);
      
      useRenderTime('FastComponent');
      
      // Execute first useEffect (sets start time)
      callbacks[0]();
      
      // Execute second useEffect (calculates duration)
      mockPerformanceNow.mockReturnValue(110); // 10ms later - fast render
      callbacks[1]();
      
      const stats = getPerformanceStats();
      expect(stats.slowRenders).toBe(0);
      expect(getSlowestRenders()).toHaveLength(0);
    });

    it('should calculate component statistics correctly', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      const durations = [10, 20, 30];
      
      durations.forEach((duration, i) => {
        // Clear callbacks for each component call
        callbacks.length = 0;
        mockRef.current = 0;
        mockPerformanceNow.mockReturnValue(100);
        
        useRenderTime('TestComponent');
        
        // Execute first useEffect (sets start time)
        callbacks[0]();
        expect(mockRef.current).toBe(100);
        
        // Execute second useEffect (calculates duration)
        mockPerformanceNow.mockReturnValue(100 + duration);
        callbacks[1]();
      });
      
      const stats = getPerformanceStats();
      expect(stats.componentStats.TestComponent).toEqual({
        avg: 20, // (10+20+30)/3 = 20
        max: 30,
        min: 10,
        count: 3,
      });
    });

    it('should round component stats to 2 decimal places', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      mockRef.current = 0;
      mockPerformanceNow.mockReturnValue(100);
      
      useRenderTime('PiComponent');
      
      // Execute first useEffect (sets start time)
      callbacks[0]();
      expect(mockRef.current).toBe(100);
      
      // Execute second useEffect (calculates duration)
      mockPerformanceNow.mockReturnValue(100 + Math.PI); // π ms duration
      callbacks[1]();
      
      const stats = getPerformanceStats();
      expect(stats.componentStats.PiComponent.avg).toBe(3.14);
      expect(stats.componentStats.PiComponent.max).toBe(3.14);
      expect(stats.componentStats.PiComponent.min).toBe(3.14);
    });

    it('should sort slowest renders by duration descending', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      const durations = [25, 50, 30]; // All > 16.67ms
      
      durations.forEach((duration, i) => {
        // Clear callbacks for each component call
        callbacks.length = 0;
        mockRef.current = 0;
        mockPerformanceNow.mockReturnValue(100);
        
        useRenderTime(`Component${i}`);
        
        // Execute first useEffect (sets start time)
        callbacks[0]();
        expect(mockRef.current).toBe(100);
        
        // Execute second useEffect (calculates duration)
        mockPerformanceNow.mockReturnValue(100 + duration);
        callbacks[1]();
      });
      
      const slowest = getSlowestRenders();
      expect(slowest[0].duration).toBe(50);
      expect(slowest[1].duration).toBe(30);
      expect(slowest[2].duration).toBe(25);
    });

    it('should limit recent renders to requested count', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      // Add 5 renders
      for (let i = 0; i < 5; i++) {
        // Clear callbacks for each component call
        callbacks.length = 0;
        mockRef.current = 0;
        mockPerformanceNow.mockReturnValue(100);
        
        useRenderTime(`Component${i}`);
        
        // Execute first useEffect (sets start time)
        callbacks[0]();
        expect(mockRef.current).toBe(100);
        
        // Execute second useEffect (calculates duration)
        mockPerformanceNow.mockReturnValue(110); // 10ms duration
        callbacks[1]();
      }
      
      const recent3 = getRecentRenders(3);
      expect(recent3).toHaveLength(3);
      
      const recent10 = getRecentRenders(10);
      expect(recent10).toHaveLength(5); // Only 5 total renders
    });

    it('should limit slowest renders to requested count', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      // Add 5 slow renders (>16.67ms)
      for (let i = 0; i < 5; i++) {
        // Clear callbacks for each component call
        callbacks.length = 0;
        mockRef.current = 0;
        mockPerformanceNow.mockReturnValue(100);
        
        useRenderTime(`Component${i}`);
        
        // Execute first useEffect (sets start time)
        callbacks[0]();
        expect(mockRef.current).toBe(100);
        
        // Execute second useEffect (calculates duration)
        mockPerformanceNow.mockReturnValue(100 + 20 + i); // 20-24ms
        callbacks[1]();
      }
      
      const slowest2 = getSlowestRenders(2);
      expect(slowest2).toHaveLength(2);
      expect(slowest2[0].duration).toBe(24); // Slowest
      expect(slowest2[1].duration).toBe(23); // Second slowest
    });

    it('should handle memory management (trimming after 1000 renders)', () => {
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });
      
      // Simulate adding 1001 renders to trigger memory management
      // Use a loop to efficiently add many renders and test the trimming behavior
      for (let i = 0; i < 1001; i++) {
        // Clear callbacks for each component call
        callbacks.length = 0;
        mockRef.current = 0;
        mockPerformanceNow.mockReturnValue(100);
        
        useRenderTime(`Component${i % 50}`); // Reuse component names to avoid memory issues
        
        // Execute first useEffect (sets start time)
        callbacks[0]();
        expect(mockRef.current).toBe(100);
        
        // Execute second useEffect (calculates duration)
        mockPerformanceNow.mockReturnValue(105); // 5ms duration
        callbacks[1]();
      }
      
      const stats = getPerformanceStats();
      // After adding 1001 renders, should be trimmed to 500 (last 500 renders)
      expect(stats.totalRenders).toBe(500);
      
      const recent = getRecentRenders(1000); // Request more than available
      expect(recent).toHaveLength(500); // Should return 500 (trimmed amount)
    });
  });

  describe('logPerformanceSummary with data', () => {
    beforeEach(() => {
      // Mock performance API
      const mockPerformanceNow = jest.fn();
      Object.defineProperty(global, 'performance', {
        value: { now: mockPerformanceNow },
        writable: true,
      });

      // Mock useRef and useEffect for data generation
      const mockRef = { current: 0 };
      mockUseRef.mockReturnValue(mockRef);
      
      const callbacks: Array<() => void> = [];
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });

      // Add sample performance data for ComponentA (20ms - slow)
      callbacks.length = 0;
      mockRef.current = 0;
      mockPerformanceNow.mockReturnValue(100);
      useRenderTime('ComponentA');
      callbacks[0](); // Set start time
      expect(mockRef.current).toBe(100);
      mockPerformanceNow.mockReturnValue(120);
      callbacks[1](); // Calculate duration (20ms)

      // Add sample performance data for ComponentB (50ms - very slow)
      callbacks.length = 0;
      mockRef.current = 0;
      mockPerformanceNow.mockReturnValue(200);
      useRenderTime('ComponentB');
      callbacks[0](); // Set start time
      expect(mockRef.current).toBe(200);
      mockPerformanceNow.mockReturnValue(250);
      callbacks[1](); // Calculate duration (50ms)

      // Add sample performance data for ComponentC (10ms - fast)
      callbacks.length = 0;
      mockRef.current = 0;
      mockPerformanceNow.mockReturnValue(300);
      useRenderTime('ComponentC');
      callbacks[0](); // Set start time
      expect(mockRef.current).toBe(300);
      mockPerformanceNow.mockReturnValue(310);
      callbacks[1](); // Calculate duration (10ms)
    });

    it('should log component stats when available', () => {
      logPerformanceSummary();
      
      expect(console.log).toHaveBeenCalledWith('\n--- Component Stats ---');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ComponentA: 1 renders, avg: 20ms, max: 20ms')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ComponentB: 1 renders, avg: 50ms, max: 50ms')
      );
    });

    it('should log slowest renders when available', () => {
      logPerformanceSummary();
      
      expect(console.log).toHaveBeenCalledWith('\n--- Slowest Renders ---');
      expect(console.log).toHaveBeenCalledWith('1. ComponentB: 50ms');
      expect(console.log).toHaveBeenCalledWith('2. ComponentA: 20ms');
      // ComponentC (10ms) should not appear as it's not slow enough
    });

    it('should show correct summary statistics', () => {
      logPerformanceSummary();
      
      expect(console.log).toHaveBeenCalledWith('Total renders: 3');
      expect(console.log).toHaveBeenCalledWith('Average render time: 26.67ms'); // (20+50+10)/3
      expect(console.log).toHaveBeenCalledWith('Slow renders: 2'); // Only 20ms and 50ms
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle zero duration renders', () => {
      const mockPerformanceNow = jest.fn();
      Object.defineProperty(global, 'performance', {
        value: { now: mockPerformanceNow },
        writable: true,
      });

      const mockRef = { current: 100 };
      mockUseRef.mockReturnValue(mockRef);
      mockUseEffect.mockImplementation((callback) => callback());

      mockPerformanceNow.mockReturnValue(100); // Same time = 0ms duration
      
      useRenderTime('ZeroComponent');
      
      const stats = getPerformanceStats();
      expect(stats.componentStats.ZeroComponent.avg).toBe(0);
      expect(stats.componentStats.ZeroComponent.min).toBe(0);
      expect(stats.componentStats.ZeroComponent.max).toBe(0);
    });

    it('should handle negative durations gracefully', () => {
      const callbacks: Array<() => void> = [];
      const mockPerformanceNow = jest.fn();
      Object.defineProperty(global, 'performance', {
        value: { now: mockPerformanceNow },
        writable: true,
      });

      const mockRef = { current: 0 };
      mockUseRef.mockReturnValue(mockRef);
      mockUseEffect.mockImplementation((callback) => {
        callbacks.push(callback);
        return undefined;
      });

      mockPerformanceNow.mockReturnValue(100);
      useRenderTime('NegativeComponent');
      
      // Execute first useEffect (sets start time)
      callbacks[0]();
      expect(mockRef.current).toBe(100);
      
      // Execute second useEffect with earlier time (negative duration)
      mockPerformanceNow.mockReturnValue(90); // Negative duration
      callbacks[1]();
      
      const stats = getPerformanceStats();
      expect(stats.componentStats.NegativeComponent.avg).toBe(-10);
      expect(stats.totalRenders).toBe(1);
    });

    it('should handle empty component names', () => {
      const mockPerformanceNow = jest.fn();
      Object.defineProperty(global, 'performance', {
        value: { now: mockPerformanceNow },
        writable: true,
      });

      const mockRef = { current: 100 };
      mockUseRef.mockReturnValue(mockRef);
      mockUseEffect.mockImplementation((callback) => callback());

      mockPerformanceNow.mockReturnValue(120);
      
      useRenderTime('');
      
      const stats = getPerformanceStats();
      expect(stats.componentStats['']).toBeDefined();
      expect(stats.componentStats[''].count).toBe(1);
    });
  });
});