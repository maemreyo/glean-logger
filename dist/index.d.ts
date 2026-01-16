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
 * API request context for logging
 */
interface ApiRequestContext {
    /** Unique request identifier (UUID v4) */
    requestId: string;
    /** HTTP method (GET, POST, PUT, DELETE, etc.) */
    method: string;
    /** Request URL */
    url: string;
    /** Request headers (will be redacted for sensitive values) */
    headers?: Record<string, string>;
    /** Request body (will be redacted for sensitive values) */
    body?: unknown;
    /** ISO 8601 timestamp when request was made */
    timestamp: string;
}
/**
 * API response context for logging
 */
interface ApiResponseContext {
    /** Links to the corresponding ApiRequestContext */
    requestId: string;
    /** HTTP method from the original request */
    method: string;
    /** URL from the original request */
    url: string;
    /** HTTP status code */
    statusCode?: number;
    /** Request duration in milliseconds */
    duration: number;
    /** Response body (may be truncated) */
    body?: unknown;
    /** ISO 8601 timestamp when response was received */
    timestamp: string;
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
 * Server-side Winston-based logger interface
 */
interface IServerLogger {
    /** Log a debug message */
    debug(message: string, context?: LogContext): void;
    /** Log an informational message */
    info(message: string, context?: LogContext): void;
    /** Log a warning message */
    warn(message: string, context?: LogContext): void;
    /** Log an error message */
    error(message: string, context?: LogContext): void;
    /** Log a fatal error message */
    fatal(message: string, context?: LogContext): void;
    /** Create a child logger with persistent context */
    child(context: LogContext): IServerLogger;
    /** Add custom fields to all subsequent logs */
    with(context: LogContext): IServerLogger;
}
/**
 * API request/response logging interface
 */
interface IApiLogger {
    /** Log an API request */
    logRequest(context: ApiRequestContext): void;
    /** Log an API response */
    logResponse(context: ApiResponseContext): void;
    /** Log an API error */
    logError(error: Error, context?: LogContext): void;
}
/**
 * Content type filter configuration
 */
interface ContentTypeFilter {
    /** Array of content type patterns to include (wildcards supported) */
    include?: string[];
    /** Array of content type patterns to exclude (wildcards supported) */
    exclude?: string[];
}
/**
 * Redaction pattern for sensitive data detection
 */
interface RedactionPattern {
    /** Pattern name (e.g., 'SSN', 'CreditCard') - optional for inline patterns */
    name?: string;
    /** Regex pattern to match sensitive values */
    pattern: RegExp;
    /** Replacement text */
    replacement: string;
    /** Field names to apply this pattern to (if specified, only matches these keys) */
    fieldNames?: string[];
}
/**
 * Sampling configuration for high-traffic endpoints
 */
interface SamplingConfig {
    /** Sample rate between 0 and 1 (0.1 = 10% of requests) */
    rate: number;
    /** URLs or URL patterns to apply sampling to */
    patterns?: string[];
}
/**
 * Body logging configuration - comprehensive control over response body logging
 */
interface BodyLoggingConfig {
    /** Enable/disable response body logging (default: true) */
    enabled: boolean;
    /** Maximum body size in bytes (default: 10KB) */
    maxSize: number;
    /** Timeout for reading response body in ms (default: 5000ms) */
    readTimeout: number;
    /** Content type filter configuration */
    contentTypeFilter: ContentTypeFilter;
    /** Redaction patterns for sensitive data */
    redactionPatterns: RedactionPattern[];
    /** Sensitive field names to redact (case-insensitive) */
    sensitiveFields: string[];
    /** Sensitive header names to redact (case-insensitive) */
    sensitiveHeaders: string[];
    /** Sampling configuration for high-traffic endpoints */
    sampling?: SamplingConfig;
    /** Status codes to skip body logging (default: [204, 304]) */
    skipStatusCodes: number[];
    /** Enable verbose logging for debugging (default: false) */
    verbose: boolean;
    /** Maximum nesting depth for response body logging (default: 10) */
    maxDepth?: number;
}
/**
 * Options for createLoggedFetch function
 */
interface LoggedFetchOptions {
    logger?: IApiLogger;
    enabled?: boolean;
    redactHeaders?: boolean;
    redactBody?: boolean;
    bodyLoggingConfig?: BodyLoggingConfig;
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
 * Builder class for BodyLoggingConfig with fluent API
 */
declare class ApiLoggerBuilder {
    private config;
    /**
     * Create a new builder instance
     */
    constructor(initialConfig?: Partial<BodyLoggingConfig>);
    /**
     * Enable or disable body logging
     */
    enabled(enabled: boolean): this;
    /**
     * Set maximum body size (accepts bytes or string like "10kb", "1mb")
     */
    maxSize(size: number | string): this;
    /**
     * Set read timeout (accepts ms or string like "5s", "5000ms")
     */
    readTimeout(timeout: number | string): this;
    /**
     * Add content type patterns to exclude
     */
    excludeContentTypes(...patterns: string[]): this;
    /**
     * Add content type patterns to include
     */
    includeContentTypes(...patterns: string[]): this;
    /**
     * Add a custom redaction pattern
     */
    addRedactionPattern(pattern: RegExp, replacement: string, fieldNames?: string[]): this;
    /**
     * Add sensitive field names to redact
     */
    addSensitiveFields(...fields: string[]): this;
    /**
     * Add sensitive header names to redact
     */
    addSensitiveHeaders(...headers: string[]): this;
    /**
     * Configure sampling for high-traffic endpoints
     */
    sampling(rate: number, patterns?: string[]): this;
    /**
     * Add status codes to skip body logging
     */
    skipStatusCodes(...codes: number[]): this;
    /**
     * Enable or disable verbose logging
     */
    verbose(enabled: boolean): this;
    /**
     * Set maximum nesting depth for response body logging
     * Prevents stack overflow from deeply nested objects
     *
     * @param depth - Maximum depth (1-100, default: 10)
     */
    maxDepth(depth: number): this;
    /**
     * Basic preset - just works with sensible defaults for most use cases.
     *
     * Includes:
     * - Body logging enabled
     * - 10KB max size, 5s timeout
     * - Binary content types excluded
     * - Common sensitive fields redacted
     * - Verbose in development
     *
     * @example
     * ```typescript
     * const config = new ApiLoggerBuilder().basic().build();
     * ```
     */
    basic(): this;
    /**
     * Production preset - security and performance optimized for production use.
     *
     * Includes:
     * - Smaller 5KB max size for reduced overhead
     * - 3s timeout for faster failure detection
     * - Comprehensive redaction patterns (SSN, credit cards, Bearer tokens)
     * - Extended sensitive fields and headers redacted
     * - Never verbose in production
     * - Shallower 5-level depth for performance
     *
     * @example
     * ```typescript
     * const config = new ApiLoggerBuilder().production().build();
     * ```
     */
    production(): this;
    /**
     * Development preset - verbose logging for debugging and development.
     *
     * Includes:
     * - Larger 50KB max size for comprehensive debugging
     * - 10s timeout for slower development environments
     * - Fewer content exclusions for full visibility
     * - Basic sensitive field redaction
     * - Always verbose in development
     * - Deeper 20-level depth for complex object debugging
     *
     * @example
     * ```typescript
     * const config = new ApiLoggerBuilder().development().build();
     * ```
     */
    development(): this;
    /**
     * Minimal preset - maximum performance with minimal logging overhead.
     *
     * Includes:
     * - Body logging disabled (only metadata logged)
     * - Very small 1KB limit
     * - 1s timeout for fast failure detection
     * - Extensive content exclusions
     * - Skips all success status codes
     * - Never verbose
     * - Shallow 3-level depth
     *
     * @example
     * ```typescript
     * const config = new ApiLoggerBuilder().minimal().build();
     * ```
     */
    minimal(): this;
    /**
     * Load configuration from environment variables
     */
    fromEnv(prefix?: string): this;
    /**
     * Build the final configuration by merging with defaults
     * Validates the configuration before returning
     */
    build(): BodyLoggingConfig;
    /**
     * Validate the configuration
     */
    private validate;
}
/**
 * Create API logger instance
 */
declare function createApiLogger(options?: {
    name?: string;
}): IApiLogger;
/**
 * Create a logged fetch function with automatic request/response logging
 * Supports BodyLoggingConfig via builder pattern
 */
declare function createLoggedFetch(options?: LoggedFetchOptions): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

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
 * Create a logger instance
 * - In browser: returns browser logger (console + localStorage)
 * - In server: returns Winston logger (file rotation with daily logs)
 *
 * @param options - Logger configuration
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * // Simple usage
 * const log = logger();
 * log.info('Hello');
 *
 * // With options
 * const apiLog = logger({ name: 'api', level: 'debug' });
 * apiLog.info('API request', { endpoint: '/users' });
 * ```
 */
declare function logger(options?: {
    name?: string;
    level?: LogLevel;
}): IBrowserLogger | IServerLogger;
/**
 * Create a child logger with persistent context
 * Only available in server environment (Winston feature)
 *
 * @param context - Context to attach to all subsequent logs
 * @returns Child logger instance
 *
 * @example
 * ```typescript
 * import { child } from '@/lib/logger';
 *
 * const apiLog = child({ module: 'api', version: '1.0' });
 * apiLog.info('Request received'); // Logs with module, version context
 * ```
 */
declare function child(context: LogContext): IServerLogger | null;
/**
 * Create a logged fetch wrapper for API calls
 * Automatically logs request/response with timing and redaction
 *
 * @param options - Configuration options
 * @returns Wrapped fetch function
 *
 * @example
 * ```typescript
 * import { loggedFetch } from '@/lib/logger';
 *
 * const fetch = loggedFetch();
 * const response = await fetch('/api/users');
 * // Automatically logs: request, response, duration, status
 * ```
 */
declare function loggedFetch(options?: {
    enabled?: boolean;
    redactHeaders?: boolean;
    redactBody?: boolean;
}): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
/**
 * Time an async operation and return result with duration
 * Works in both browser and server environments
 *
 * @param label - Operation name for logging
 * @param fn - Async function to time
 * @returns Promise resolving with result and duration in milliseconds
 *
 * @example
 * ```typescript
 * import { measure } from '@/lib/logger';
 *
 * const { result, duration } = await measure('fetch-users', async () => {
 *   return await fetch('/api/users');
 * });
 * console.log(`Completed in ${duration}ms`);
 * ```
 */
declare function measure<T>(label: string, fn: () => Promise<T>): Promise<{
    result: T;
    duration: number;
}>;

export { ApiLoggerBuilder, type BodyLoggingConfig, child, createApiLogger, createLoggedFetch, loggedFetch, logger, measure, perf as performance };
