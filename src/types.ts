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
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Check if a string is a valid LogLevel
 */
export function isLogLevel(value: string): value is LogLevel {
  return ['debug', 'info', 'warn', 'error', 'fatal'].includes(value);
}

/**
 * Get numeric priority for a log level
 */
export function getLogLevelPriority(level: LogLevel): number {
  const priorities: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };
  return priorities[level];
}

/**
 * Log context - arbitrary key-value metadata attached to log entries
 */
export interface LogContext {
  [key: string]: string | number | boolean | object | null | undefined;
}

/**
 * Browser log entry stored in localStorage
 */
export interface BrowserLogEntry {
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
 * Structure stored in localStorage
 */
export interface StoredLogs {
  /** Array of log entries */
  entries: BrowserLogEntry[];
  /** Last update timestamp */
  lastUpdated: number;
  /** Storage version for future migrations */
  version: number;
}

/**
 * API request context for logging
 */
export interface ApiRequestContext {
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
export interface ApiResponseContext {
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
 * Configuration for logger behavior
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Enable/disable logging globally */
  enabled: boolean;
  /** Enable automatic sensitive data redaction */
  redactSensitive: boolean;
  /** Include stack traces for errors */
  includeStackTrace: boolean;
  /** Maximum file size in bytes (for file rotation) */
  maxFileSize: number;
  /** Maximum number of days to retain logs */
  maxFiles: number;
  /** Log directory path */
  logDir: string;
  /** Use JSON format in production */
  jsonFormat: boolean;
  /** Use colored/development format in development */
  developmentFormat: boolean;
}

/**
 * Logger factory options
 */
export interface LoggerFactoryOptions {
  /** Minimum log level to output */
  level: LogLevel;
  /** Enable/disable logging globally */
  enabled: boolean;
  /** Enable automatic sensitive data redaction */
  redactSensitive: boolean;
  /** Include stack traces for errors */
  includeStackTrace: boolean;
  /** Maximum file size in bytes (for file rotation) */
  maxFileSize: number;
  /** Maximum number of days to retain logs */
  maxFiles: number;
  /** Log directory path */
  logDir: string;
  /** Use JSON format in production */
  jsonFormat: boolean;
  /** Use colored/development format in development */
  developmentFormat: boolean;
}

/**
 * Performance timer for measuring operation duration
 */
export interface PerformanceTimer {
  /** Unique identifier for the timer */
  label: string;
  /** Unix timestamp when started */
  startTime: number;
  /** Unix timestamp when ended (set when timer ends) */
  endTime?: number;
}

/**
 * Context for creating child loggers with persistent metadata
 */
export interface ChildLoggerContext {
  /** Module name (e.g., 'database', 'api') */
  module?: string;
  /** Module version */
  version?: string;
  /** Environment (production, staging, development) */
  environment?: string;
  /** Additional custom context */
  [key: string]: unknown;
}

/**
 * Browser-safe logger interface for client-side and SSR logging
 */
export interface IBrowserLogger {
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
export interface IServerLogger {
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
export interface IApiLogger {
  /** Log an API request */
  logRequest(context: ApiRequestContext): void;
  /** Log an API response */
  logResponse(context: ApiResponseContext): void;
  /** Log an API error */
  logError(error: Error, context?: LogContext): void;
}

/**
 * Performance timing utilities interface
 */
export interface IPerformanceHelper {
  /**
   * Start a performance timer
   * @param label - Unique identifier for this timer
   * @returns Function to call when operation completes
   */
  start(label: string): () => void;
  /**
   * Time a synchronous function
   * @param label - Timer label
   * @param fn - Function to time
   */
  time<T>(label: string, fn: () => T): T;
  /**
   * Time an asynchronous function
   * @param label - Timer label
   * @param fn - Async function to time
   * @returns Promise resolving with function result
   */
  timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * Fetch interceptor function type
 */
export type InterceptorFunction = (
  url: string,
  options?: RequestInit
) => { url: string; options?: RequestInit } | Promise<{ url: string; options?: RequestInit }>;

/**
 * Logger factory options
 */
export interface LoggerFactoryOptions {
  /** Module name for child logger context */
  module?: string;
  /** Module version */
  version?: string;
  /** Environment (defaults to process.env.NODE_ENV) */
  environment?: string;
}

// ============================================================================
// Body Logging Configuration Types
// ============================================================================

/**
 * Content type filter configuration
 */
export interface ContentTypeFilter {
  /** Array of content type patterns to include (wildcards supported) */
  include?: string[];
  /** Array of content type patterns to exclude (wildcards supported) */
  exclude?: string[];
}

/**
 * Redaction pattern for sensitive data detection
 */
export interface RedactionPattern {
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
export interface SamplingConfig {
  /** Sample rate between 0 and 1 (0.1 = 10% of requests) */
  rate: number;
  /** URLs or URL patterns to apply sampling to */
  patterns?: string[];
}

/**
 * Body logging configuration - comprehensive control over response body logging
 */
export interface BodyLoggingConfig {
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
export interface LoggedFetchOptions {
  logger?: IApiLogger;
  enabled?: boolean;
  redactHeaders?: boolean;
  redactBody?: boolean;
  bodyLoggingConfig?: BodyLoggingConfig;
}

// ============================================================================
// Client-to-Server Logging Types
// ============================================================================

/**
 * Log source enumeration - identifies where a log entry originated
 */
export type LogSource = 'console' | 'api' | 'error';

/**
 * Client log entry sent from browser to server
 * Extends BrowserLogEntry with source field for origin tracking
 */
export interface ClientLogEntry {
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
  /** Origin of log entry (console.log, API call, or error) */
  source: LogSource;
}

/**
 * Configuration for batching behavior on the client side
 */
export interface BatchingConfig {
  /** Batching mode: time-based, count-based, or immediate */
  mode: 'time' | 'count' | 'immediate';
  /** Time in milliseconds between batched sends (time mode only, default: 3000) */
  timeIntervalMs: number;
  /** Number of entries to trigger batch (count mode only, default: 10) */
  countThreshold: number;
}

/**
 * Configuration for retry behavior when batched logs fail to send
 */
export interface RetryConfig {
  /** Whether retry logic is enabled (default: true) */
  enabled: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Delay before first retry in milliseconds (default: 1000) */
  initialDelayMs: number;
  /** Maximum delay between retries in milliseconds (default: 30000) */
  maxDelayMs: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier: number;
}

/**
 * Combined configuration for client-to-server transport
 */
export interface TransportConfig {
  /** API endpoint path (default: '/api/logger') */
  endpoint: string;
  /** Batching configuration */
  batch: BatchingConfig;
  /** Retry configuration */
  retry: RetryConfig;
}

/**
 * Response from the API route when logs are successfully written
 */
export interface LogWriteResponse {
  /** Whether the write operation was successful */
  success: boolean;
  /** Number of log entries written */
  count: number;
}

/**
 * Next.js plugin configuration options
 */
export interface LoggerPluginOptions {
  /** Enable/disable automatic API route setup (default: true) */
  apiRoute?: boolean;
  /** Custom API route path (default: 'api/logger') */
  apiRoutePath?: string;
  /** Enable/disable React Provider (default: true) */
  reactProvider?: boolean;
  /** Log directory path (default: './_logs') */
  logDir?: string;
  /** Batching mode: 'time' | 'count' | 'immediate' (default: 'time') */
  batchingMode?: 'time' | 'count' | 'immediate';
  /** Batching interval in milliseconds (default: 3000) */
  batchingTimeMs?: number;
  /** Batching count threshold (default: 10) */
  batchingCount?: number;
  /** Enable/disable retry logic (default: true) */
  retryEnabled?: boolean;
  /** Maximum retry attempts (default: 3) */
  retryMaxRetries?: number;
}
