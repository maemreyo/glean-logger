/**
 * Unified Logger API
 *
 * Feature: 011-api-logger
 *
 * Single entry point for all logging needs.
 * Auto-detects environment and uses appropriate logger.
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * // In client component OR server component - same API!
 * const log = logger({ name: 'my-module' });
 * log.info('Hello from', { userId: 123 });
 * log.error('Something went wrong', { error: 'timeout' });
 * ```
 */

import { browserLogger, createBrowserLogger } from './browser';
import { perf } from './timing';
import type { LogContext, LogLevel, IBrowserLogger, IServerLogger } from './types';
export { perf as performance } from './timing';

let _serverLogger: IServerLogger | null = null;

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
export function logger(options?: {
  name?: string;
  level?: LogLevel;
}): IBrowserLogger | IServerLogger {
  if (typeof window !== 'undefined') {
    // Browser environment
    return createBrowserLogger({
      consoleEnabled: true,
      persistenceEnabled: true,
      maxEntries: 100,
      storageKey: 'glean_api_logs',
    });
  }

  // Server environment - use Winston
  // Lazy load to prevent bundling Winston in client
  if (!_serverLogger) {
    const { createServerLogger } = require('./server');
    _serverLogger = createServerLogger({
      name: options?.name ?? 'server',
      level: options?.level,
    });
  }

  return _serverLogger!;
}

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
export function child(context: LogContext): IServerLogger | null {
  if (typeof window !== 'undefined') {
    // Browser doesn't support child loggers
    return null;
  }

  const { createServerLogger } = require('./server');
  const parent = createServerLogger({ name: 'parent' });
  return parent.child(context);
}

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
export function loggedFetch(options?: {
  enabled?: boolean;
  redactHeaders?: boolean;
  redactBody?: boolean;
}): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  // Dynamic import to avoid bundling server code
  if (typeof window !== 'undefined') {
    // Browser doesn't support this - return no-op
    return () => Promise.reject(new Error('loggedFetch is server-only'));
  }

  const { createLoggedFetch: _createLoggedFetch } = require('./http');
  return _createLoggedFetch(options);
}

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
export async function measure<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  if (typeof window !== 'undefined') {
    // Browser fallback - no Winston
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return { result, duration };
  }

  const timing = await import('./timing');
  const result = await timing.timeAsync(fn);
  return { result: result.result, duration: result.duration };
}
