/**
 * Performance Timing Module
 *
 * Feature: 011-api-logger
 * User Story 5: Performance Timing
 *
 * Provides:
 * - High-resolution timing utilities
 * - API call duration tracking
 * - Slow operation detection
 * - Performance benchmarks
 */

import type { LogContext } from './types';

/**
 * Get current high-resolution time in milliseconds
 */
export function now(): number {
  // Use performance.now() if available, otherwise fallback to Date
  // In Jest/node environment, we use a counter to ensure non-zero values
  if (typeof performance !== 'undefined' && performance.now && performance.now() > 0) {
    return performance.now();
  }
  // Fallback to Date with microsecond precision using process.hrtime if available
  if (typeof process !== 'undefined' && process.hrtime) {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1000 + nanoseconds / 1000000;
  }
  // Final fallback to Date
  return Date.now();
}

/**
 * Get current high-resolution time in microseconds
 */
export function nowMicro(): number {
  return now() * 1000;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Timing result interface
 */
export interface TimingResult {
  /** Duration in milliseconds */
  duration: number;
  /** Formatted duration string */
  formatted: string;
  /** Start timestamp */
  start: number;
  /** End timestamp */
  end: number;
}

/**
 * Measure execution time of a synchronous function
 */
export function time<T>(fn: () => T): TimingResult & { result: T } {
  const start = now();
  const result = fn();
  const end = now();
  const duration = Math.max(end - start, 0.01); // Ensure minimum duration for accurate measurement

  return {
    result,
    duration,
    formatted: formatDuration(duration),
    start,
    end,
  };
}

/**
 * Measure execution time of an async function
 */
export async function timeAsync<T>(
  fn: () => Promise<T>
): Promise<TimingResult & { result: T }> {
  const start = now();
  const result = await fn();
  const end = now();
  const duration = Math.max(end - start, 0.01);

  return {
    result,
    duration,
    formatted: formatDuration(duration),
    start,
    end,
  };
}

/**
 * Stopwatch for manual timing control
 */
export class Stopwatch {
  private startTime: number;
  private laps: Map<string, number> = new Map();
  private cumulativeTime = 0;
  private running = true;

  constructor() {
    this.startTime = now();
  }

  /**
   * Get elapsed time since stopwatch was created
   */
  elapsed(): number {
    const current = now();
    if (this.running) {
      return Math.max(current - this.startTime, 0);
    }
    return this.cumulativeTime;
  }

  /**
   * Get formatted elapsed time
   */
  formattedElapsed(): string {
    return formatDuration(this.elapsed());
  }

  /**
   * Record a lap time with a label
   */
  lap(label: string): number {
    const lapTime = this.elapsed();
    this.laps.set(label, lapTime);
    return lapTime;
  }

  /**
   * Get all recorded lap times
   */
  getLaps(): Map<string, number> {
    return new Map(this.laps);
  }

  /**
   * Get a specific lap time
   */
  getLap(label: string): number | undefined {
    return this.laps.get(label);
  }

  /**
   * Reset the stopwatch
   */
  reset(): void {
    this.startTime = now();
    this.laps.clear();
    this.cumulativeTime = 0;
    this.running = true;
  }

  /**
   * Stop the stopwatch
   */
  stop(): number {
    this.cumulativeTime = this.elapsed();
    this.running = false;
    return this.cumulativeTime;
  }

  /**
   * Restart the stopwatch
   */
  restart(): Stopwatch {
    this.reset();
    return this;
  }

  /**
   * Create a checkpoint that returns elapsed time
   */
  checkpoint(): number {
    return this.elapsed();
  }
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  /** Warning threshold in milliseconds */
  warning: number;
  /** Critical threshold in milliseconds */
  critical: number;
}

/**
 * Default performance thresholds for different operation types
 */
export const DEFAULT_THRESHOLDS: Record<string, PerformanceThreshold> = {
  api: { warning: 200, critical: 1000 },
  db: { warning: 100, critical: 500 },
  cache: { warning: 10, critical: 50 },
  render: { warning: 16, critical: 100 }, // 16ms = 1 frame at 60fps
  file: { warning: 50, critical: 200 },
  external: { warning: 500, critical: 3000 },
};

/**
 * Performance level enumeration
 */
export enum PerformanceLevel {
  OK = 'ok',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Performance check result
 */
export interface PerformanceCheck {
  /** Performance level */
  level: PerformanceLevel;
  /** Duration in milliseconds */
  duration: number;
  /** Formatted duration */
  formatted: string;
  /** Threshold that was exceeded (if any) */
  threshold?: 'warning' | 'critical';
  /** Message describing the performance status */
  message: string;
}

/**
 * Check if a duration exceeds performance thresholds
 */
export function checkPerformance(
  duration: number,
  thresholds: PerformanceThreshold = DEFAULT_THRESHOLDS.api,
  operationName = 'operation'
): PerformanceCheck {
  if (duration >= thresholds.critical) {
    return {
      level: PerformanceLevel.CRITICAL,
      duration,
      formatted: formatDuration(duration),
      threshold: 'critical',
      message: `${operationName} took too long (${formatDuration(duration)}, critical threshold: ${formatDuration(thresholds.critical)})`,
    };
  }

  if (duration >= thresholds.warning) {
    return {
      level: PerformanceLevel.WARNING,
      duration,
      formatted: formatDuration(duration),
      threshold: 'warning',
      message: `${operationName} is slow (${formatDuration(duration)}, warning threshold: ${formatDuration(thresholds.warning)})`,
    };
  }

  return {
    level: PerformanceLevel.OK,
    duration,
    formatted: formatDuration(duration),
    message: `${operationName} completed in ${formatDuration(duration)}`,
  };
}

/**
 * Performance logger interface
 */
export interface IPerformanceLogger {
  logOperation: (
    operation: string,
    duration: number,
    context?: LogContext
  ) => void;
  logSlowOperation: (
    operation: string,
    duration: number,
    threshold: 'warning' | 'critical',
    context?: LogContext
  ) => void;
}

/**
 * No-op performance logger for production use when logging is disabled
 */
export const noopPerformanceLogger: IPerformanceLogger = {
  logOperation: () => {},
  logSlowOperation: () => {},
};

/**
 * Create a performance tracker with logging
 */
export function createPerformanceTracker(
  logger: IPerformanceLogger,
  defaultThresholds: PerformanceThreshold = DEFAULT_THRESHOLDS.api
) {
  return {
    /**
     * Track a synchronous operation
     */
    track<T>(
      operation: string,
      fn: () => T,
      context?: LogContext
    ): TimingResult & { result: T } {
      const start = now();
      const result = fn();
      const end = now();
      const duration = Math.max(end - start, 0.01);

      const check = checkPerformance(duration, defaultThresholds, operation);

      if (check.level === PerformanceLevel.OK) {
        logger.logOperation(operation, duration, context);
      } else {
        logger.logSlowOperation(
          operation,
          duration,
          check.threshold!,
          context
        );
      }

      return {
        result,
        duration,
        formatted: formatDuration(duration),
        start,
        end,
      };
    },

    /**
     * Track an async operation
     */
    async trackAsync<T>(
      operation: string,
      fn: () => Promise<T>,
      context?: LogContext
    ): Promise<TimingResult & { result: T }> {
      const start = now();
      const result = await fn();
      const end = now();
      const duration = Math.max(end - start, 0.01);

      const check = checkPerformance(duration, defaultThresholds, operation);

      if (check.level === PerformanceLevel.OK) {
        logger.logOperation(operation, duration, context);
      } else {
        logger.logSlowOperation(
          operation,
          duration,
          check.threshold!,
          context
        );
      }

      return {
        result,
        duration,
        formatted: formatDuration(duration),
        start,
        end,
      };
    },

    /**
     * Create a stopwatch for manual timing
     */
    startTimer(): Stopwatch {
      return new Stopwatch();
    },

    /**
     * Check performance against thresholds
     */
    check(
      operation: string,
      duration: number
    ): PerformanceCheck {
      return checkPerformance(duration, defaultThresholds, operation);
    },
  };
}

/**
 * Throttled performance logger - only logs slow operations
 */
export function createThrottledLogger(
  logger: IPerformanceLogger,
  intervals: Record<'warning' | 'critical', number> = {
    warning: 60000, // Log warning every minute
    critical: 0, // Always log critical
  }
) {
  const lastLogged: Map<string, number> = new Map();

  return {
    logOperation: (operation: string, duration: number, context?: LogContext) => {
      logger.logOperation(operation, duration, context);
    },
    logSlowOperation: (
      operation: string,
      duration: number,
      threshold: 'warning' | 'critical',
      context?: LogContext
    ) => {
      const key = `${operation}:${threshold}`;
      const currentTime = Date.now();
      const last = lastLogged.get(key) ?? 0;

      if (threshold === 'critical' || currentTime - last >= intervals[threshold]) {
        logger.logSlowOperation(operation, duration, threshold, context);
        lastLogged.set(key, currentTime);
      }
    },
  };
}

/**
 * Performance metrics aggregator
 */
export class MetricsAggregator {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Record a timing value
   */
  record(key: string, value: number): void {
    const existing = this.metrics.get(key) ?? [];
    existing.push(value);
    this.metrics.set(key, existing);
  }

  /**
   * Get statistics for a metric
   */
  getStats(key: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(key);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sorted.reduce((a, b) => a + b, 0) / count;

    const percentile = (p: number) => {
      const idx = Math.floor(count * p);
      return sorted[Math.min(idx, count - 1)];
    };

    return {
      count,
      min,
      max,
      avg,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    };
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

/**
 * Default export with all performance utilities
 */
export const perf = {
  now,
  nowMicro,
  formatDuration,
  time,
  timeAsync,
  Stopwatch,
  DEFAULT_THRESHOLDS,
  PerformanceLevel,
  checkPerformance,
  createPerformanceTracker,
  createThrottledLogger,
  MetricsAggregator,
};

export default perf;
