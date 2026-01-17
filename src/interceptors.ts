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
 * Console and Error Interceptors for Browser Logging
 *
 * Feature: 001-browser-log-sync
 * Automatically captures console.log calls, window.onerror events,
 * and unhandled promise rejections for server-side logging.
 */

import type { IBrowserLogger, LogContext } from './types';

/**
 * Original console methods saved for restoration
 */
interface ConsoleMethods {
  log: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * State for interceptors
 */
interface InterceptorState {
  /** Whether interceptors are currently active */
  active: boolean;
  /** Original console methods */
  originalConsole: ConsoleMethods | null;
  /** The browser logger instance */
  logger: IBrowserLogger | null;
  /** Handler for unhandled promise rejections */
  unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null;
  /** Handler for global errors */
  errorHandler: ((event: ErrorEvent) => void) | null;
}

/**
 * Global interceptor state
 */
const state: InterceptorState = {
  active: false,
  originalConsole: null,
  logger: null,
  unhandledRejectionHandler: null,
  errorHandler: null,
};

/**
 * Guard to prevent re-entrant logging (infinite loop)
 * When true, we're inside an interceptor and should not call logger methods
 */
let inInterceptor = false;

/**
 * Convert console arguments to a log message and context
 */
function argsToMessageAndContext(args: unknown[]): { message: string; context: LogContext } {
  // Filter out undefined values and join the rest
  const parts = args
    .filter(arg => arg !== undefined)
    .map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    });

  const message = parts.join(' ') || '[console.log]';

  // Extract structured data from arguments
  const context: LogContext = {};
  const stringArgs = args.filter((arg): arg is string | object => arg !== undefined);

  if (stringArgs.length > 1) {
    // Check if last argument is a context object
    const lastArg = stringArgs[stringArgs.length - 1];
    if (typeof lastArg === 'object' && !Array.isArray(lastArg)) {
      // Merge into context
      Object.assign(context, lastArg);
      // Remove the context from message parts
      parts.pop();
    }
  }

  // Add raw arguments as context for debugging
  if (args.length > 0) {
    context.consoleArgs = args.map(arg => {
      if (typeof arg === 'function') {
        return `[Function: ${arg.name || 'anonymous'}]`;
      }
      return String(arg);
    }) as unknown as string;
  }

  return { message, context };
}

/**
 * Create a console interceptor for a specific log level
 */
function createConsoleInterceptor(
  level: 'debug' | 'info' | 'warn' | 'error',
  originalFn: (...args: unknown[]) => void
): (...args: unknown[]) => void {
  return (...args: unknown[]): void => {
    // Call original console method first
    originalFn(...args);

    // Guard against re-entrant logging to prevent infinite loop
    // If we're already in an interceptor, don't call the logger again
    if (inInterceptor) {
      return;
    }

    // Set guard flag before calling logger
    inInterceptor = true;

    try {
      // Also log through our logger if active
      if (state.active && state.logger) {
        const { message, context } = argsToMessageAndContext(args);
        const logContext: LogContext = {
          ...context,
          source: 'console',
          consoleMethod: level,
        };

        switch (level) {
          case 'debug':
            state.logger.debug(message, logContext);
            break;
          case 'info':
            state.logger.info(message, logContext);
            break;
          case 'warn':
            state.logger.warn(message, logContext);
            break;
          case 'error':
            state.logger.error(message, logContext);
            break;
        }
      }
    } finally {
      // Always reset guard flag
      inInterceptor = false;
    }
  };
}

/**
 * Install console interceptors
 */
function installConsoleInterceptors(): void {
  if (typeof console === 'undefined') {
    return;
  }

  // Save original methods
  state.originalConsole = {
    log: console.log.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  // Replace console methods with interceptors
  console.log = createConsoleInterceptor('debug', state.originalConsole.log);
  console.debug = createConsoleInterceptor('debug', state.originalConsole.debug);
  console.info = createConsoleInterceptor('info', state.originalConsole.info);
  console.warn = createConsoleInterceptor('warn', state.originalConsole.warn);
  console.error = createConsoleInterceptor('error', state.originalConsole.error);
}

/**
 * Restore original console methods
 */
function restoreConsoleMethods(): void {
  if (state.originalConsole) {
    console.log = state.originalConsole.log;
    console.debug = state.originalConsole.debug;
    console.info = state.originalConsole.info;
    console.warn = state.originalConsole.warn;
    console.error = state.originalConsole.error;
    state.originalConsole = null;
  }
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  if (state.active && state.logger) {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');

    state.logger.error(message, {
      source: 'error',
      errorType: 'unhandled-promise-rejection',
      errorName: reason instanceof Error ? reason.name : 'PromiseRejection',
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  }

  // Don't prevent default - let other handlers run
}

/**
 * Handle global JavaScript errors
 */
function handleErrorEvent(event: ErrorEvent): void {
  if (state.active && state.logger) {
    const message = event.message || 'JavaScript Error';

    state.logger.error(message, {
      source: 'error',
      errorType: 'global-error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }

  // Don't prevent default - let other handlers run
}

/**
 * Install global error handlers
 */
function installErrorHandlers(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Handle unhandled promise rejections
  state.unhandledRejectionHandler = handleUnhandledRejection;
  window.addEventListener('unhandledrejection', state.unhandledRejectionHandler);

  // Handle global errors
  state.errorHandler = handleErrorEvent;
  window.addEventListener('error', state.errorHandler);
}

/**
 * Remove global error handlers
 */
function removeErrorHandlers(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (state.unhandledRejectionHandler) {
    window.removeEventListener('unhandledrejection', state.unhandledRejectionHandler);
    state.unhandledRejectionHandler = null;
  }

  if (state.errorHandler) {
    window.removeEventListener('error', state.errorHandler);
    state.errorHandler = null;
  }
}

/**
 * Install all interceptors (console and error handlers)
 *
 * @param logger - The browser logger instance to use for capturing logs
 *
 * @example
 * ```typescript
 * import { installInterceptors, getBrowserLogger } from '@zaob/glean-logger';
 *
 * // Install interceptors using the browser logger
 * installInterceptors(getBrowserLogger());
 * ```
 */
export function installInterceptors(logger: IBrowserLogger): void {
  if (state.active) {
    // Already installed, just update the logger
    state.logger = logger;
    return;
  }

  state.logger = logger;
  state.active = true;

  installConsoleInterceptors();
  installErrorHandlers();
}

/**
 * Uninstall all interceptors and restore original behavior
 *
 * @example
 * ```typescript
 * import { uninstallInterceptors } from '@zaob/glean-logger';
 *
 * // Uninstall interceptors
 * uninstallInterceptors();
 * ```
 */
export function uninstallInterceptors(): void {
  if (!state.active) {
    return;
  }

  state.active = false;
  restoreConsoleMethods();
  removeErrorHandlers();
  state.logger = null;
}

/**
 * Check if interceptors are currently active
 */
export function areInterceptorsActive(): boolean {
  return state.active;
}

/**
 * Get the current logger instance being used by interceptors
 */
export function getInterceptorLogger(): IBrowserLogger | null {
  return state.logger;
}

// ============================================================================
// Named Exports
// ============================================================================

export type { ConsoleMethods, InterceptorState };
