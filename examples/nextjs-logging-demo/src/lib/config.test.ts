import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLoggingConfig,
  isLoggingEnabled,
  isBrowserExceptionsEnabled,
  isBrowserRequestsEnabled,
  isBrowserQueriesEnabled,
  isServerLogsEnabled,
  isServerApiEnabled,
} from './config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEBUG_MODE', 'true');
    vi.stubEnv('LOG_BATCH_SIZE', '');
    vi.stubEnv('LOG_BATCH_INTERVAL', '');
    vi.stubEnv('LOG_LEVEL', '');
    vi.stubEnv('DEBUG_BROWSER_EXCEPTIONS', '');
    vi.stubEnv('DEBUG_BROWSER_REQUESTS', '');
    vi.stubEnv('DEBUG_BROWSER_QUERIES', '');
    vi.stubEnv('DEBUG_SERVER_LOGS', '');
    vi.stubEnv('DEBUG_SERVER_API', '');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getLoggingConfig', () => {
    it('should return enabled config in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_BROWSER_EXCEPTIONS', 'true');

      const config = getLoggingConfig();

      expect(config.enabled).toBe(true);
      expect(config.browserExceptions).toBe(true);
    });

    it('should return disabled config when DEBUG_MODE is false', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'false');

      const config = getLoggingConfig();

      expect(config.enabled).toBe(false);
      expect(config.browserExceptions).toBe(false);
    });

    it('should be disabled in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DEBUG_MODE', 'true');

      const config = getLoggingConfig();

      expect(config.enabled).toBe(false);
    });

    it('should parse batch size correctly', () => {
      vi.stubEnv('LOG_BATCH_SIZE', '50');

      const config = getLoggingConfig();

      expect(config.batchSize).toBe(50);
    });

    it('should parse batch interval correctly', () => {
      vi.stubEnv('LOG_BATCH_INTERVAL', '3000');

      const config = getLoggingConfig();

      expect(config.batchInterval).toBe(3000);
    });

    it('should use default values when env vars are not set', () => {
      // Clear all logging-related env vars
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('LOG_BATCH_SIZE', '');
      vi.stubEnv('LOG_BATCH_INTERVAL', '');
      vi.stubEnv('LOG_LEVEL', '');
      vi.stubEnv('DEBUG_BROWSER_EXCEPTIONS', '');
      vi.stubEnv('DEBUG_BROWSER_REQUESTS', '');
      vi.stubEnv('DEBUG_BROWSER_QUERIES', '');
      vi.stubEnv('DEBUG_SERVER_LOGS', '');
      vi.stubEnv('DEBUG_SERVER_API', '');
      vi.stubEnv('NEXT_PUBLIC_API_URL', '');

      const config = getLoggingConfig();

      expect(config.batchSize).toBe(10);
      expect(config.batchInterval).toBe(5000);
    });

    it('should parse log level correctly', () => {
      vi.stubEnv('LOG_LEVEL', 'error');

      const config = getLoggingConfig();

      expect(config.level).toBe('error');
    });
  });

  describe('isLoggingEnabled', () => {
    it('should return true when DEBUG_MODE is true and NODE_ENV is development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');

      expect(isLoggingEnabled()).toBe(true);
    });

    it('should return false when DEBUG_MODE is false', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'false');

      expect(isLoggingEnabled()).toBe(false);
    });

    it('should return false in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DEBUG_MODE', 'true');

      expect(isLoggingEnabled()).toBe(false);
    });
  });

  describe('isBrowserExceptionsEnabled', () => {
    it('should return true when DEBUG_MODE and DEBUG_BROWSER_EXCEPTIONS are true', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_BROWSER_EXCEPTIONS', 'true');

      expect(isBrowserExceptionsEnabled()).toBe(true);
    });

    it('should return false when DEBUG_BROWSER_EXCEPTIONS is false', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_BROWSER_EXCEPTIONS', 'false');

      expect(isBrowserExceptionsEnabled()).toBe(false);
    });
  });

  describe('isBrowserRequestsEnabled', () => {
    it('should return true when enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_BROWSER_REQUESTS', 'true');

      expect(isBrowserRequestsEnabled()).toBe(true);
    });

    it('should return false when not enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_BROWSER_REQUESTS', 'false');

      expect(isBrowserRequestsEnabled()).toBe(false);
    });

    it('should return false when DEBUG_MODE is false', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'false');
      vi.stubEnv('DEBUG_BROWSER_REQUESTS', 'true');

      expect(isBrowserRequestsEnabled()).toBe(false);
    });
  });

  describe('isBrowserQueriesEnabled', () => {
    it('should return true when enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_BROWSER_QUERIES', 'true');

      expect(isBrowserQueriesEnabled()).toBe(true);
    });

    it('should return false when not enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_BROWSER_QUERIES', 'false');

      expect(isBrowserQueriesEnabled()).toBe(false);
    });
  });

  describe('isServerLogsEnabled', () => {
    it('should return true when enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_SERVER_LOGS', 'true');

      expect(isServerLogsEnabled()).toBe(true);
    });

    it('should return false when not enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_SERVER_LOGS', 'false');

      expect(isServerLogsEnabled()).toBe(false);
    });
  });

  describe('isServerApiEnabled', () => {
    it('should return true when enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_SERVER_API', 'true');

      expect(isServerApiEnabled()).toBe(true);
    });

    it('should return false when not enabled', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEBUG_MODE', 'true');
      vi.stubEnv('DEBUG_SERVER_API', 'false');

      expect(isServerApiEnabled()).toBe(false);
    });
  });
});
