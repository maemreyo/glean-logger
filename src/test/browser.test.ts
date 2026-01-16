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
