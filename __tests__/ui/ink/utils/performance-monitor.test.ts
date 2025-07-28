/**
 * Tests for performance monitoring utilities
 * Note: Only testing non-React hook functions to avoid testing library dependencies
 */
import {
  getPerformanceStats,
  getRecentRenders,
  getSlowestRenders,
  clearPerformanceData,
  logPerformanceSummary,
} from '../../../../src/ui/ink/utils/performance-monitor';

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
});