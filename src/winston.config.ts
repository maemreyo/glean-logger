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
 * Winston configuration for API Logger Integration
 *
 * Feature: 011-api-logger
 * User Story 2: Server-Side Winston File Logging
 *
 * Configures Winston transports for:
 * - Daily rotating file logs
 * - Console output (colored in dev, JSON in prod)
 * - Separate transports for combined, API, error, exceptions, rejections
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { LoggerConfig } from './types';
import { getConfig, getLogDir, isDevelopment } from './config';

/**
 * Get console transport configuration
 */
export function getConsoleTransport() {
  return new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp }) => {
        const config = getConfig();

        if (isDevelopment() && config.developmentFormat) {
          return `${timestamp} [${level}] ${message}`;
        }

        return JSON.stringify({
          '@timestamp': timestamp,
          level: level.toUpperCase(),
          message,
        });
      })
    ),
  });
}

/**
 * Get daily rotate file transport configuration
 */
export function getDailyRotateTransport(filename: string, level: string) {
  const logDir = getLogDir();
  const config = getConfig();

  return new DailyRotateFile({
    dirname: logDir,
    filename: `${filename}.%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: config.maxFileSize,
    maxFiles: config.maxFiles,
    level,
    format: winston.format.json(),
  });
}

/**
 * Create all Winston transports
 */
export function createTransports() {
  const config = getConfig();
  const transports: winston.transport[] = [];

  transports.push(getConsoleTransport());

  transports.push(getDailyRotateTransport('combined', 'debug'));
  transports.push(getDailyRotateTransport('api', 'info'));
  transports.push(getDailyRotateTransport('error', 'error'));

  return transports;
}

/**
 * Get Winston logger configuration object
 */
export function getWinstonConfig(): winston.LoggerOptions {
  const config = getConfig();

  return {
    level: config.level,
    transports: createTransports(),
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true,
    silent: false,
  };
}
