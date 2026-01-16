/**
 * Log formatters for API Logger Integration
 *
 * Provides formatting functions for console output (colored in dev, structured in prod)
 * and JSON output (Datadog/CloudWatch compatible).
 */

import type { LogContext, LogLevel, BrowserLogEntry } from './types';
import { isDevelopment, getConfig } from './config';

/**
 * Colors for console output (ANSI escape codes)
 */
const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  fatal: '\x1b[35m', // magenta
};

const RESET = '\x1b[0m';

/**
 * Format a timestamp to ISO 8601 format
 */
export function formatTimestamp(timestamp?: number | string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toISOString();
}

/**
 * Format log level for console output (with color)
 */
export function formatLevel(level: LogLevel): string {
  const color = COLORS[level] || COLORS.info;
  return `${color}${level.toUpperCase().padEnd(5)}${RESET}`;
}

/**
 * Format log level for JSON output
 */
export function formatLevelJson(level: LogLevel): string {
  return level.toUpperCase();
}

/**
 * Format the message for console output
 */
export function formatMessage(message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }

  const contextStr = Object.entries(context)
    .map(([key, value]) => {
      const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return ` ${key}=${formattedValue}`;
    })
    .join('');

  return `${message}${contextStr}`;
}

/**
 * Format error object with stack trace
 */
export function formatError(error: Error | unknown): object {
  if (!(error instanceof Error)) {
    return { error: String(error) };
  }

  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

/**
 * Create a formatted log entry for console output (development mode)
 */
export function formatForConsole(
  level: LogLevel,
  message: string,
  context?: LogContext,
  timestamp?: number | string
): string {
  const formattedTimestamp = formatTimestamp(timestamp);
  const formattedLevel = formatLevel(level);
  const formattedMessage = formatMessage(message, context);

  return `[${formattedTimestamp}] ${formattedLevel} ${formattedMessage}`;
}

/**
 * Create a structured log entry for JSON output (production mode)
 */
export interface JsonLogEntry {
  '@timestamp': string;
  level: string;
  message: string;
  context?: LogContext;
  logger?: string;
  service?: string;
  trace?: string;
  error?: object;
}

/**
 * Create a JSON log entry compatible with Datadog, CloudWatch, and ELK
 */
export function formatForJson(
  level: LogLevel,
  message: string,
  context?: LogContext,
  timestamp?: number | string,
  logger?: string,
  service?: string,
  trace?: string,
  error?: Error | unknown
): JsonLogEntry {
  const entry: JsonLogEntry = {
    '@timestamp': formatTimestamp(timestamp),
    level: formatLevelJson(level),
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (logger) {
    entry.logger = logger;
  }

  if (service) {
    entry.service = service;
  }

  if (trace) {
    entry.trace = trace;
  }

  if (error) {
    entry.error = formatError(error);
  }

  return entry;
}

/**
 * Format a log entry based on environment (dev = console, prod = JSON)
 */
export function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  timestamp?: number | string,
  logger?: string,
  service?: string,
  trace?: string,
  error?: Error | unknown
): string {
  const config = getConfig();

  if (isDevelopment() && config.developmentFormat) {
    return formatForConsole(level, message, context, timestamp);
  }

  const jsonEntry = formatForJson(
    level,
    message,
    context,
    timestamp,
    logger,
    service,
    trace,
    error
  );

  return JSON.stringify(jsonEntry);
}

/**
 * Format a browser log entry for localStorage
 */
export function formatBrowserLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): Omit<BrowserLogEntry, 'id' | 'timestamp'> {
  return {
    level,
    message,
    context,
  };
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Safely stringify an object for logging
 */
export function safeStringify(obj: unknown, maxLength: number = 10240): string {
  try {
    const str = JSON.stringify(obj);
    return truncate(str, maxLength);
  } catch {
    return '[Unable to stringify]';
  }
}
