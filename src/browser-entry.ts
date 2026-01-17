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
 * Browser-only Entry Point
 *
 * This file exports only browser-safe functionality.
 * Used by bundlers when building for the browser.
 */

import { createBrowserLogger, browserLogger } from './browser';
import {
  installInterceptors as _installInterceptors,
  uninstallInterceptors as _uninstallInterceptors,
  areInterceptorsActive,
  getInterceptorLogger,
} from './interceptors';
import { perf } from './timing';
import type {
  LogContext,
  LogLevel,
  IBrowserLogger,
  BatchingConfig,
  TransportConfig,
  RetryConfig,
} from './types';

export { perf as performance } from './timing';

/**
 * Create a browser logger instance
 */
export function logger(options?: { name?: string; level?: LogLevel }): IBrowserLogger {
  return createBrowserLogger({
    consoleEnabled: true,
    persistenceEnabled: true,
    maxEntries: 100,
    storageKey: 'glean_api_logs',
  });
}

/**
 * Time an async operation (browser version)
 */
export async function measure<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = perf.now();
  const result = await fn();
  const duration = perf.now() - start;
  return { result, duration };
}

// ============================================================================
// Browser-safe Configuration Functions
// ============================================================================

/**
 * Get batching configuration for browser environment
 * Uses window object for environment variables in browser
 */
export function getBatchingConfig(): BatchingConfig {
  // Browser-safe implementation using window.__ENV__ pattern or defaults
  const getEnv = (key: string, fallback: string): string => {
    // Try window.__ENV__ first (set by Next.js with public env vars)
    if (typeof window !== 'undefined') {
      const env = (window as { __ENV__?: Record<string, string> }).__ENV__;
      if (env && key in env) {
        return env[key]!;
      }
    }
    return fallback;
  };

  const batchMode = getEnv('LOGGER_BATCH_MODE', 'time');
  const batchTime = getEnv('LOGGER_BATCH_TIME_MS', '3000');
  const batchCount = getEnv('LOGGER_BATCH_COUNT', '10');

  return {
    mode: (batchMode as 'time' | 'count' | 'immediate') || 'time',
    timeIntervalMs: parseInt(batchTime, 10) || 3000,
    countThreshold: parseInt(batchCount, 10) || 10,
  };
}

/**
 * Get transport configuration for browser environment
 */
export function getTransportConfig(): TransportConfig {
  const getEnv = (key: string, fallback: string): string => {
    if (typeof window !== 'undefined') {
      const env = (window as { __ENV__?: Record<string, string> }).__ENV__;
      if (env && key in env) {
        return env[key]!;
      }
    }
    return fallback;
  };

  return {
    endpoint: getEnv('LOGGER_ENDPOINT', '/api/logs'),
    batch: getBatchingConfig(),
    retry: getRetryConfig(),
  };
}

/**
 * Get retry configuration for browser environment
 */
export function getRetryConfig(): RetryConfig {
  const getEnv = (key: string, fallback: string): string => {
    if (typeof window !== 'undefined') {
      const env = (window as { __ENV__?: Record<string, string> }).__ENV__;
      if (env && key in env) {
        return env[key]!;
      }
    }
    return fallback;
  };

  const retryEnabled = getEnv('LOGGER_RETRY_ENABLED', 'true');
  const maxRetries = getEnv('LOGGER_RETRY_MAX', '3');
  const initialDelay = getEnv('LOGGER_RETRY_DELAY', '1000');
  const maxDelay = getEnv('LOGGER_RETRY_MAX_DELAY', '30000');
  const multiplier = getEnv('LOGGER_RETRY_MULTIPLIER', '2');

  return {
    enabled: retryEnabled === 'true',
    maxRetries: parseInt(maxRetries, 10) || 3,
    initialDelayMs: parseInt(initialDelay, 10) || 1000,
    maxDelayMs: parseInt(maxDelay, 10) || 30000,
    backoffMultiplier: parseFloat(multiplier) || 2,
  };
}

// Re-export types
export type { IBrowserLogger, LogContext, LogLevel };

// Re-export interceptors for browser use
export { areInterceptorsActive, getInterceptorLogger };

/**
 * Install console and error interceptors for automatic logging
 * Safe for browser use - only works in browser environment
 */
export function installInterceptors(logger: IBrowserLogger): void {
  if (typeof window !== 'undefined') {
    _installInterceptors(logger);
  }
}

/**
 * Uninstall interceptors
 * Safe for browser use - only works in browser environment
 */
export function uninstallInterceptors(): void {
  if (typeof window !== 'undefined') {
    _uninstallInterceptors();
  }
}
