/**
 * MIT License
 *
 * Copyright (c) 2026 Zaob <zaob.ogn@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * Type definitions for API Logger Integration
 *
 * Feature: 011-api-logger
 * This file contains all TypeScript interfaces and types used across
 * browser logging, server logging, and API logging components.
 */
/**
 * Log level enumeration
 * Priority order: debug < info < warn < error < fatal
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
/**
 * Log context - arbitrary key-value metadata attached to log entries
 */
interface LogContext {
    [key: string]: string | number | boolean | object | null | undefined;
}
/**
 * Browser log entry stored in localStorage
 */
interface BrowserLogEntry {
    /** Unique identifier (UUID v4) */
    id: string;
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Log severity level */
    level: LogLevel;
    /** Primary log message */
    message: string;
    /** Additional metadata */
    context?: LogContext;
}
/**
 * Browser-safe logger interface for client-side and SSR logging
 */
interface IBrowserLogger {
    /** Log a debug message */
    debug(message: string, context?: LogContext): void;
    /** Log an informational message */
    info(message: string, context?: LogContext): void;
    /** Log a warning message */
    warn(message: string, context?: LogContext): void;
    /** Log an error message */
    error(message: string, context?: LogContext): void;
    /** Get all stored logs from localStorage */
    getStoredLogs(): BrowserLogEntry[];
    /** Clear all stored logs from localStorage */
    clearStoredLogs(): void;
    /** Flush browser logs to server endpoint (if available) */
    flush(): Promise<void>;
}

/**
 * MIT License
 *
 * Copyright (c) 2026 Zaob <zaob.ogn@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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

/**
 * Get current high-resolution time in milliseconds
 */
declare function now(): number;
/**
 * Get current high-resolution time in microseconds
 */
declare function nowMicro(): number;
/**
 * Format duration in human-readable format
 */
declare function formatDuration(ms: number): string;
/**
 * Timing result interface
 */
interface TimingResult {
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
declare function time<T>(fn: () => T): TimingResult & {
    result: T;
};
/**
 * Measure execution time of an async function
 */
declare function timeAsync<T>(fn: () => Promise<T>): Promise<TimingResult & {
    result: T;
}>;
/**
 * Stopwatch for manual timing control
 */
declare class Stopwatch {
    private startTime;
    private laps;
    private cumulativeTime;
    private running;
    constructor();
    /**
     * Get elapsed time since stopwatch was created
     */
    elapsed(): number;
    /**
     * Get formatted elapsed time
     */
    formattedElapsed(): string;
    /**
     * Record a lap time with a label
     */
    lap(label: string): number;
    /**
     * Get all recorded lap times
     */
    getLaps(): Map<string, number>;
    /**
     * Get a specific lap time
     */
    getLap(label: string): number | undefined;
    /**
     * Reset the stopwatch
     */
    reset(): void;
    /**
     * Stop the stopwatch
     */
    stop(): number;
    /**
     * Restart the stopwatch
     */
    restart(): Stopwatch;
    /**
     * Create a checkpoint that returns elapsed time
     */
    checkpoint(): number;
}
/**
 * Performance threshold configuration
 */
interface PerformanceThreshold {
    /** Warning threshold in milliseconds */
    warning: number;
    /** Critical threshold in milliseconds */
    critical: number;
}
/**
 * Performance level enumeration
 */
declare enum PerformanceLevel {
    OK = "ok",
    WARNING = "warning",
    CRITICAL = "critical"
}
/**
 * Performance check result
 */
interface PerformanceCheck {
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
declare function checkPerformance(duration: number, thresholds?: PerformanceThreshold, operationName?: string): PerformanceCheck;
/**
 * Performance logger interface
 */
interface IPerformanceLogger {
    logOperation: (operation: string, duration: number, context?: LogContext) => void;
    logSlowOperation: (operation: string, duration: number, threshold: 'warning' | 'critical', context?: LogContext) => void;
}
/**
 * Create a performance tracker with logging
 */
declare function createPerformanceTracker(logger: IPerformanceLogger, defaultThresholds?: PerformanceThreshold): {
    /**
     * Track a synchronous operation
     */
    track<T>(operation: string, fn: () => T, context?: LogContext): TimingResult & {
        result: T;
    };
    /**
     * Track an async operation
     */
    trackAsync<T>(operation: string, fn: () => Promise<T>, context?: LogContext): Promise<TimingResult & {
        result: T;
    }>;
    /**
     * Create a stopwatch for manual timing
     */
    startTimer(): Stopwatch;
    /**
     * Check performance against thresholds
     */
    check(operation: string, duration: number): PerformanceCheck;
};
/**
 * Throttled performance logger - only logs slow operations
 */
declare function createThrottledLogger(logger: IPerformanceLogger, intervals?: Record<'warning' | 'critical', number>): {
    logOperation: (operation: string, duration: number, context?: LogContext) => void;
    logSlowOperation: (operation: string, duration: number, threshold: "warning" | "critical", context?: LogContext) => void;
};
/**
 * Performance metrics aggregator
 */
declare class MetricsAggregator {
    private metrics;
    /**
     * Record a timing value
     */
    record(key: string, value: number): void;
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
    } | null;
    /**
     * Get all metric names
     */
    getMetricNames(): string[];
    /**
     * Clear all metrics
     */
    clear(): void;
}
/**
 * Default export with all performance utilities
 */
declare const perf: {
    now: typeof now;
    nowMicro: typeof nowMicro;
    formatDuration: typeof formatDuration;
    time: typeof time;
    timeAsync: typeof timeAsync;
    Stopwatch: typeof Stopwatch;
    DEFAULT_THRESHOLDS: Record<string, PerformanceThreshold>;
    PerformanceLevel: typeof PerformanceLevel;
    checkPerformance: typeof checkPerformance;
    createPerformanceTracker: typeof createPerformanceTracker;
    createThrottledLogger: typeof createThrottledLogger;
    MetricsAggregator: typeof MetricsAggregator;
};

/**
 * MIT License
 *
 * Copyright (c) 2026 Zaob <zaob.ogn@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Create a browser logger instance
 */
declare function logger(options?: {
    name?: string;
    level?: LogLevel;
}): IBrowserLogger;
/**
 * Time an async operation (browser version)
 */
declare function measure<T>(label: string, fn: () => Promise<T>): Promise<{
    result: T;
    duration: number;
}>;

export { type IBrowserLogger, type LogContext, type LogLevel, logger, measure, perf as performance };
