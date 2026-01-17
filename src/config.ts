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
 * Configuration module for API Logger Integration
 *
 * Loads and validates environment variables, provides defaults,
 * and exposes configuration as a readonly object.
 */

import type { LoggerConfig, LogLevel, BatchingConfig, RetryConfig, TransportConfig } from './types';

/**
 * Default configuration values for core logger
 */
const DEFAULT_CONFIG: Omit<LoggerConfig, 'level'> = {
  enabled: true,
  redactSensitive: true,
  includeStackTrace: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 14, // 14 days
  logDir: './_logs',
  jsonFormat: true,
  developmentFormat: true,
};

/**
 * Default batching configuration
 */
export const DEFAULT_BATCHING: BatchingConfig = {
  mode: 'time',
  timeIntervalMs: 3000, // 3 seconds
  countThreshold: 10,
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY: RetryConfig = {
  enabled: true,
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

/**
 * Default transport configuration
 */
const DEFAULT_TRANSPORT: Omit<TransportConfig, 'batch' | 'retry'> = {
  endpoint: '/api/logger',
};

/**
 * Valid log levels
 */
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

/**
 * Valid batching modes
 */
const VALID_BATCHING_MODES = ['time', 'count', 'immediate'] as const;

/**
 * Parse log level from environment variable
 */
function parseLogLevel(value: string | undefined, defaultValue: LogLevel): LogLevel {
  if (!value) {
    return defaultValue;
  }
  const normalized = value.toLowerCase();
  if (VALID_LOG_LEVELS.includes(normalized as LogLevel)) {
    return normalized as LogLevel;
  }
  console.warn(`Invalid log level "${value}", using default "${defaultValue}"`);
  return defaultValue;
}

/**
 * Parse batching mode from environment variable
 */
function parseBatchingMode(
  value: string | undefined,
  defaultValue: 'time' | 'count' | 'immediate'
): 'time' | 'count' | 'immediate' {
  if (!value) {
    return defaultValue;
  }
  const normalized = value.toLowerCase();
  if (VALID_BATCHING_MODES.includes(normalized as 'time' | 'count' | 'immediate')) {
    return normalized as 'time' | 'count' | 'immediate';
  }
  console.warn(`Invalid batching mode "${value}", using default "${defaultValue}"`);
  return defaultValue;
}

/**
 * Parse positive integer from environment variable
 */
function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Parse file size string (e.g., "10m", "1g") to bytes
 */
function parseFileSize(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const sizeMatch = value.toLowerCase().match(/^(\d+)([bkmg])?$/);
  if (!sizeMatch?.[1]) {
    return defaultValue;
  }

  const size = parseInt(sizeMatch[1], 10);
  const unit = sizeMatch[2] ?? undefined;

  switch (unit) {
    case 'g':
      return size * 1024 * 1024 * 1024;
    case 'm':
      return size * 1024 * 1024;
    case 'k':
      return size * 1024;
    default:
      return size;
  }
}

/**
 * Parse max files string (e.g., "14d", "10") to days
 */
function parseMaxFiles(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  // Handle duration format like "14d" for 14 days
  const durationMatch = value.toLowerCase().match(/^(\d+)([dwh])?$/);
  if (!durationMatch?.[1]) {
    return defaultValue;
  }

  const amount = parseInt(durationMatch[1], 10);
  const unit = durationMatch[2] ?? undefined;

  switch (unit) {
    case 'w':
      return amount * 7; // weeks to days
    case 'h':
      return Math.ceil(amount / 24); // hours to days (rounded up)
    case 'd':
    default:
      return amount;
  }
}

/**
 * Cached configuration object
 */
let cachedConfig: LoggerConfig | null = null;

/**
 * Get the logger configuration
 * Loads from environment variables with defaults, caches the result
 */
export function getConfig(): LoggerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const level = parseLogLevel(process.env['NEXT_PUBLIC_LOG_LEVEL'], 'debug');

  cachedConfig = {
    ...DEFAULT_CONFIG,
    level,
    enabled: parseBoolean(process.env['NEXT_PUBLIC_LOG_ENABLED'], DEFAULT_CONFIG.enabled),
    redactSensitive: parseBoolean(
      process.env['API_LOG_REDACT_SENSITIVE'],
      DEFAULT_CONFIG.redactSensitive
    ),
    includeStackTrace: parseBoolean(undefined, DEFAULT_CONFIG.includeStackTrace),
    maxFileSize: parseFileSize(process.env['LOG_MAX_SIZE'], DEFAULT_CONFIG.maxFileSize),
    maxFiles: parseMaxFiles(process.env['LOG_MAX_FILES'], DEFAULT_CONFIG.maxFiles),
    logDir: process.env['LOG_DIR'] || DEFAULT_CONFIG.logDir,
    jsonFormat: parseBoolean(undefined, DEFAULT_CONFIG.jsonFormat),
    developmentFormat: parseBoolean(undefined, DEFAULT_CONFIG.developmentFormat),
  };

  return cachedConfig;
}

/**
 * Check if logging is enabled
 */
export function isLoggingEnabled(): boolean {
  return getConfig().enabled;
}

/**
 * Check if a log level will be output
 */
export function shouldLog(level: LogLevel): boolean {
  if (!isLoggingEnabled()) {
    return false;
  }

  const config = getConfig();
  const priorities: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  return priorities[level] >= priorities[config.level];
}

/**
 * Get the log directory path
 */
export function getLogDir(): string {
  return getConfig().logDir;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env['NODE_ENV'] === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/**
 * Get the current environment
 */
export function getEnvironment(): string {
  return process.env['NODE_ENV'] || 'development';
}

/**
 * Reset the cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

// ============================================================================
// Batching and Retry Configuration
// ============================================================================

/**
 * Get the batching configuration
 * Loads from environment variables with defaults
 */
export function getBatchingConfig(): BatchingConfig {
  return {
    mode: parseBatchingMode(process.env['LOGGER_BATCH_MODE'], DEFAULT_BATCHING.mode),
    timeIntervalMs: parsePositiveInt(
      process.env['LOGGER_BATCH_TIME_MS'],
      DEFAULT_BATCHING.timeIntervalMs
    ),
    countThreshold: parsePositiveInt(
      process.env['LOGGER_BATCH_COUNT'],
      DEFAULT_BATCHING.countThreshold
    ),
  };
}

/**
 * Get the retry configuration
 * Loads from environment variables with defaults
 */
export function getRetryConfig(): RetryConfig {
  return {
    enabled: parseBoolean(process.env['LOGGER_RETRY_ENABLED'], DEFAULT_RETRY.enabled),
    maxRetries: parsePositiveInt(process.env['LOGGER_RETRY_MAX_RETRIES'], DEFAULT_RETRY.maxRetries),
    initialDelayMs: parsePositiveInt(
      process.env['LOGGER_RETRY_INITIAL_DELAY_MS'],
      DEFAULT_RETRY.initialDelayMs
    ),
    maxDelayMs: parsePositiveInt(
      process.env['LOGGER_RETRY_MAX_DELAY_MS'],
      DEFAULT_RETRY.maxDelayMs
    ),
    backoffMultiplier: parsePositiveInt(
      process.env['LOGGER_RETRY_BACKOFF_MULTIPLIER'],
      DEFAULT_RETRY.backoffMultiplier
    ),
  };
}

/**
 * Get the transport configuration
 * Combines batching, retry, and endpoint configuration
 */
export function getTransportConfig(): TransportConfig {
  return {
    endpoint: process.env['LOGGER_TRANSPORT_ENDPOINT'] || DEFAULT_TRANSPORT.endpoint,
    batch: getBatchingConfig(),
    retry: getRetryConfig(),
  };
}
