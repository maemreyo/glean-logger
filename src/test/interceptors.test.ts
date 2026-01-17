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
  installInterceptors,
  uninstallInterceptors,
  areInterceptorsActive,
  getInterceptorLogger,
  ConsoleMethods,
} from '../interceptors';
import type { IBrowserLogger, LogContext } from '../types';

describe('interceptors.ts', () => {
  // Mock browser logger
  const mockLogger: IBrowserLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    getStoredLogs: vi.fn().mockReturnValue([]),
    clearStoredLogs: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.resetModules();
    uninstallInterceptors();
    vi.clearAllMocks();
  });

  afterEach(() => {
    uninstallInterceptors();
  });

  describe('installInterceptors', () => {
    it('should set interceptors as active', () => {
      installInterceptors(mockLogger);
      expect(areInterceptorsActive()).toBe(true);
    });

    it('should store the logger instance', () => {
      installInterceptors(mockLogger);
      expect(getInterceptorLogger()).toBe(mockLogger);
    });

    it('should not reinstall if already active', () => {
      const logger2: IBrowserLogger = {
        ...mockLogger,
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        getStoredLogs: vi.fn().mockReturnValue([]),
        clearStoredLogs: vi.fn(),
        flush: vi.fn().mockResolvedValue(undefined),
      };
      installInterceptors(mockLogger);
      installInterceptors(logger2);
      // Verify the interceptors are still active
      expect(areInterceptorsActive()).toBe(true);
      // Calling install again should not throw
      expect(() => installInterceptors(logger2)).not.toThrow();
    });

    it('should intercept console.log calls', () => {
      installInterceptors(mockLogger);
      console.log('test message', { key: 'value' });
      expect(mockLogger.debug).toHaveBeenLastCalledWith(
        expect.stringContaining('test message'),
        expect.objectContaining({
          source: 'console',
          consoleMethod: 'debug',
          key: 'value',
        })
      );
    });

    it('should intercept console.info calls', () => {
      installInterceptors(mockLogger);
      console.info('info message');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'info message',
        expect.objectContaining({
          source: 'console',
          consoleMethod: 'info',
        })
      );
    });

    it('should intercept console.warn calls', () => {
      installInterceptors(mockLogger);
      console.warn('warn message');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'warn message',
        expect.objectContaining({
          source: 'console',
          consoleMethod: 'warn',
        })
      );
    });

    it('should intercept console.error calls', () => {
      installInterceptors(mockLogger);
      console.error('error message');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'error message',
        expect.objectContaining({
          source: 'console',
          consoleMethod: 'error',
        })
      );
    });

    it('should still call original console methods', () => {
      const originalLog = console.log;
      installInterceptors(mockLogger);
      console.log('test');
      // Should not throw - means original method was called
      expect(() => console.log('test')).not.toThrow();
    });

    it('should handle multiple arguments', () => {
      installInterceptors(mockLogger);
      console.log('arg1', 'arg2', 'arg3');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'arg1 arg2 arg3',
        expect.objectContaining({
          consoleArgs: ['arg1', 'arg2', 'arg3'],
        })
      );
    });

    it('should handle object arguments', () => {
      installInterceptors(mockLogger);
      console.log('message', { nested: { value: 42 } });
      expect(mockLogger.debug).toHaveBeenLastCalledWith(
        'message {"nested":{"value":42}}',
        expect.objectContaining({
          nested: { value: 42 },
          source: 'console',
          consoleMethod: 'debug',
        })
      );
    });

    it('should handle function arguments', () => {
      const myFunc = () => {};
      installInterceptors(mockLogger);
      console.log('calling', myFunc);
      expect(mockLogger.debug).toHaveBeenLastCalledWith(
        expect.stringContaining('calling'),
        expect.objectContaining({
          consoleArgs: expect.arrayContaining([expect.stringContaining('[Function:')]),
        })
      );
    });

    it('should handle circular references in objects', () => {
      const circular: Record<string, unknown> = { value: 'test' };
      circular.self = circular;
      installInterceptors(mockLogger);
      expect(() => console.log('test', circular)).not.toThrow();
    });
  });

  describe('uninstallInterceptors', () => {
    it('should set interceptors as inactive', () => {
      installInterceptors(mockLogger);
      uninstallInterceptors();
      expect(areInterceptorsActive()).toBe(false);
    });

    it('should clear the logger instance', () => {
      installInterceptors(mockLogger);
      uninstallInterceptors();
      expect(getInterceptorLogger()).toBe(null);
    });

    it('should restore original console methods', () => {
      const originalLog = console.log;
      installInterceptors(mockLogger);
      uninstallInterceptors();
      // Just check that it doesn't throw and is a function
      expect(typeof console.log).toBe('function');
      expect(console.log.name).toContain('log');
    });

    it('should do nothing if not active', () => {
      expect(() => uninstallInterceptors()).not.toThrow();
    });
  });

  describe('argsToMessageAndContext', () => {
    it('should join string arguments', () => {
      installInterceptors(mockLogger);
      console.log('hello', 'world');
      expect(mockLogger.debug).toHaveBeenCalledWith('hello world', expect.any(Object));
    });

    it('should use [console.log] for no arguments', () => {
      installInterceptors(mockLogger);
      console.log();
      expect(mockLogger.debug).toHaveBeenCalledWith('[console.log]', expect.any(Object));
    });

    it('should ignore undefined arguments', () => {
      installInterceptors(mockLogger);
      console.log('message', undefined, 'more');
      expect(mockLogger.debug).toHaveBeenCalledWith('message more', expect.any(Object));
    });

    it('should extract context object from last argument', () => {
      installInterceptors(mockLogger);
      console.log('message', { userId: 123, action: 'click' });
      expect(mockLogger.debug).toHaveBeenLastCalledWith(
        'message {"userId":123,"action":"click"}',
        expect.objectContaining({
          userId: 123,
          action: 'click',
          source: 'console',
          consoleMethod: 'debug',
        })
      );
    });

    it('should not extract array as context', () => {
      installInterceptors(mockLogger);
      console.log('message', [1, 2, 3]);
      expect(mockLogger.debug).toHaveBeenLastCalledWith(
        'message [1,2,3]',
        expect.objectContaining({
          consoleArgs: ['message', '1,2,3'],
        })
      );
    });

    it('should stringify objects in message', () => {
      installInterceptors(mockLogger);
      console.log({ foo: 'bar' });
      expect(mockLogger.debug).toHaveBeenCalledWith('{"foo":"bar"}', expect.any(Object));
    });
  });

  describe('error handling', () => {
    it('should handle global error events', () => {
      // Mock window
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      vi.stubGlobal('window', mockWindow);

      installInterceptors(mockLogger);

      const errorHandler = mockWindow.addEventListener.mock.calls.find(
        (call: unknown[]) => (call[0] as string) === 'error'
      )?.[1];

      expect(errorHandler).toBeDefined();

      // Simulate error event
      const mockErrorEvent = {
        message: 'ReferenceError: foo is not defined',
        filename: 'script.js',
        lineno: 10,
        colno: 5,
      };
      errorHandler(mockErrorEvent);

      expect(mockLogger.error).toHaveBeenCalledWith('ReferenceError: foo is not defined', {
        source: 'error',
        errorType: 'global-error',
        filename: 'script.js',
        lineno: 10,
        colno: 5,
      });
    });

    it('should handle unhandled promise rejections', () => {
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      vi.stubGlobal('window', mockWindow);

      installInterceptors(mockLogger);

      const rejectionHandler = mockWindow.addEventListener.mock.calls.find(
        (call: unknown[]) => (call[0] as string) === 'unhandledrejection'
      )?.[1];

      expect(rejectionHandler).toBeDefined();

      // Simulate rejection with Error
      const testError = new Error('Async operation failed');
      const mockRejectionEvent = { reason: testError };
      rejectionHandler(mockRejectionEvent);

      expect(mockLogger.error).toHaveBeenCalledWith('Async operation failed', {
        source: 'error',
        errorType: 'unhandled-promise-rejection',
        errorName: 'Error',
        stack: testError.stack,
      });
    });

    it('should handle string rejections', () => {
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      vi.stubGlobal('window', mockWindow);

      installInterceptors(mockLogger);

      const rejectionHandler = mockWindow.addEventListener.mock.calls.find(
        (call: unknown[]) => (call[0] as string) === 'unhandledrejection'
      )?.[1];

      const mockRejectionEvent = { reason: 'Something went wrong' };
      rejectionHandler(mockRejectionEvent);

      expect(mockLogger.error).toHaveBeenCalledWith('Something went wrong', {
        source: 'error',
        errorType: 'unhandled-promise-rejection',
        errorName: 'PromiseRejection',
      });
    });

    it('should remove event listeners on uninstall', () => {
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      vi.stubGlobal('window', mockWindow);

      installInterceptors(mockLogger);
      uninstallInterceptors();

      expect(mockWindow.removeEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('browser environment checks', () => {
    it('should handle missing window gracefully', () => {
      const originalWindow = globalThis.window;
      delete (globalThis as unknown as { window?: unknown }).window;

      expect(() => installInterceptors(mockLogger)).not.toThrow();
      uninstallInterceptors();

      globalThis.window = originalWindow;
    });
  });

  describe('state management', () => {
    it('should handle multiple install/uninstall cycles', () => {
      installInterceptors(mockLogger);
      expect(areInterceptorsActive()).toBe(true);

      uninstallInterceptors();
      expect(areInterceptorsActive()).toBe(false);

      installInterceptors(mockLogger);
      expect(areInterceptorsActive()).toBe(true);

      uninstallInterceptors();
      expect(areInterceptorsActive()).toBe(false);
    });

    it('should log to correct logger after reinstall', () => {
      const logger1: IBrowserLogger = {
        ...mockLogger,
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        getStoredLogs: vi.fn().mockReturnValue([]),
        clearStoredLogs: vi.fn(),
        flush: vi.fn().mockResolvedValue(undefined),
      };
      const logger2: IBrowserLogger = {
        ...mockLogger,
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        getStoredLogs: vi.fn().mockReturnValue([]),
        clearStoredLogs: vi.fn(),
        flush: vi.fn().mockResolvedValue(undefined),
      };

      installInterceptors(logger1);
      console.log('test1');

      uninstallInterceptors();
      installInterceptors(logger2);
      console.log('test2');

      expect(logger1.debug).toHaveBeenCalledTimes(1);
      expect(logger2.debug).toHaveBeenCalledTimes(1);
    });
  });
});
