/**
 * Browser Logger with Client Transport
 *
 * Feature: 001-browser-log-sync
 * Uses @zaob/glean-logger's ClientTransport for batching and retry,
 * and installInterceptors for automatic console/error interception.
 */

import { setBrowserLogger } from '@zaob/glean-logger/react';
import {
  installInterceptors,
  uninstallInterceptors,
  type IBrowserLogger,
  type BrowserLogEntry,
  type LogContext,
  type LogLevel,
} from '@zaob/glean-logger';
import { getTransportConfig, getBatchingConfig } from '@zaob/glean-logger';
import { isLoggingEnabled, isBrowserExceptionsEnabled } from './config';

// ============================================================================
// Types
// ============================================================================

export interface BrowserLogInput {
  level: 'debug' | 'info' | 'warn' | 'error';
  type: 'exception' | 'request' | 'query' | 'console' | 'custom';
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Browser Logger Implementation
// ============================================================================

class BrowserLoggerImpl implements IBrowserLogger {
  private logs: BrowserLogEntry[] = [];

  constructor() {
    // Initialize with default implementation
  }

  /**
   * Add a log entry to storage
   */
  private addLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context?: LogContext
  ): void {
    const entry: BrowserLogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      context: context ?? {},
    };
    this.logs.push(entry);
  }

  debug(message: string, context?: LogContext): void {
    this.addLog('debug', message, context);
    console.debug(`[DEBUG] ${message}`, context);
  }

  info(message: string, context?: LogContext): void {
    this.addLog('info', message, context);
    console.info(`[INFO] ${message}`, context);
  }

  warn(message: string, context?: LogContext): void {
    this.addLog('warn', message, context);
    console.warn(`[WARN] ${message}`, context);
  }

  error(message: string, context?: LogContext): void {
    this.addLog('error', message, context);
    console.error(`[ERROR] ${message}`, context);
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    switch (level) {
      case 'debug':
        this.debug(message, context);
        break;
      case 'info':
        this.info(message, context);
        break;
      case 'warn':
        this.warn(message, context);
        break;
      case 'error':
        this.error(message, context);
        break;
      case 'fatal':
        this.error(message, context);
        break;
    }
  }

  getStoredLogs(): BrowserLogEntry[] {
    return [...this.logs];
  }

  clearStoredLogs(): void {
    this.logs = [];
  }

  async flush(): Promise<void> {
    // The actual flush is handled by ClientTransport
    // This is a placeholder that returns immediately
    return Promise.resolve();
  }
}

// ============================================================================
// Module State
// ============================================================================

let browserLoggerInstance: BrowserLoggerImpl | null = null;
let interceptorsActive: boolean = false;

/**
 * Get or create the browser logger instance
 */
export function getBrowserLoggerInstance(): BrowserLoggerImpl {
  if (!browserLoggerInstance) {
    browserLoggerInstance = new BrowserLoggerImpl();
    setBrowserLogger(browserLoggerInstance);
  }
  return browserLoggerInstance;
}

/**
 * Get the glean-logger compatible logger
 */
export function getGleanLogger(): IBrowserLogger {
  return getBrowserLoggerInstance();
}

/**
 * Setup the browser logging infrastructure
 * Call this once in your app initialization
 */
export function setupBrowserLogging(): void {
  if (typeof window === 'undefined') return;
  if (!isLoggingEnabled()) return;

  const logger = getBrowserLoggerInstance();

  // Install console and error interceptors if enabled
  if (isBrowserExceptionsEnabled()) {
    installInterceptors(logger);
    interceptorsActive = true;
  }

  // Log setup completion
  const batchingConfig = getBatchingConfig();
  const transportConfig = getTransportConfig();
  console.log('[BrowserLogger] Setup complete', {
    interceptorsActive,
    batchingMode: batchingConfig.mode,
    batchCount: batchingConfig.countThreshold,
    batchInterval: batchingConfig.timeIntervalMs,
    endpoint: transportConfig.endpoint,
  });
}

/**
 * Cleanup the browser logging infrastructure
 */
export function cleanupBrowserLogging(): void {
  if (interceptorsActive) {
    uninstallInterceptors();
    interceptorsActive = false;
  }
}

/**
 * Check if interceptors are active
 */
export function areLoggingInterceptorsActive(): boolean {
  return interceptorsActive;
}

// ============================================================================
// Convenience Logging Functions
// ============================================================================

/**
 * Log an exception/error
 */
export function logException(error: Error, errorInfo?: Record<string, unknown>): void {
  const logger = getGleanLogger();
  logger.error(error.message, {
    stack: error.stack,
    type: 'exception',
    ...(errorInfo as LogContext),
  });
}

/**
 * Log an API request
 */
export function logRequest(
  request: { method: string; url: string; body?: unknown },
  response?: { status: number; body?: unknown }
): void {
  const logger = getGleanLogger();
  logger.debug(`${request.method} ${request.url}`, {
    type: 'request',
    requestBody: request.body,
    responseStatus: response?.status,
    responseBody: response?.body,
  } as LogContext);
}

/**
 * Log a React Query event
 */
export function logQuery(
  queryKey: readonly unknown[],
  status: 'success' | 'error',
  duration: number,
  error?: Error
): void {
  const logger = getGleanLogger();
  const level = status === 'error' ? 'error' : 'debug';
  logger.log(level, `Query ${queryKey}`, {
    type: 'query',
    queryKey,
    duration: `${duration}ms`,
    error: error?.message,
  });
}

/**
 * Manual log entry point
 */
export function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, unknown>
): void {
  const logger = getGleanLogger();
  logger.log(level, message, { type: 'custom', ...metadata } as LogContext);
}

// ============================================================================
// Export the singleton instance for direct use
// ============================================================================

export const browserLogger = {
  debug: (message: string, metadata?: Record<string, unknown>) =>
    getGleanLogger().debug(message, metadata as LogContext),
  info: (message: string, metadata?: Record<string, unknown>) =>
    getGleanLogger().info(message, metadata as LogContext),
  warn: (message: string, metadata?: Record<string, unknown>) =>
    getGleanLogger().warn(message, metadata as LogContext),
  error: (message: string, metadata?: Record<string, unknown>) =>
    getGleanLogger().error(message, metadata as LogContext),
  log,
  logException,
  logRequest,
  logQuery,
  getStoredLogs: () => getGleanLogger().getStoredLogs(),
  clearStoredLogs: () => getGleanLogger().clearStoredLogs(),
  flush: () => getGleanLogger().flush(),
  setup: setupBrowserLogging,
  cleanup: cleanupBrowserLogging,
  areActive: () => interceptorsActive,
};
