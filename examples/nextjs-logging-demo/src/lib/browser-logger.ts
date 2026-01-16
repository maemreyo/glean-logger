import { getLoggingConfig, isLoggingEnabled, isBrowserExceptionsEnabled } from './config';

export interface BrowserLogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  type: 'exception' | 'request' | 'query' | 'console' | 'custom';
  message: string;
  metadata?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
}

// Simple browser-only logger - no server dependencies
interface BrowserLoggerInterface {
  debug: (message: string, metadata?: Record<string, unknown>) => void;
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
}

const createBrowserLogger = (name: string): BrowserLoggerInterface => ({
  debug: (message, metadata) => console.debug(`[${name}] [DEBUG] ${message}`, metadata),
  info: (message, metadata) => console.log(`[${name}] [INFO] ${message}`, metadata),
  warn: (message, metadata) => console.warn(`[${name}] [WARN] ${message}`, metadata),
  error: (message, metadata) => console.error(`[${name}] [ERROR] ${message}`, metadata),
});

// Create a single browser logger instance
const gleanLogger = createBrowserLogger('browser');

// Export for testing
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setGleanLogger(_mockLogger: BrowserLoggerInterface) {
  // Mock function for test compatibility
}

export function getGleanLogger() {
  return gleanLogger;
}

class BrowserLogger {
  private logs: BrowserLogEntry[] = [];
  private batchInterval: ReturnType<typeof setInterval> | null = null;
  private failedSubmissions: number = 0;
  private config = getLoggingConfig();

  constructor() {
    if (this.config.enabled) {
      this.startBatchSubmission();
    }
  }

  private startBatchSubmission() {
    if (typeof window === 'undefined') return;

    this.batchInterval = setInterval(() => {
      this.submitLogs();
    }, this.config.batchInterval);
  }

  private async submitLogs() {
    if (this.logs.length === 0) return;

    const logsToSubmit = [...this.logs];
    this.logs = [];

    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSubmit }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      this.failedSubmissions = 0;
      console.log(`[BrowserLogger] Submitted ${logsToSubmit.length} logs successfully`);
    } catch (error) {
      this.failedSubmissions++;
      console.error('[BrowserLogger] Failed to submit logs:', error);
      this.logs = [...logsToSubmit, ...this.logs];

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('log-error', {
            detail: { error, retryCount: logsToSubmit.length },
          })
        );
      }
    }
  }

  private addLog(entry: BrowserLogEntry) {
    if (!this.config.enabled) return;

    this.logs.push(entry);

    const context = {
      ...entry.metadata,
      type: entry.type,
      url: entry.url,
      userAgent: entry.userAgent,
    };

    switch (entry.level) {
      case 'debug':
        getGleanLogger().debug(entry.message, context);
        break;
      case 'info':
        getGleanLogger().info(entry.message, context);
        break;
      case 'warn':
        getGleanLogger().warn(entry.message, context);
        break;
      case 'error':
        getGleanLogger().error(entry.message, context);
        break;
    }

    if (this.logs.length > this.config.batchSize) {
      this.submitLogs();
    }
  }

  log(
    level: BrowserLogEntry['level'],
    type: BrowserLogEntry['type'],
    message: string,
    metadata?: Record<string, unknown>
  ) {
    const entry: BrowserLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      type,
      message,
      metadata,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    this.addLog(entry);
    console.log(`[${level.toUpperCase()}] ${message}`, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', 'console', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', 'console', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', 'console', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>) {
    this.log('error', 'console', message, metadata);
  }

  logException(error: Error, errorInfo?: Record<string, unknown>) {
    this.log('error', 'exception', error.message, {
      stack: error.stack,
      ...errorInfo,
    });
  }

  logRequest(
    request: { method: string; url: string; body?: unknown },
    response?: { status: number; body?: unknown }
  ) {
    this.log('debug', 'request', `${request.method} ${request.url}`, {
      requestBody: request.body,
      responseStatus: response?.status,
      responseBody: response?.body,
    });
  }

  logQuery(
    queryKey: readonly unknown[],
    status: 'success' | 'error',
    duration: number,
    error?: Error
  ) {
    this.log(status === 'error' ? 'error' : 'debug', 'query', `Query ${queryKey}`, {
      queryKey,
      duration: `${duration}ms`,
      error: error?.message,
    });
  }

  flush() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    this.submitLogs();
  }

  getFailedSubmissionCount() {
    return this.failedSubmissions;
  }
}

export const browserLogger = new BrowserLogger();

export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  if (!isLoggingEnabled()) return;
  if (!isBrowserExceptionsEnabled()) return;

  window.onerror = (message, source, lineno, colno, error) => {
    browserLogger.logException(error || new Error(message as string), {
      source,
      lineno,
      colno,
      type: 'uncaught',
    });
    return false;
  };

  window.onunhandledrejection = event => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    browserLogger.logException(error, {
      type: 'unhandled-rejection',
    });
  };
}
