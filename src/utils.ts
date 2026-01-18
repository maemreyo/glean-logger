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
 * Utility functions for API Logger Integration
 *
 * UUID generation, timestamp creation, and environment detection.
 */

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if running in server environment
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env['NODE_ENV'] === 'test';
}

/**
 * Generate a UUID v4 string
 * Uses crypto.randomUUID() if available, falls back to custom implementation
 */
export function generateUUID(): string {
  // Use crypto.randomUUID() in Node.js 19+ and modern browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a request ID (UUID v4)
 * Alias for generateUUID for semantic clarity
 */
export function generateRequestId(): string {
  return generateUUID();
}

/**
 * Generate a unique ID with prefix
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}-${generateUUID()}`;
}

/**
 * Create a timestamp in ISO 8601 format
 */
export function createTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create a Unix timestamp in milliseconds
 */
export function createUnixTimestamp(): number {
  return Date.now();
}

/**
 * Parse ISO 8601 timestamp to Date object
 */
export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}

/**
 * Get current time in milliseconds for performance measurements
 */
export function getPerformanceNow(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify with fallback for circular references
 */
export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[Unable to stringify object]';
  }
}

/**
 * Check if a value is a primitive (string, number, boolean, null, undefined)
 */
export function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  if (isPrimitive(obj)) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, unknown>, U extends Record<string, unknown>>(
  target: T,
  source: U
): T & U {
  const output = { ...target } as T & U;

  if (isObject(target) && isObject(source)) {
    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        (output as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        (output as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return output;
}

/**
 * Check if a value is an object (non-null, not a function)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Get a nested value from an object using dot notation
 */
export function getNestedValue<T>(obj: Record<string, unknown>, path: string, defaultValue: T): T {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return defaultValue;
    }
  }

  return (current as T) ?? defaultValue;
}

/**
 * Set a nested value in an object using dot notation
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i] ?? '';

    if (!(key in current) || !isObject(current[key])) {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1] ?? '';
  current[lastKey] = value;
}

// ============================================================================
// Log Normalization Utilities
// ============================================================================

import { serializeError as _serializeError } from 'serialize-error';
import safeJsonStringifyPkg from 'safe-json-stringify';

/**
 * Serialize an Error object to a clean JSON structure
 * Handles Error, unknown, and primitive values safely
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return _serializeError(error);
  }
  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.parse(safeJsonStringifyPkg(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

/**
 * Serialize console.log arguments to a clean string representation
 * Handles objects, errors, primitives, and mixed arguments
 */
export function serializeConsoleArgs(args: unknown[]): string {
  return args
    .map(arg => {
      // Handle Error objects
      if (arg instanceof Error) {
        return `[Error: ${arg.message}]`;
      }
      // Handle objects
      if (typeof arg === 'object' && arg !== null) {
        try {
          return safeJsonStringifyPkg(arg);
        } catch {
          return '[Object]';
        }
      }
      // Handle primitives
      return String(arg);
    })
    .join(' ');
}

/**
 * Internal fields that should be removed from logs before sending to server
 */
const INTERNAL_FIELDS = new Set(['bufferSize', 'mode', 'consoleArgs', 'consoleMethod']);

/**
 * Normalize a browser log entry to a clean, structured format
 * Removes internal fields and standardizes the structure
 */
export interface NormalizedBrowserLog {
  '@timestamp': string;
  level: string;
  message: string;
  browserId?: string;
  browserSource?: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    type: string;
    stack?: string;
  };
}

/**
 * Normalize a browser log entry for server-side processing
 * - Removes internal fields (bufferSize, mode, consoleArgs, etc.)
 * - Converts timestamp to ISO 8601
 * - Standardizes level to uppercase
 * - Extracts error information properly
 */
export function normalizeBrowserLogEntry(entry: {
  id: string;
  timestamp: number;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}): NormalizedBrowserLog {
  const normalized: NormalizedBrowserLog = {
    '@timestamp': new Date(entry.timestamp).toISOString(),
    level: entry.level.toUpperCase(),
    message: entry.message,
  };

  // Add browser-specific fields if present
  if (entry.source) {
    normalized.browserSource = entry.source;
  }

  // Add context if present and not empty
  if (entry.context && Object.keys(entry.context).length > 0) {
    // Filter out any internal fields from context
    const cleanContext: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry.context)) {
      if (!INTERNAL_FIELDS.has(key)) {
        cleanContext[key] = value;
      }
    }
    if (Object.keys(cleanContext).length > 0) {
      normalized.context = cleanContext;
    }
  }

  // Check if this is an error entry and extract error info
  if (entry.level === 'error' || entry.level === 'fatal') {
    const errorInfo = extractErrorInfo(entry.message, entry.context);
    if (errorInfo) {
      normalized.error = errorInfo;
    }
  }

  return normalized;
}

/**
 * Extract error information from message and context
 */
function extractErrorInfo(
  message: string,
  context?: Record<string, unknown>
): { message: string; type: string; stack?: string } | null {
  // Check context for error info first
  if (context) {
    if (context.error && typeof context.error === 'object') {
      const errorObj = context.error as Record<string, unknown>;
      return {
        message: String(errorObj.message || message),
        type: String(errorObj.name || errorObj.type || 'Error'),
        stack: errorObj.stack ? String(errorObj.stack) : undefined,
      };
    }
    if (context.stack && typeof context.stack === 'string') {
      return {
        message: message,
        type: 'Error',
        stack: context.stack,
      };
    }
  }

  // Default: return basic error info
  return {
    message: message,
    type: 'Error',
  };
}
