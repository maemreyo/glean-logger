import { useLogger, type IBrowserLogger, type LogContext } from '@zaob/glean-logger/react';

export interface BrowserLogInput {
  level: 'debug' | 'info' | 'warn' | 'error';
  type: 'exception' | 'request' | 'query' | 'console' | 'custom';
  message: string;
  metadata?: Record<string, unknown>;
}

export function logException(error: Error, errorInfo?: Record<string, unknown>): void {
  const logger = getBrowserLoggerInstance();
  logger.error(error.message, {
    stack: error.stack,
    type: 'exception',
    ...(errorInfo as LogContext),
  });
}

export function logRequest(
  request: { method: string; url: string; body?: unknown },
  response?: { status: number; body?: unknown }
): void {
  const logger = getBrowserLoggerInstance();
  logger.debug(`${request.method} ${request.url}`, {
    type: 'request',
    requestBody: request.body,
    responseStatus: response?.status,
    responseBody: response?.body,
  } as LogContext);
}

export function logQuery(
  queryKey: readonly unknown[],
  status: 'success' | 'error',
  duration: number,
  error?: Error
): void {
  const logger = getBrowserLoggerInstance();
  const level = status === 'error' ? 'error' : 'debug';
  logger.log(level, `Query ${queryKey}`, {
    type: 'query',
    queryKey,
    duration: `${duration}ms`,
    error: error?.message,
  } as LogContext);
}

export function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, unknown>
): void {
  const logger = getBrowserLoggerInstance();
  logger.log(level, message, { type: 'custom', ...metadata } as LogContext);
}

function getBrowserLoggerInstance(): IBrowserLogger {
  return useLogger();
}

export const browserLogger = {
  debug: (message: string, metadata?: Record<string, unknown>) =>
    getBrowserLoggerInstance().debug(message, metadata as LogContext),
  info: (message: string, metadata?: Record<string, unknown>) =>
    getBrowserLoggerInstance().info(message, metadata as LogContext),
  warn: (message: string, metadata?: Record<string, unknown>) =>
    getBrowserLoggerInstance().warn(message, metadata as LogContext),
  error: (message: string, metadata?: Record<string, unknown>) =>
    getBrowserLoggerInstance().error(message, metadata as LogContext),
  log,
  logException,
  logRequest,
  logQuery,
  getStoredLogs: () => getBrowserLoggerInstance().getStoredLogs(),
  clearStoredLogs: () => getBrowserLoggerInstance().clearStoredLogs(),
  flush: () => getBrowserLoggerInstance().flush(),
};
