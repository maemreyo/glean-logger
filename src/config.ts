/**
 * Configuration module for API Logger Integration
 *
 * Loads and validates environment variables, provides defaults,
 * and exposes configuration as a readonly object.
 */

import type { LoggerConfig, LogLevel } from './types';

/**
 * Default configuration values
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
 * Valid log levels
 */
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

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
