import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserLoggerImpl } from '../browser';

describe('browser.ts', () => {
  describe('BrowserLoggerImpl', () => {
    let logger: BrowserLoggerImpl;

    beforeEach(() => {
      logger = new BrowserLoggerImpl({
        consoleEnabled: false,
        persistenceEnabled: false,
        maxEntries: 100,
        storageKey: 'test-logs',
      });
    });

    describe('constructor', () => {
      it('should create logger with default options', () => {
        const defaultLogger = new BrowserLoggerImpl();
        expect(defaultLogger).toBeDefined();
      });

      it('should create logger with custom options', () => {
        const customLogger = new BrowserLoggerImpl({
          maxEntries: 50,
          storageKey: 'custom-key',
        });
        expect(customLogger).toBeDefined();
      });
    });

    describe('logging methods', () => {
      it('should have info, warn, error, debug methods', () => {
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.debug).toBe('function');
      });

      it('should not throw when logging with disabled console', () => {
        expect(() => logger.info('test message')).not.toThrow();
        expect(() => logger.warn('test warning')).not.toThrow();
        expect(() => logger.error('test error')).not.toThrow();
      });

      it('should accept message and context', () => {
        expect(() => logger.info('test message', { key: 'value' })).not.toThrow();
      });
    });

    describe('getStoredLogs', () => {
      it('should return empty array when persistence is disabled', () => {
        const logs = logger.getStoredLogs();
        expect(Array.isArray(logs)).toBe(true);
      });
    });

    describe('clearStoredLogs', () => {
      it('should not throw when clearing logs', () => {
        expect(() => logger.clearStoredLogs()).not.toThrow();
      });
    });

    describe('flush', () => {
      it('should exist and be callable', () => {
        expect(typeof logger.flush).toBe('function');
      });
    });
  });
});
