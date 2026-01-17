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
 * Client Transport Module
 *
 * Feature: 001-browser-log-sync
 * Handles buffering, batching, retry, and sending browser logs to the server.
 */

import type { ClientLogEntry, TransportConfig, BatchingConfig, RetryConfig } from './types';
import { getTransportConfig } from './config';

/**
 * Singleton instance of the client transport
 */
let instance: ClientTransport | null = null;

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function';
}

/**
 * Get or create the client transport singleton
 */
export function getClientTransport(): ClientTransport {
  if (!instance) {
    instance = new ClientTransport();
  }
  return instance;
}

/**
 * Client transport for sending logs from browser to server
 *
 * Features:
 * - Configurable batching (time-based, count-based, or immediate)
 * - Automatic retry with exponential backoff
 * - Buffer management to prevent memory leaks
 * - Singleton pattern for efficient resource usage
 */
export class ClientTransport {
  private buffer: ClientLogEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sending: boolean = false;
  private config: TransportConfig;
  private unloadHandler: (() => void) | null = null;

  /**
   * Create a new client transport instance
   * @param config - Optional transport configuration (uses defaults if not provided)
   */
  constructor(config?: Partial<TransportConfig>) {
    // In browser environment, use hardcoded 'immediate' mode for reliable log submission
    const isBrowserEnv = typeof window !== 'undefined' && typeof fetch === 'function';

    const browserConfig: TransportConfig = {
      endpoint: '/api/logs',
      batch: { mode: 'immediate', timeIntervalMs: 3000, countThreshold: 10 },
      retry: {
        enabled: true,
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      },
    };

    const defaultConfig = isBrowserEnv ? browserConfig : getTransportConfig();
    this.config = {
      endpoint: config?.endpoint ?? defaultConfig.endpoint,
      batch: {
        mode: config?.batch?.mode ?? defaultConfig.batch.mode,
        timeIntervalMs: config?.batch?.timeIntervalMs ?? defaultConfig.batch.timeIntervalMs,
        countThreshold: config?.batch?.countThreshold ?? defaultConfig.batch.countThreshold,
      },
      retry: {
        enabled: config?.retry?.enabled ?? defaultConfig.retry.enabled,
        maxRetries: config?.retry?.maxRetries ?? defaultConfig.retry.maxRetries,
        initialDelayMs: config?.retry?.initialDelayMs ?? defaultConfig.retry.initialDelayMs,
        maxDelayMs: config?.retry?.maxDelayMs ?? defaultConfig.retry.maxDelayMs,
        backoffMultiplier:
          config?.retry?.backoffMultiplier ?? defaultConfig.retry.backoffMultiplier,
      },
    };

    // Set up page unload handler to flush pending logs
    this.setupUnloadHandler();
  }

  /**
   * Set up the beforeunload event handler to flush logs on page unload
   */
  private setupUnloadHandler(): void {
    if (isBrowser() && typeof window !== 'undefined') {
      this.unloadHandler = () => {
        // Synchronous flush on unload
        if (this.buffer.length > 0) {
          const batch = [...this.buffer];
          this.buffer = [];
          this.doSend(batch).catch(() => {
            // Ignore errors during unload
          });
        }
      };
      window.addEventListener('beforeunload', this.unloadHandler);
    }
  }

  /**
   * Send a log entry to the buffer
   * @param entry - The log entry to send
   */
  async send(entry: ClientLogEntry): Promise<void> {
    if (!isBrowser()) {
      return;
    }

    console.debug('[ClientTransport] Adding entry to buffer:', {
      id: entry.id,
      level: entry.level,
      message: entry.message.substring(0, 50),
      bufferSize: this.buffer.length + 1,
      mode: this.config.batch.mode,
    });

    this.buffer.push(entry);

    // Handle different batching modes
    switch (this.config.batch.mode) {
      case 'count':
        if (this.buffer.length >= this.config.batch.countThreshold) {
          await this.flush();
        }
        break;
      case 'immediate':
        await this.flush();
        break;
      // 'time' mode is handled by the timer
    }
  }

  /**
   * Flush the buffer and send logs to the server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.sending) {
      return;
    }

    // Copy buffer and clear it immediately
    const batch = [...this.buffer];
    this.buffer = [];
    this.sending = true;

    console.debug('[ClientTransport] Flushing batch:', {
      count: batch.length,
      endpoint: this.config.endpoint,
    });

    try {
      await this.sendWithRetry(batch);
      console.debug('[ClientTransport] Flush complete');
    } catch (error) {
      console.error('[ClientTransport] Flush failed:', error);
    } finally {
      this.sending = false;
      // Restart timer for time-based batching
      if (this.config.batch.mode === 'time') {
        this.startBatchTimer();
      }
    }
  }

  /**
   * Send a batch of logs with retry logic
   * @param batch - The batch of log entries to send
   * @param attempt - Current attempt number (internal use)
   */
  private async sendWithRetry(batch: ClientLogEntry[], attempt: number = 1): Promise<void> {
    if (!this.config.retry.enabled) {
      await this.doSend(batch);
      return;
    }

    try {
      await this.doSend(batch);
    } catch (error) {
      if (attempt >= this.config.retry.maxRetries) {
        console.error(
          '[ClientTransport] Max retries reached, dropping batch of',
          batch.length,
          'logs'
        );
        return;
      }

      const delay = this.calculateBackoff(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      await this.sendWithRetry(batch, attempt + 1);
    }
  }

  /**
   * Calculate exponential backoff delay
   * @param attempt - Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  private calculateBackoff(attempt: number): number {
    const delay =
      this.config.retry.initialDelayMs * Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.retry.maxDelayMs);
  }

  /**
   * Send a batch of logs to the server using fetch
   * @param batch - The batch of log entries to send
   * @throws Error if the request fails
   */
  private async doSend(batch: ClientLogEntry[]): Promise<void> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: batch }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
  }

  /**
   * Start or restart the batch timer for time-based batching
   */
  private startBatchTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    if (this.config.batch.mode === 'time') {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.config.batch.timeIntervalMs);
    }
  }

  /**
   * Destroy the transport and clean up resources
   * Call this when the transport is no longer needed
   */
  async destroy(): Promise<void> {
    // Clear the timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Remove unload handler
    if (this.unloadHandler && isBrowser() && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }

    // Final flush
    if (this.buffer.length > 0) {
      await this.flush();
    }
  }

  /**
   * Get the current buffer size (for testing/debugging)
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Check if currently sending (for testing/debugging)
   */
  isSending(): boolean {
    return this.sending;
  }

  /**
   * Get the current configuration (for testing/debugging)
   */
  getConfig(): TransportConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create a new transport instance
 * @param config - Optional transport configuration
 */
export function createClientTransport(config?: Partial<TransportConfig>): ClientTransport {
  return new ClientTransport(config);
}

export default ClientTransport;
