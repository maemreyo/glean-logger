/**
 * Browser-safe Logger Implementation
 *
 * Feature: 011-api-logger
 * User Story 1: Browser-Safe Client Logging
 *
 * This module provides a browser-safe logger that:
 * - Works in both CSR and SSR contexts
 * - Does NOT bundle Winston (pure browser code)
 * - Outputs to console with colored formatting in dev
 * - Persists logs to localStorage with quota management
 */

import { shouldLog, isLoggingEnabled, getConfig } from './config';
import { formatForConsole, formatForJson, formatBrowserLogEntry } from './formatters';
import type { IBrowserLogger, LogContext, LogLevel, BrowserLogEntry, StoredLogs } from './types';
import { generateUUID, createUnixTimestamp, isBrowser } from './utils';

/**
 * Storage key for localStorage
 */
const STORAGE_KEY = 'glean_api_logs';

/**
 * Maximum number of entries to store
 */
const MAX_ENTRIES = 100;

/**
 * Default options for the browser logger
 */
interface BrowserLoggerOptions {
  /** Maximum number of entries to store */
  maxEntries?: number;
  /** Custom storage key */
  storageKey?: string;
  /** Enable console output */
  consoleEnabled?: boolean;
  /** Enable localStorage persistence */
  persistenceEnabled?: boolean;
}

/**
 * Browser logger implementation
 */
class BrowserLoggerImpl implements IBrowserLogger {
  private options: Required<BrowserLoggerOptions>;
  private config = getConfig();

  constructor(options: BrowserLoggerOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries ?? MAX_ENTRIES,
      storageKey: options.storageKey ?? STORAGE_KEY,
      consoleEnabled: options.consoleEnabled ?? true,
      persistenceEnabled: options.persistenceEnabled ?? true,
    };
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!isLoggingEnabled()) {
      return;
    }

    if (!shouldLog(level)) {
      return;
    }

    const entry = formatBrowserLogEntry(level, message, context);
    const timestamp = createUnixTimestamp();

    // Console output
    if (this.options.consoleEnabled) {
      const formatted = formatForConsole(level, message, context, timestamp);
      console.log(formatted);
    }

    // LocalStorage persistence
    if (this.options.persistenceEnabled && isBrowser()) {
      this.persistEntry(entry, timestamp);
    }
  }

  /**
   * Persist an entry to localStorage
   */
  private persistEntry(entry: Omit<BrowserLogEntry, 'id' | 'timestamp'>, timestamp: number): void {
    if (!isBrowser()) {
      return;
    }

    try {
      const stored = this.getStoredLogsRaw();

      const newEntry: BrowserLogEntry = {
        ...entry,
        id: generateUUID(),
        timestamp,
      };

      stored.entries.push(newEntry);

      while (stored.entries.length > this.options.maxEntries) {
        stored.entries.shift();
      }

      stored.lastUpdated = timestamp;

      localStorage.setItem(this.options.storageKey, JSON.stringify(stored));
    } catch {
      console.warn('[BrowserLogger] localStorage unavailable or quota exceeded');
    }
  }

  /**
   * Get raw stored logs from localStorage
   */
  private getStoredLogsRaw(): StoredLogs {
    if (!isBrowser()) {
      return { entries: [], lastUpdated: 0, version: 1 };
    }

    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (!stored) {
        return { entries: [], lastUpdated: 0, version: 1 };
      }

      const parsed = JSON.parse(stored);
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        lastUpdated: parsed.lastUpdated || 0,
        version: parsed.version || 1,
      };
    } catch {
      return { entries: [], lastUpdated: 0, version: 1 };
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  getStoredLogs(): BrowserLogEntry[] {
    const stored = this.getStoredLogsRaw();
    return [...stored.entries].sort((a, b) => a.timestamp - b.timestamp);
  }

  clearStoredLogs(): void {
    if (!isBrowser()) {
      return;
    }

    try {
      localStorage.removeItem(this.options.storageKey);
    } catch {
      console.warn('[BrowserLogger] Failed to clear stored logs');
    }
  }

  async flush(): Promise<void> {
    console.log('[BrowserLogger] flush() called - server sync not yet implemented');
  }
}

/**
 * Singleton instance of the browser logger
 */
let instance: BrowserLoggerImpl | null = null;

/**
 * Get or create the browser logger singleton
 */
function getInstance(): BrowserLoggerImpl {
  if (!instance) {
    instance = new BrowserLoggerImpl();
  }
  return instance;
}

/**
 * Default export - singleton browser logger instance
 */
const browserLogger: IBrowserLogger = getInstance();

/**
 * Factory function to create a new browser logger instance
 */
function createBrowserLogger(options?: BrowserLoggerOptions): IBrowserLogger {
  return new BrowserLoggerImpl(options);
}

export default browserLogger;
export { browserLogger, createBrowserLogger, BrowserLoggerImpl };
