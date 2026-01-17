/**
 * Providers wrapper for React Query and Logger
 *
 * Feature: 001-browser-log-sync
 * Uses @zaob/glean-logger/react for LoggerProvider
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { setupBrowserLogging, cleanupBrowserLogging } from '@/lib/browser-logger';
import { LoggerProvider, useLogger } from '@zaob/glean-logger/react';
import type { IBrowserLogger, BrowserLogEntry, LogContext } from '@zaob/glean-logger';
import { useEffect, type ReactNode } from 'react';

/**
 * Custom browser logger that wraps the demo's browserLogger
 * to work with the example's logging infrastructure
 */
class DemoBrowserLogger implements IBrowserLogger {
  private cachedBrowserLogger: Record<string, unknown> | null = null;

  private getBrowserLogger(): Record<string, unknown> {
    if (!this.cachedBrowserLogger) {
      // Dynamically import to avoid SSR issues
      // This is evaluated at runtime, not compile time
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module = require('@/lib/browser-logger');
        this.cachedBrowserLogger = module.browserLogger as Record<string, unknown>;
      } catch {
        this.cachedBrowserLogger = {};
      }
    }
    return this.cachedBrowserLogger;
  }

  debug(message: string, context?: LogContext): void {
    const bl = this.getBrowserLogger();
    (bl.debug as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
  }

  info(message: string, context?: LogContext): void {
    const bl = this.getBrowserLogger();
    (bl.info as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
  }

  warn(message: string, context?: LogContext): void {
    const bl = this.getBrowserLogger();
    (bl.warn as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
  }

  error(message: string, context?: LogContext): void {
    const bl = this.getBrowserLogger();
    (bl.error as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
  }

  log(level: string, message: string, context?: LogContext): void {
    const bl = this.getBrowserLogger();
    const logFn = bl.log as (lvl: string, msg: string, meta?: Record<string, unknown>) => void;
    if (logFn) {
      logFn(level, message, context);
    } else {
      // Fallback to level-specific method
      switch (level) {
        case 'debug':
          (bl.debug as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
          break;
        case 'info':
          (bl.info as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
          break;
        case 'warn':
          (bl.warn as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
          break;
        case 'error':
          (bl.error as (msg: string, meta?: Record<string, unknown>) => void)?.(message, context);
          break;
      }
    }
  }

  getStoredLogs(): BrowserLogEntry[] {
    const bl = this.getBrowserLogger();
    const getStoredLogs = bl.getStoredLogs as () => unknown[];
    return (getStoredLogs?.() || []) as BrowserLogEntry[];
  }

  clearStoredLogs(): void {
    const bl = this.getBrowserLogger();
    const clearStoredLogs = bl.clearStoredLogs as () => void;
    clearStoredLogs?.();
  }

  async flush(): Promise<void> {
    const bl = this.getBrowserLogger();
    const flush = bl.flush as () => Promise<void>;
    await flush?.();
  }
}

const demoLogger = new DemoBrowserLogger();

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Setup browser logging on mount
    setupBrowserLogging();

    // Cleanup on unmount
    return () => {
      cleanupBrowserLogging();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LoggerProvider logger={demoLogger}>{children}</LoggerProvider>
    </QueryClientProvider>
  );
}

/**
 * Hook to use logger with access to demo-specific features
 */
export function useDemoLogger() {
  const logger = useLogger();

  return {
    ...logger,
    // Demo-specific convenience methods
    logApiCall: (method: string, url: string, status: number, duration: number) => {
      logger.info(`API ${method} ${url}`, {
        type: 'request',
        method,
        url,
        status,
        duration: `${duration}ms`,
      });
    },
    logError: (error: Error, component?: string) => {
      logger.error(error.message, {
        type: 'exception',
        errorName: error.name,
        stack: error.stack,
        component,
      });
    },
  };
}
