/**
 * Performance monitoring for Ink UI
 * Tracks render times and provides optimization insights
 */

import { useRef, useEffect } from 'react';

interface RenderTime {
  componentName: string;
  duration: number;
  timestamp: number;
}

interface ComponentStats {
  avg: number;
  max: number;
  min: number;
  count: number;
}

interface PerformanceStats {
  totalRenders: number;
  avgRenderTime: number;
  slowRenders: number;
  componentStats: { [key: string]: ComponentStats };
  uptime: number;
}

/**
 * Performance metrics storage
 */
class PerformanceMetrics {
  private renderTimes: RenderTime[] = [];
  private componentRenders = new Map<string, number[]>();
  private slowRenders: RenderTime[] = [];
  private startTime = Date.now();

  addRenderTime(componentName: string, duration: number): void {
    this.renderTimes.push({ componentName, duration, timestamp: Date.now() });

    // Track per-component stats
    if (!this.componentRenders.has(componentName)) {
      this.componentRenders.set(componentName, []);
    }
    this.componentRenders.get(componentName)!.push(duration);

    // Track slow renders (> 16.67ms for 60fps)
    if (duration > 16.67) {
      this.slowRenders.push({ componentName, duration, timestamp: Date.now() });
    }

    // Keep only last 1000 renders in memory
    if (this.renderTimes.length > 1000) {
      this.renderTimes = this.renderTimes.slice(-500);
    }
  }

  getStats(): PerformanceStats {
    const totalRenders = this.renderTimes.length;
    const avgRenderTime = totalRenders > 0
      ? this.renderTimes.reduce((sum, r) => sum + r.duration, 0) / totalRenders
      : 0;

    const componentStats: { [key: string]: ComponentStats } = {};
    this.componentRenders.forEach((times, component) => {
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      componentStats[component] = {
        avg: Math.round(avg * 100) / 100,
        max: Math.round(max * 100) / 100,
        min: Math.round(min * 100) / 100,
        count: times.length,
      };
    });

    return {
      totalRenders,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      slowRenders: this.slowRenders.length,
      componentStats,
      uptime: Date.now() - this.startTime,
    };
  }

  getRecentRenders(count = 10): RenderTime[] {
    return this.renderTimes.slice(-count);
  }

  getSlowestRenders(count = 5): RenderTime[] {
    return [...this.slowRenders]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  clear(): void {
    this.renderTimes = [];
    this.componentRenders.clear();
    this.slowRenders = [];
    this.startTime = Date.now();
  }
}

// Global metrics instance
const globalMetrics = new PerformanceMetrics();

/**
 * Hook to measure component render time
 */
export function useRenderTime(componentName: string): void {
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    if (renderStartRef.current > 0) {
      const duration = performance.now() - renderStartRef.current;
      globalMetrics.addRenderTime(componentName, duration);
    }
  });
}

/**
 * Hook to track component mount/unmount cycles
 */
export function useComponentLifecycle(componentName: string): void {
  useEffect(() => {
    const mountTime = Date.now();
    console.debug(`[Performance] ${componentName} mounted`);

    return () => {
      const unmountTime = Date.now();
      const lifetime = unmountTime - mountTime;
      console.debug(`[Performance] ${componentName} unmounted after ${lifetime}ms`);
    };
  }, [componentName]);
}

/**
 * Get current performance stats
 */
export function getPerformanceStats(): PerformanceStats {
  return globalMetrics.getStats();
}

/**
 * Get recent render times
 */
export function getRecentRenders(count = 10): RenderTime[] {
  return globalMetrics.getRecentRenders(count);
}

/**
 * Get slowest renders
 */
export function getSlowestRenders(count = 5): RenderTime[] {
  return globalMetrics.getSlowestRenders(count);
}

/**
 * Clear all performance data
 */
export function clearPerformanceData(): void {
  globalMetrics.clear();
}

/**
 * Log performance summary to console
 */
export function logPerformanceSummary(): void {
  const stats = globalMetrics.getStats();
  
  console.log('\n=== Performance Summary ===');
  console.log(`Total renders: ${stats.totalRenders}`);
  console.log(`Average render time: ${stats.avgRenderTime}ms`);
  console.log(`Slow renders: ${stats.slowRenders}`);
  console.log(`Uptime: ${Math.round(stats.uptime / 1000)}s`);
  
  if (Object.keys(stats.componentStats).length > 0) {
    console.log('\n--- Component Stats ---');
    Object.entries(stats.componentStats).forEach(([name, stats]) => {
      console.log(`${name}: ${stats.count} renders, avg: ${stats.avg}ms, max: ${stats.max}ms`);
    });
  }
  
  const slowest = globalMetrics.getSlowestRenders(3);
  if (slowest.length > 0) {
    console.log('\n--- Slowest Renders ---');
    slowest.forEach((render, i) => {
      console.log(`${i + 1}. ${render.componentName}: ${render.duration}ms`);
    });
  }
  
  console.log('==========================\n');
}