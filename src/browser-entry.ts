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
import { perf } from './timing';
import type { LogContext, LogLevel, IBrowserLogger } from './types';

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

// Re-export types
export type { IBrowserLogger, LogContext, LogLevel };
