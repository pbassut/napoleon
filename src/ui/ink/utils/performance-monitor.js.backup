/**
 * Performance monitoring for Ink UI
 * Tracks render times and provides optimization insights
 */

const { useRef, useEffect } = require('react');

/**
 * Performance metrics storage
 */
class PerformanceMetrics {
  constructor() {
    this.renderTimes = [];
    this.componentRenders = new Map();
    this.slowRenders = [];
    this.startTime = Date.now();
  }

  addRenderTime(componentName, duration) {
    this.renderTimes.push({ componentName, duration, timestamp: Date.now() });

    // Track per-component stats
    if (!this.componentRenders.has(componentName)) {
      this.componentRenders.set(componentName, []);
    }
    this.componentRenders.get(componentName).push(duration);

    // Track slow renders (> 16.67ms for 60fps)
    if (duration > 16.67) {
      this.slowRenders.push({ componentName, duration, timestamp: Date.now() });
    }

    // Keep only last 1000 renders in memory
    if (this.renderTimes.length > 1000) {
      this.renderTimes = this.renderTimes.slice(-500);
    }
  }

  getStats() {
    const totalRenders = this.renderTimes.length;
    const avgRenderTime = totalRenders > 0
      ? this.renderTimes.reduce((sum, r) => sum + r.duration, 0) / totalRenders
      : 0;

    const componentStats = {};
    this.componentRenders.forEach((times, component) => {
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      componentStats[component] = {
        avg, max, min, count: times.length,
      };
    });

    return {
      totalRenders,
      avgRenderTime,
      slowRenderCount: this.slowRenders.length,
      uptime: Date.now() - this.startTime,
      componentStats,
      recentSlowRenders: this.slowRenders.slice(-10),
    };
  }

  reset() {
    this.renderTimes = [];
    this.componentRenders.clear();
    this.slowRenders = [];
    this.startTime = Date.now();
  }
}

// Global metrics instance
const globalMetrics = new PerformanceMetrics();

/**
 * Hook to monitor component render performance
 * @param {string} componentName - Name of the component
 * @param {Object} options - Monitoring options
 */
function usePerformanceMonitor(componentName, options = {}) {
  const renderStartRef = useRef();
  const {
    warnThreshold = 16.67, // Default to 60fps threshold
    logSlow = false,
    disabled = false,
  } = options;

  useEffect(() => {
    if (disabled) return;

    // Record render start time
    renderStartRef.current = performance.now();

    return () => {
      // Calculate render duration
      const duration = performance.now() - renderStartRef.current;
      globalMetrics.addRenderTime(componentName, duration);

      // Log slow renders if enabled
      if (logSlow && duration > warnThreshold) {
        console.warn(`[Performance] Slow render in ${componentName}: ${duration.toFixed(2)}ms`);
      }
    };
  });

  return {
    getStats: () => globalMetrics.getStats(),
    reset: () => globalMetrics.reset(),
  };
}

/**
 * Hook to track specific operations
 * @param {string} operationName - Name of the operation
 */
function useOperationTimer(operationName) {
  const startTimeRef = useRef();

  const startTimer = () => {
    startTimeRef.current = performance.now();
  };

  const endTimer = () => {
    if (!startTimeRef.current) return;

    const duration = performance.now() - startTimeRef.current;
    console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);

    if (duration > 100) {
      console.warn(`[Performance] Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  };

  return { startTimer, endTimer };
}

/**
 * Debounce function optimized for terminal rendering
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 */
function debounceRender(func, wait = 16) {
  let timeout;
  let lastCall = 0;

  return function debounced(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // If called too frequently, debounce
    if (timeSinceLastCall < wait) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, args);
      }, wait - timeSinceLastCall);
    } else {
      // Execute immediately
      lastCall = now;
      func.apply(this, args);
    }
  };
}

/**
 * Request animation frame polyfill for terminal
 */
const terminalRAF = (() => {
  let lastTime = 0;

  return (callback) => {
    const currentTime = Date.now();
    const timeToCall = Math.max(0, 16 - (currentTime - lastTime));

    const id = setTimeout(() => {
      callback(currentTime + timeToCall);
    }, timeToCall);

    lastTime = currentTime + timeToCall;
    return id;
  };
})();

/**
 * Get performance report
 */
function getPerformanceReport() {
  const stats = globalMetrics.getStats();
  const report = [];

  report.push('Napoleon UI Performance Report');
  report.push('=============================');
  report.push(`Total Renders: ${stats.totalRenders}`);
  report.push(`Average Render Time: ${stats.avgRenderTime.toFixed(2)}ms`);
  report.push(`Slow Renders (>16.67ms): ${stats.slowRenderCount}`);
  report.push(`Uptime: ${(stats.uptime / 1000).toFixed(1)}s`);
  report.push('');

  report.push('Component Performance:');
  Object.entries(stats.componentStats).forEach(([component, data]) => {
    report.push(`  ${component}:`);
    report.push(`    Renders: ${data.count}`);
    report.push(`    Avg: ${data.avg.toFixed(2)}ms`);
    report.push(`    Max: ${data.max.toFixed(2)}ms`);
    report.push(`    Min: ${data.min.toFixed(2)}ms`);
  });

  if (stats.recentSlowRenders.length > 0) {
    report.push('');
    report.push('Recent Slow Renders:');
    stats.recentSlowRenders.forEach((render) => {
      const time = new Date(render.timestamp).toLocaleTimeString();
      report.push(`  ${time} - ${render.componentName}: ${render.duration.toFixed(2)}ms`);
    });
  }

  return report.join('\n');
}

module.exports = {
  usePerformanceMonitor,
  useOperationTimer,
  debounceRender,
  terminalRAF,
  getPerformanceReport,
  globalMetrics,
};
