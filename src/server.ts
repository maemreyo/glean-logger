/**
 * Server-side Winston logger implementation
 *
 * Feature: 011-api-logger
 * User Story 2: Server-Side Winston File Logging
 *
 * This module provides:
 * - IServerLogger interface implementation using Winston
 * - Child logger support for persistent context
 * - Console output (colored in dev, JSON in prod)
 * - File output with daily rotation
 */

import winston from 'winston';

import { shouldLog, getConfig, isDevelopment } from './config';
import type { IServerLogger, LogContext, LogLevel } from './types';
import { getWinstonConfig } from './winston.config';

/**
 * Add context to log entry
 */
function addContext(entry: Record<string, unknown>, context?: LogContext): void {
  if (context && Object.keys(context).length > 0) {
    Object.assign(entry, context);
  }
}

/**
 * Server logger implementation
 */
class ServerLoggerImpl implements IServerLogger {
  private winston: winston.Logger;
  private context: Record<string, unknown> = {};
  private loggerName: string;

  constructor(options?: { name?: string; level?: LogLevel }) {
    const config = getConfig();
    this.loggerName = options?.name || 'server-logger';

    this.winston = winston.createLogger({
      ...getWinstonConfig(),
      level: options?.level ?? config.level,
      defaultMeta: () => this.context,
    });
  }

  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, this.formatContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, this.formatContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, this.formatContext(context));
  }

  error(message: string, context?: LogContext): void {
    this.winston.error(message, this.formatContext(context));
  }

  fatal(message: string, context?: LogContext): void {
    // Winston doesn't have fatal, use error instead
    this.winston.error(message, this.formatContext(context));
  }

  child(context: LogContext): IServerLogger {
    const child = new ServerLoggerImpl({
      name: this.loggerName,
    });

    child.context = { ...this.context, ...context };

    return child;
  }

  with(context: LogContext): IServerLogger {
    const child = new ServerLoggerImpl({
      name: this.loggerName,
    });

    child.context = { ...this.context, ...context };

    return child;
  }

  private formatContext(context?: LogContext): Record<string, unknown> | undefined {
    if (!context || Object.keys(context).length === 0) {
      return undefined;
    }

    return context;
  }

  static flush(): void {
    // Winston loggers container doesn't have forEach, skip flush for now
    // The loggers will flush automatically when the process exits
  }
}

/**
 * Create server logger instance
 */
function createServerLogger(options?: { name?: string; level?: LogLevel }): IServerLogger {
  return new ServerLoggerImpl(options);
}

/**
 * Export server logger
 */
export default createServerLogger;
export { createServerLogger, ServerLoggerImpl };
