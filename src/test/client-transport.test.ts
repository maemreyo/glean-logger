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

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { ClientTransport, createClientTransport, getClientTransport } from '../client-transport';
import type { ClientLogEntry, BatchingConfig, RetryConfig } from '../types';

describe('client-transport.ts', () => {
  describe('ClientTransport', () => {
    let transport: ClientTransport;
    let mockFetch: ReturnType<typeof vi.fn>;

    const createTestTransport = (
      batchConfig?: Partial<BatchingConfig>,
      retryConfig?: Partial<RetryConfig>
    ): ClientTransport => {
      return new ClientTransport({
        endpoint: '/api/logger',
        batch: { mode: 'time', timeIntervalMs: 1000, countThreshold: 5, ...batchConfig },
        retry: {
          enabled: true,
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 1000,
          backoffMultiplier: 2,
          ...retryConfig,
        },
      });
    };

    const createMockResponse = (ok: boolean, status: number = 200): Response => {
      return {
        ok,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn().mockResolvedValue({ success: true, count: 1 }),
      } as unknown as Response;
    };

    beforeAll(() => {
      // Mock window and fetch for Node.js environment
      vi.stubGlobal('window', {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
    });

    beforeEach(() => {
      vi.useFakeTimers();
      mockFetch = vi.fn<typeof fetch>();
      vi.stubGlobal('fetch', mockFetch);
      transport = createTestTransport();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      transport.destroy();
    });

    describe('constructor', () => {
      it('should create transport with default options', () => {
        const defaultTransport = new ClientTransport({
          endpoint: '/api/logger',
          batch: { mode: 'time', timeIntervalMs: 3000, countThreshold: 10 },
          retry: {
            enabled: true,
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2,
          },
        });
        expect(defaultTransport).toBeDefined();
        defaultTransport.destroy();
      });

      it('should create transport with custom batching config', () => {
        const batchingConfig: BatchingConfig = {
          mode: 'count',
          countThreshold: 3,
          timeIntervalMs: 5000,
        };
        const customTransport = new ClientTransport({
          endpoint: '/api/logger',
          batch: batchingConfig,
          retry: {
            enabled: true,
            maxRetries: 3,
            initialDelayMs: 100,
            maxDelayMs: 1000,
            backoffMultiplier: 2,
          },
        });
        expect(customTransport).toBeDefined();
        customTransport.destroy();
      });

      it('should create transport with custom retry config', () => {
        const retryConfig: RetryConfig = {
          enabled: false,
          maxRetries: 1,
          initialDelayMs: 50,
          maxDelayMs: 100,
          backoffMultiplier: 1.5,
        };
        const customTransport = new ClientTransport({
          endpoint: '/api/logger',
          batch: { mode: 'time', timeIntervalMs: 3000, countThreshold: 10 },
          retry: retryConfig,
        });
        expect(customTransport).toBeDefined();
        customTransport.destroy();
      });
    });

    describe('send', () => {
      it('should buffer log entries', async () => {
        const entry: ClientLogEntry = {
          id: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test message',
          source: 'console',
        };

        await transport.send(entry);
        expect(transport.getBufferSize()).toBe(1);
      });

      it('should add multiple entries to buffer', async () => {
        for (let i = 0; i < 3; i++) {
          await transport.send({
            id: `test-${i}`,
            timestamp: Date.now(),
            level: 'info',
            message: `Test message ${i}`,
            source: 'console',
          });
        }
        expect(transport.getBufferSize()).toBe(3);
      });

      it('should flush immediately in immediate mode', async () => {
        const immediateTransport = createTestTransport({ mode: 'immediate' });

        mockFetch.mockResolvedValue(createMockResponse(true, 200));

        await immediateTransport.send({
          id: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test',
          source: 'console',
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        immediateTransport.destroy();
      });
    });

    describe('flush', () => {
      it('should send buffered entries to server', async () => {
        mockFetch.mockResolvedValue(createMockResponse(true, 200));

        await transport.send({
          id: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test 1',
          source: 'console',
        });

        await transport.send({
          id: 'test-2',
          timestamp: Date.now(),
          level: 'error',
          message: 'Test 2',
          source: 'console',
        });

        await transport.flush();

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(transport.getBufferSize()).toBe(0);
      });

      it('should not send when buffer is empty', async () => {
        await transport.flush();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should not retry when retry is disabled', async () => {
        const noRetryTransport = createTestTransport({}, { enabled: false });

        mockFetch.mockResolvedValue(createMockResponse(true, 200));

        await noRetryTransport.send({
          id: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test',
          source: 'console',
        });

        await noRetryTransport.flush();

        // Only one attempt
        expect(mockFetch).toHaveBeenCalledTimes(1);
        noRetryTransport.destroy();
      });
    });

    describe('count-based batching', () => {
      it('should flush when count threshold is reached', async () => {
        mockFetch.mockResolvedValue(createMockResponse(true, 200));

        const countTransport = createTestTransport({ mode: 'count', countThreshold: 3 });

        // Send 2 entries - should not flush yet
        await countTransport.send({
          id: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test 1',
          source: 'console',
        });
        await countTransport.send({
          id: 'test-2',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test 2',
          source: 'console',
        });

        expect(mockFetch).not.toHaveBeenCalled();

        // Send 3rd entry - should flush
        await countTransport.send({
          id: 'test-3',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test 3',
          source: 'console',
        });

        expect(mockFetch).toHaveBeenCalledTimes(1);
        countTransport.destroy();
      });
    });

    describe('destroy', () => {
      it('should clear buffer on destroy', async () => {
        mockFetch.mockResolvedValue(createMockResponse(true, 200));

        await transport.send({
          id: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test',
          source: 'console',
        });

        expect(transport.getBufferSize()).toBe(1);

        await transport.destroy();

        expect(transport.getBufferSize()).toBe(0);
      });
    });

    describe('getClientTransport singleton', () => {
      it('should return the same instance', () => {
        const instance1 = getClientTransport();
        const instance2 = getClientTransport();
        expect(instance1).toBe(instance2);
        instance1.destroy();
      });
    });

    describe('getBufferSize', () => {
      it('should return current buffer size', async () => {
        expect(transport.getBufferSize()).toBe(0);

        await transport.send({
          id: 'test-1',
          timestamp: Date.now(),
          level: 'info',
          message: 'Test',
          source: 'console',
        });

        expect(transport.getBufferSize()).toBe(1);
      });
    });

    describe('getConfig', () => {
      it('should return current configuration', () => {
        const config = transport.getConfig();
        expect(config).toHaveProperty('endpoint');
        expect(config).toHaveProperty('batch');
        expect(config).toHaveProperty('retry');
      });
    });

    describe('isSending', () => {
      it('should return false when not sending', () => {
        expect(transport.isSending()).toBe(false);
      });
    });
  });
});
