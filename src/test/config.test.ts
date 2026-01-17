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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getConfig,
  isLoggingEnabled,
  shouldLog,
  getLogDir,
  isDevelopment,
  isProduction,
  getEnvironment,
  resetConfig,
  getBatchingConfig,
  getRetryConfig,
  getTransportConfig,
  DEFAULT_BATCHING,
  DEFAULT_RETRY,
} from '../config';

describe('config.ts', () => {
  const originalEnv: NodeJS.ProcessEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    resetConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
  });

  describe('getConfig', () => {
    it('should return cached config on subsequent calls', () => {
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toBe(config2);
    });

    it('should use environment variables', () => {
      process.env.NEXT_PUBLIC_LOG_LEVEL = 'info';
      process.env.NEXT_PUBLIC_LOG_ENABLED = 'false';
      resetConfig();

      const config = getConfig();
      expect(config.level).toBe('info');
      expect(config.enabled).toBe(false);
    });
  });

  describe('isLoggingEnabled', () => {
    it('should return true by default', () => {
      expect(isLoggingEnabled()).toBe(true);
    });

    it('should return false when logging is disabled', () => {
      process.env.NEXT_PUBLIC_LOG_ENABLED = 'false';
      resetConfig();
      expect(isLoggingEnabled()).toBe(false);
    });
  });

  describe('shouldLog', () => {
    it('should return false when logging is disabled', () => {
      process.env.NEXT_PUBLIC_LOG_ENABLED = 'false';
      resetConfig();
      expect(shouldLog('debug')).toBe(false);
    });

    it('should return true for debug when level is debug', () => {
      expect(shouldLog('debug')).toBe(true);
    });

    it('should return false for debug when level is info', () => {
      process.env.NEXT_PUBLIC_LOG_LEVEL = 'info';
      resetConfig();
      expect(shouldLog('debug')).toBe(false);
    });

    it('should return true for info when level is info', () => {
      process.env.NEXT_PUBLIC_LOG_LEVEL = 'info';
      resetConfig();
      expect(shouldLog('info')).toBe(true);
    });
  });

  describe('getLogDir', () => {
    it('should return default log directory', () => {
      expect(getLogDir()).toBe('./_logs');
    });

    it('should use custom log directory from env', () => {
      process.env.LOG_DIR = '/custom/logs';
      resetConfig();
      expect(getLogDir()).toBe('/custom/logs');
    });
  });

  describe('isDevelopment', () => {
    it('should return true when NODE_ENV is development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(isDevelopment()).toBe(true);
    });

    it('should return false when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(isProduction()).toBe(true);
    });

    it('should return false when NODE_ENV is development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(isProduction()).toBe(false);
    });
  });

  describe('getEnvironment', () => {
    it('should return NODE_ENV value', () => {
      vi.stubEnv('NODE_ENV', 'staging');
      expect(getEnvironment()).toBe('staging');
    });

    it('should return development when NODE_ENV is falsy', () => {
      // Test that the function returns 'development' when NODE_ENV is not set or falsy
      vi.stubEnv('NODE_ENV', '');
      expect(getEnvironment()).toBe('development');
    });
  });

  describe('resetConfig', () => {
    it('should clear cached config', () => {
      const config1 = getConfig();
      resetConfig();

      process.env.NEXT_PUBLIC_LOG_LEVEL = 'warn';
      const config2 = getConfig();

      expect(config1.level).toBe('debug');
      expect(config2.level).toBe('warn');
    });
  });

  describe('getBatchingConfig', () => {
    it('should return default config when no env vars', () => {
      const config = getBatchingConfig();
      expect(config.mode).toBe('time');
      expect(config.timeIntervalMs).toBe(3000);
      expect(config.countThreshold).toBe(10);
    });

    it('should override mode from LOGGER_BATCH_MODE', () => {
      process.env.LOGGER_BATCH_MODE = 'count';
      const config = getBatchingConfig();
      expect(config.mode).toBe('count');
    });

    it('should override timeIntervalMs from LOGGER_BATCH_TIME_MS', () => {
      process.env.LOGGER_BATCH_TIME_MS = '5000';
      const config = getBatchingConfig();
      expect(config.timeIntervalMs).toBe(5000);
    });

    it('should override countThreshold from LOGGER_BATCH_COUNT', () => {
      process.env.LOGGER_BATCH_COUNT = '20';
      const config = getBatchingConfig();
      expect(config.countThreshold).toBe(20);
    });

    it('should use default for invalid timeIntervalMs', () => {
      process.env.LOGGER_BATCH_TIME_MS = 'invalid';
      const config = getBatchingConfig();
      expect(config.timeIntervalMs).toBe(3000);
    });

    it('should use default for negative values', () => {
      process.env.LOGGER_BATCH_TIME_MS = '-100';
      const config = getBatchingConfig();
      expect(config.timeIntervalMs).toBe(3000);
    });
  });

  describe('getRetryConfig', () => {
    it('should return default config when no env vars', () => {
      const config = getRetryConfig();
      expect(config.enabled).toBe(true);
      expect(config.maxRetries).toBe(3);
      expect(config.initialDelayMs).toBe(1000);
      expect(config.maxDelayMs).toBe(30000);
      expect(config.backoffMultiplier).toBe(2);
    });

    it('should override enabled from LOGGER_RETRY_ENABLED', () => {
      process.env.LOGGER_RETRY_ENABLED = 'false';
      const config = getRetryConfig();
      expect(config.enabled).toBe(false);
    });

    it('should override maxRetries from LOGGER_RETRY_MAX_RETRIES', () => {
      process.env.LOGGER_RETRY_MAX_RETRIES = '5';
      const config = getRetryConfig();
      expect(config.maxRetries).toBe(5);
    });

    it('should override initialDelayMs from LOGGER_RETRY_INITIAL_DELAY_MS', () => {
      process.env.LOGGER_RETRY_INITIAL_DELAY_MS = '2000';
      const config = getRetryConfig();
      expect(config.initialDelayMs).toBe(2000);
    });

    it('should override maxDelayMs from LOGGER_RETRY_MAX_DELAY_MS', () => {
      process.env.LOGGER_RETRY_MAX_DELAY_MS = '60000';
      const config = getRetryConfig();
      expect(config.maxDelayMs).toBe(60000);
    });

    it('should override backoffMultiplier from LOGGER_RETRY_BACKOFF_MULTIPLIER', () => {
      process.env.LOGGER_RETRY_BACKOFF_MULTIPLIER = '3';
      const config = getRetryConfig();
      expect(config.backoffMultiplier).toBe(3);
    });

    it('should use default for negative maxRetries', () => {
      process.env.LOGGER_RETRY_MAX_RETRIES = '-1';
      const config = getRetryConfig();
      expect(config.maxRetries).toBe(3);
    });
  });

  describe('getTransportConfig', () => {
    it('should return complete transport config with defaults', () => {
      const config = getTransportConfig();

      expect(config).toHaveProperty('endpoint');
      expect(config).toHaveProperty('batch');
      expect(config).toHaveProperty('retry');

      expect(config.endpoint).toBe('/api/logger');
      expect(config.batch).toHaveProperty('mode');
      expect(config.batch).toHaveProperty('timeIntervalMs');
      expect(config.batch).toHaveProperty('countThreshold');
      expect(config.retry).toHaveProperty('enabled');
      expect(config.retry).toHaveProperty('maxRetries');
      expect(config.retry).toHaveProperty('initialDelayMs');
      expect(config.retry).toHaveProperty('maxDelayMs');
      expect(config.retry).toHaveProperty('backoffMultiplier');
    });

    it('should merge env vars into config', () => {
      process.env.LOGGER_BATCH_MODE = 'count';
      process.env.LOGGER_BATCH_COUNT = '15';
      process.env.LOGGER_RETRY_ENABLED = 'false';
      process.env.LOGGER_TRANSPORT_ENDPOINT = '/api/logs';

      const config = getTransportConfig();

      expect(config.endpoint).toBe('/api/logs');
      expect(config.batch.mode).toBe('count');
      expect(config.batch.countThreshold).toBe(15);
      expect(config.retry.enabled).toBe(false);
    });
  });

  describe('DEFAULT_BATCHING', () => {
    it('should have required properties', () => {
      expect(DEFAULT_BATCHING.mode).toBe('time');
      expect(typeof DEFAULT_BATCHING.timeIntervalMs).toBe('number');
      expect(typeof DEFAULT_BATCHING.countThreshold).toBe('number');
      expect(DEFAULT_BATCHING.timeIntervalMs).toBeGreaterThan(0);
      expect(DEFAULT_BATCHING.countThreshold).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_RETRY', () => {
    it('should have required properties', () => {
      expect(typeof DEFAULT_RETRY.enabled).toBe('boolean');
      expect(typeof DEFAULT_RETRY.maxRetries).toBe('number');
      expect(typeof DEFAULT_RETRY.initialDelayMs).toBe('number');
      expect(typeof DEFAULT_RETRY.maxDelayMs).toBe('number');
      expect(typeof DEFAULT_RETRY.backoffMultiplier).toBe('number');
      expect(DEFAULT_RETRY.maxRetries).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_RETRY.initialDelayMs).toBeGreaterThan(0);
      expect(DEFAULT_RETRY.backoffMultiplier).toBeGreaterThan(1);
    });
  });
});
