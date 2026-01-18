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

'use client';

/**
 * React Integration for Browser Logging
 *
 * Feature: 001-browser-log-sync
 * Provides React context, hooks, and error boundary for browser logging.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
  type PropsWithChildren,
  type ErrorInfo,
  type ReactElement,
} from 'react';
import type { IBrowserLogger, BrowserLogEntry, LogContext } from './types';

/**
 * Browser logger instance reference for React integration
 */
let browserLoggerInstance: IBrowserLogger | null = null;

/**
 * Set the browser logger instance for React integration
 * Called automatically by the Next.js plugin or manually if needed
 */
export function setBrowserLogger(logger: IBrowserLogger): void {
  browserLoggerInstance = logger;
}

/**
 * Get the browser logger instance for React integration
 */
export function getBrowserLogger(): IBrowserLogger | null {
  return browserLoggerInstance;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * React Logger Context Type
 */
interface LoggerContextType {
  /** The browser logger instance */
  logger: IBrowserLogger;
  /** Flush logs to server */
  flush: () => Promise<void>;
  /** Clear stored logs */
  clearLogs: () => void;
  /** Get stored logs */
  getLogs: () => BrowserLogEntry[];
}

/**
 * Default values for LoggerContext
 */
const defaultContext: LoggerContextType = {
  logger: {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    log: () => {},
    getStoredLogs: () => [],
    clearStoredLogs: () => {},
    flush: async () => {},
  },
  flush: async () => {},
  clearLogs: () => {},
  getLogs: () => [],
};

/**
 * Logger React Context
 */
const LoggerContext = createContext<LoggerContextType>(defaultContext);

// ============================================================================
// Logger Provider
// ============================================================================

/**
 * Props for LoggerProvider component
 */
interface LoggerProviderProps extends PropsWithChildren {
  /** Optional custom logger instance */
  logger?: IBrowserLogger;
  /** Callback when error boundary catches an error */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom fallback UI for error boundary */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
}

/**
 * Logger Provider Component
 *
 * Provides the browser logger context to child components.
 * Automatically sets up the browser logger for use with React hooks.
 *
 * @example
 * ```tsx
 * import { LoggerProvider } from '@zaob/glean-logger/react';
 *
 * function App() {
 *   return (
 *     <LoggerProvider>
 *       <YourApp />
 *     </LoggerProvider>
 *   );
 * }
 * ```
 */
export function LoggerProvider({
  children,
  logger,
  onError,
  fallback,
}: LoggerProviderProps): ReactElement {
  // Use provided logger or get from global instance
  const actualLogger = logger || browserLoggerInstance;

  // Setup global logger instance if provided
  useEffect(() => {
    if (actualLogger && !browserLoggerInstance) {
      setBrowserLogger(actualLogger);
    }
  }, [actualLogger]);

  // Context value
  const contextValue = useMemo<LoggerContextType>(
    () => ({
      logger: actualLogger || defaultContext.logger,
      flush: async () => {
        if (actualLogger) {
          await actualLogger.flush();
        }
      },
      clearLogs: () => {
        if (actualLogger) {
          actualLogger.clearStoredLogs();
        }
      },
      getLogs: () => {
        if (actualLogger) {
          return actualLogger.getStoredLogs();
        }
        return [];
      },
    }),
    [actualLogger]
  );

  return <LoggerContext.Provider value={contextValue}>{children}</LoggerContext.Provider>;
}

// ============================================================================
// useLogger Hook
// ============================================================================

/**
 * Hook to access the browser logger in React components
 *
 * @example
 * ```tsx
 * import { useLogger } from '@zaob/glean-logger/react';
 *
 * function MyComponent() {
 *   const logger = useLogger();
 *
 *   const handleClick = () => {
 *     logger.info('Button clicked', { buttonId: 'submit' });
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useLogger(): IBrowserLogger {
  const context = useContext(LoggerContext);
  return context.logger;
}

/**
 * Hook to access logger context utilities
 *
 * @example
 * ```tsx
 * import { useLoggerContext } from '@zaob/glean-logger/react';
 *
 * function LogsViewer() {
 *   const { getLogs, clearLogs, flush } = useLoggerContext();
 *   const logs = getLogs();
 *
 *   return (
 *     <div>
 *       <button onClick={flush}>Flush Logs</button>
 *       <button onClick={clearLogs}>Clear Logs</button>
 *       <pre>{JSON.stringify(logs, null, 2)}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLoggerContext(): Omit<LoggerContextType, 'logger'> {
  const context = useContext(LoggerContext);
  const { logger: _, ...rest } = context;
  return rest;
}

// ============================================================================
// Logger Error Boundary
// ============================================================================

/**
 * State for LoggerErrorBoundary component
 */
interface LoggerErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
  /** Error info with component stack */
  errorInfo: ErrorInfo | null;
}

/**
 * Props for LoggerErrorBoundary component
 */
interface LoggerErrorBoundaryProps extends PropsWithChildren {
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Custom fallback UI */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  /** Logger instance to use for error logging */
  logger?: IBrowserLogger;
}

/**
 * Logger Error Boundary Component
 *
 * Catches React rendering errors and logs them using the browser logger.
 * Also sends errors to the server via the transport layer.
 *
 * @example
 * ```tsx
 * import { LoggerErrorBoundary } from '@zaob/glean-logger/react';
 *
 * function App() {
 *   return (
 *     <LoggerErrorBoundary
 *       fallback={<div>Something went wrong</div>}
 *       onError={(error, info) => console.error(error, info)}
 *     >
 *       <YourApp />
 *     </LoggerErrorBoundary>
 *   );
 * }
 * ```
 */
export class LoggerErrorBoundary extends React.Component<
  LoggerErrorBoundaryProps,
  LoggerErrorBoundaryState
> {
  constructor(props: LoggerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): LoggerErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, logger } = this.props;

    // Log the error using the logger
    const logLogger = logger || browserLoggerInstance;
    if (logLogger) {
      const context: LogContext = {
        componentStack: errorInfo.componentStack || 'No stack trace',
        errorName: error.name,
      };

      // Log to browser console and localStorage
      logLogger.error(`React Error: ${error.message}`, context);

      // Also log using the error source for server sync
      logLogger.error(error.message, {
        ...context,
        source: 'error' as const,
        errorName: error.name,
        errorMessage: error.message,
      });
    }

    // Call optional onError callback
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  override render(): React.ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = this.props;

    if (hasError && error) {
      // Custom fallback as function
      if (typeof fallback === 'function') {
        return fallback(error, this.handleReset);
      }

      // Custom fallback as node
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: '20px',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            backgroundColor: '#fff5f5',
            color: '#c92a2a',
          }}
        >
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          {errorInfo?.componentStack && (
            <pre
              style={{
                fontSize: '12px',
                overflow: 'auto',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
              }}
            >
              {errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#c92a2a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Combined provider that includes both LoggerProvider and LoggerErrorBoundary
 *
 * @example
 * ```tsx
 * import { Logger } from '@zaob/glean-logger/react';
 *
 * function App() {
 *   return (
 *     <Logger>
 *       <YourApp />
 *     </Logger>
 *   );
 * }
 * ```
 */
export function Logger(props: LoggerProviderProps): ReactElement {
  const { children, ...rest } = props;

  return (
    <LoggerProvider {...rest}>
      <LoggerErrorBoundary>{children}</LoggerErrorBoundary>
    </LoggerProvider>
  );
}

// ============================================================================
// Named Exports
// ============================================================================

export type { LoggerProviderProps, LoggerErrorBoundaryProps, LoggerContextType };

// Re-export types for convenience
export type { IBrowserLogger, BrowserLogEntry, LogContext } from './types';
