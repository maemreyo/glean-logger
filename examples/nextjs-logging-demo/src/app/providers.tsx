/**
 * Providers wrapper for React Query and Logger
 *
 * Feature: 001-browser-log-sync
 * Uses @zaob/glean-logger/react for LoggerProvider
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import {
  getBrowserLoggerInstance,
  setupBrowserLogging,
  cleanupBrowserLogging,
} from '@/lib/browser-logger';
import { LoggerProvider } from '@zaob/glean-logger/react';
import type { IBrowserLogger } from '@zaob/glean-logger';
import { useEffect, type ReactNode } from 'react';

/**
 * Get the browser logger instance for use with LoggerProvider
 */
function getLogger(): IBrowserLogger {
  return getBrowserLoggerInstance();
}

export function Providers({ children }: { children: ReactNode }) {
  const logger = getLogger();

  useEffect(() => {
    setupBrowserLogging();
    return () => {
      cleanupBrowserLogging();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LoggerProvider logger={logger}>{children}</LoggerProvider>
    </QueryClientProvider>
  );
}
