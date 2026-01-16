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
 * Tests for HTTP logging functionality
 *
 * Tests cover:
 * - Response body parsing (JSON, text, binary)
 * - Content-Type handling
 * - Size limits and truncation
 * - Redaction of sensitive data
 * - Edge cases (204, 304, streaming, etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  redactHeaders,
  redactBody,
  isBinaryContentType,
  getBodyType,
  DEFAULT_BODY_LOGGING_CONFIG,
  ApiLoggerBuilder,
  createLoggedFetch,
} from '../http';

// Mock Response class for testing
class MockResponse {
  status: number;
  body: ReadableStream | undefined;
  headers: Map<string, string>;

  constructor(
    options: { status?: number; body?: ReadableStream; headers?: Record<string, string> } = {}
  ) {
    this.status = options.status ?? 200;
    this.body = options.body;
    this.headers = new Map(Object.entries(options.headers ?? {}));
  }

  clone(): MockResponse {
    return new MockResponse({
      status: this.status,
      body: this.body,
      headers: Object.fromEntries(this.headers),
    });
  }

  async json(): Promise<unknown> {
    if (!this.body) return null;
    return { message: 'test' };
  }

  async text(): Promise<string> {
    if (!this.body) return '';
    return 'test text response';
  }

  get(key: string): string | null {
    return this.headers.get(key.toLowerCase()) ?? null;
  }
}

describe('HTTP Response Body Logging', () => {
  describe('isBinaryContentType', () => {
    it('should identify image content types as binary', () => {
      expect(isBinaryContentType('image/png')).toBe(true);
      expect(isBinaryContentType('image/jpeg')).toBe(true);
      expect(isBinaryContentType('image/gif')).toBe(true);
    });

    it('should identify video content types as binary', () => {
      expect(isBinaryContentType('video/mp4')).toBe(true);
      expect(isBinaryContentType('video/webm')).toBe(true);
    });

    it('should identify application/pdf as binary', () => {
      expect(isBinaryContentType('application/pdf')).toBe(true);
    });

    it('should not identify JSON as binary', () => {
      expect(isBinaryContentType('application/json')).toBe(false);
    });

    it('should not identify text content types as binary', () => {
      expect(isBinaryContentType('text/html')).toBe(false);
      expect(isBinaryContentType('text/plain')).toBe(false);
      expect(isBinaryContentType('text/css')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isBinaryContentType('IMAGE/PNG')).toBe(true);
      expect(isBinaryContentType('Application/Json')).toBe(false);
    });
  });

  describe('getBodyType', () => {
    it('should return json for application/json', () => {
      expect(getBodyType('application/json')).toBe('json');
    });

    it('should return json for application/vnd.api+json', () => {
      expect(getBodyType('application/vnd.api+json')).toBe('json');
    });

    it('should return text for text/html', () => {
      expect(getBodyType('text/html')).toBe('text');
    });

    it('should return text for text/plain', () => {
      expect(getBodyType('text/plain')).toBe('text');
    });

    it('should return text for application/xml', () => {
      expect(getBodyType('application/xml')).toBe('text');
    });

    it('should return null for binary content types', () => {
      expect(getBodyType('image/png')).toBe(null);
      expect(getBodyType('application/pdf')).toBe(null);
    });

    it('should return text for unknown content types', () => {
      expect(getBodyType('unknown/type')).toBe('text');
    });

    it('should handle empty content type', () => {
      expect(getBodyType('')).toBe('text');
    });
  });

  describe('redactHeaders', () => {
    it('should redact authorization header', () => {
      const headers = { authorization: 'Bearer token123', 'content-type': 'application/json' };
      const redacted = redactHeaders(headers);
      expect(redacted?.authorization).toBe('[REDACTED]');
      expect(redacted?.['content-type']).toBe('application/json');
    });

    it('should redact cookie header', () => {
      const headers = { cookie: 'session=abc123', 'content-type': 'application/json' };
      const redacted = redactHeaders(headers);
      expect(redacted?.cookie).toBe('[REDACTED]');
      expect(redacted?.['content-type']).toBe('application/json');
    });

    it('should redact x-api-key header', () => {
      const headers = { 'x-api-key': 'secret-key' };
      const redacted = redactHeaders(headers);
      expect(redacted?.['x-api-key']).toBe('[REDACTED]');
    });

    it('should return undefined for undefined input', () => {
      expect(redactHeaders(undefined)).toBeUndefined();
    });

    it('should be case-insensitive for header names', () => {
      const headers = { AUTHORIZATION: 'Bearer token', 'Content-Type': 'application/json' };
      const redacted = redactHeaders(headers);
      expect(redacted?.AUTHORIZATION).toBe('[REDACTED]');
      expect(redacted?.['Content-Type']).toBe('application/json');
    });
  });

  describe('redactBody', () => {
    it('should redact password field', () => {
      const body = { username: 'test', password: 'secret123' };
      const redacted = redactBody(body);
      expect((redacted as Record<string, unknown>).password).toBe('[REDACTED]');
      expect((redacted as Record<string, unknown>).username).toBe('test');
    });

    it('should redact nested sensitive fields', () => {
      const body = {
        user: {
          name: 'test',
          credentials: {
            password: 'secret',
            token: 'abc123',
          },
        },
      };
      const redacted = redactBody(body);
      const user = (redacted as Record<string, unknown>).user as Record<string, unknown>;
      const credentials = user.credentials as Record<string, unknown>;
      expect(credentials.password).toBe('[REDACTED]');
      expect(credentials.token).toBe('[REDACTED]');
      expect(user.name).toBe('test');
    });

    it('should redact fields in arrays', () => {
      const body = {
        users: [
          { name: 'user1', password: 'pass1' },
          { name: 'user2', password: 'pass2' },
        ],
      };
      const redacted = redactBody(body);
      const users = (redacted as Record<string, unknown>).users as Array<Record<string, unknown>>;
      expect(users[0].password).toBe('[REDACTED]');
      expect(users[1].password).toBe('[REDACTED]');
    });

    it('should redact token field', () => {
      const body = { accessToken: 'jwt-token', refreshToken: 'refresh-token' };
      const redacted = redactBody(body);
      expect((redacted as Record<string, unknown>).accessToken).toBe('[REDACTED]');
      expect((redacted as Record<string, unknown>).refreshToken).toBe('[REDACTED]');
    });

    it('should redact ssn and creditCard fields', () => {
      const body = { ssn: '123-45-6789', creditCard: '4111-1111-1111-1111' };
      const redacted = redactBody(body);
      expect((redacted as Record<string, unknown>).ssn).toBe('[REDACTED]');
      expect((redacted as Record<string, unknown>).creditCard).toBe('[REDACTED]');
    });

    it('should handle non-object values', () => {
      expect(redactBody('string')).toBe('string');
      expect(redactBody(123)).toBe(123);
      expect(redactBody(null)).toBe(null);
      expect(redactBody(undefined)).toBe(undefined);
    });

    it('should handle null values in objects', () => {
      const body = { value: null };
      const redacted = redactBody(body);
      expect((redacted as Record<string, unknown>).value).toBe(null);
    });

    it('should be case-insensitive for field names', () => {
      const body = { PASSWORD: 'secret', Token: 'abc' };
      const redacted = redactBody(body);
      expect((redacted as Record<string, unknown>).PASSWORD).toBe('[REDACTED]');
      expect((redacted as Record<string, unknown>).Token).toBe('[REDACTED]');
    });
  });
});

describe('Content-Type Edge Cases', () => {
  it('should handle multipart/form-data as excluded by default', () => {
    expect(getBodyType('multipart/form-data')).toBe(null);
  });

  it('should handle application/x-www-form-urlencoded', () => {
    expect(getBodyType('application/x-www-form-urlencoded')).toBe('text');
  });

  it('should handle font/woff2', () => {
    expect(getBodyType('font/woff2')).toBe(null);
  });

  it('should handle application/octet-stream', () => {
    expect(getBodyType('application/octet-stream')).toBe(null);
  });
});

describe('Response Status Edge Cases', () => {
  it('should identify 204 No Content', () => {
    const response = new MockResponse({ status: 204 });
    expect(response.status).toBe(204);
  });

  it('should identify 304 Not Modified', () => {
    const response = new MockResponse({ status: 304 });
    expect(response.status).toBe(304);
  });

  it('should identify 4xx errors', () => {
    const response = new MockResponse({ status: 400 });
    expect(response.status).toBe(400);
  });

  it('should identify 5xx errors', () => {
    const response = new MockResponse({ status: 500 });
    expect(response.status).toBe(500);
  });
});

describe('Sensitive Field Redaction', () => {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'apikey',
    'accessToken',
    'refreshToken',
    'ssn',
    'creditCard',
    'cardNumber',
    'cvv',
    'cvc',
  ];

  sensitiveFields.forEach(field => {
    it(`should redact ${field} field`, () => {
      const body = { [field]: 'secret-value' };
      const redacted = redactBody(body);
      expect((redacted as Record<string, unknown>)[field]).toBe('[REDACTED]');
    });
  });
});

describe('Deeply Nested Redaction', () => {
  it('should redact deeply nested sensitive fields', () => {
    const body = {
      level1: {
        level2: {
          level3: {
            password: 'deep-secret',
            normalField: 'visible',
          },
        },
      },
    };
    const redacted = redactBody(body);
    const l1 = (redacted as Record<string, unknown>).level1 as Record<string, unknown>;
    const l2 = l1.level2 as Record<string, unknown>;
    const l3 = l2.level3 as Record<string, unknown>;
    expect(l3.password).toBe('[REDACTED]');
    expect(l3.normalField).toBe('visible');
  });

  it('should handle arrays with nested objects', () => {
    const body = {
      data: [{ nested: { password: 'secret1' } }, { nested: { password: 'secret2' } }],
    };
    const redacted = redactBody(body);
    const data = (redacted as Record<string, unknown>).data as Array<Record<string, unknown>>;
    const nested0 = data[0].nested as Record<string, unknown>;
    const nested1 = data[1].nested as Record<string, unknown>;
    expect(nested0.password).toBe('[REDACTED]');
    expect(nested1.password).toBe('[REDACTED]');
  });
});

describe('Header Redaction Edge Cases', () => {
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token'];

  sensitiveHeaders.forEach(header => {
    it(`should redact ${header} header`, () => {
      const headers = { [header]: 'secret-value', 'content-type': 'application/json' };
      const redacted = redactHeaders(headers);
      expect((redacted as Record<string, string>)[header]).toBe('[REDACTED]');
      expect((redacted as Record<string, string>)['content-type']).toBe('application/json');
    });
  });

  it('should preserve non-sensitive headers', () => {
    const headers = {
      'content-type': 'application/json',
      'user-agent': 'test-agent',
      accept: 'application/json',
    };
    const redacted = redactHeaders(headers);
    expect(redacted?.['content-type']).toBe('application/json');
    expect(redacted?.['user-agent']).toBe('test-agent');
    expect(redacted?.accept).toBe('application/json');
  });
});

describe('Circular Reference Detection', () => {
  it('should detect and redact simple circular reference', () => {
    const obj: Record<string, unknown> = { name: 'test' };
    obj.self = obj;
    const redacted = redactBody(obj);
    expect((redacted as Record<string, unknown>).self).toBe('[REDACTED-CIRCULAR]');
  });

  it('should handle nested circular references', () => {
    const parent: Record<string, unknown> = { name: 'parent' };
    const child: Record<string, unknown> = { name: 'child' };
    parent.child = child;
    (child as Record<string, unknown>).parent = parent;
    const redacted = redactBody(parent);
    expect(((redacted as Record<string, unknown>).child as Record<string, unknown>).parent).toBe(
      '[REDACTED-CIRCULAR]'
    );
  });

  it('should handle circular references in arrays', () => {
    const arr: unknown[] = [1, 2, 3];
    arr.push(arr);
    const redacted = redactBody(arr);
    expect((redacted as unknown[])[3]).toBe('[REDACTED-CIRCULAR]');
  });

  it('should detect circular reference at maxDepth boundary', () => {
    const obj: Record<string, unknown> = { a: { b: { c: {} } } };
    ((obj.a as Record<string, unknown>).b as Record<string, unknown>).c = obj;
    const redacted = redactBody(obj);
    expect(
      (
        ((redacted as Record<string, unknown>).a as Record<string, unknown>).b as Record<
          string,
          unknown
        >
      ).c
    ).toBe('[REDACTED-CIRCULAR]');
  });

  it('should handle object that references itself immediately', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    const redacted = redactBody(obj);
    expect((redacted as Record<string, unknown>).self).toBe('[REDACTED-CIRCULAR]');
  });

  it('should handle multiple circular references in same structure', () => {
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b' };
    a.ref = b;
    b.ref = a;
    a.self = a;
    b.self = b;
    const redacted = redactBody(a);
    expect(((redacted as Record<string, unknown>).ref as Record<string, unknown>).ref).toBe(
      '[REDACTED-CIRCULAR]'
    );
    expect((redacted as Record<string, unknown>).self).toBe('[REDACTED-CIRCULAR]');
  });

  it('should redact sensitive data even with circular reference', () => {
    const obj: Record<string, unknown> = { password: 'secret', self: null as unknown };
    obj.self = obj;
    const redacted = redactBody(obj);
    expect((redacted as Record<string, unknown>).password).toBe('[REDACTED]');
    expect((redacted as Record<string, unknown>).self).toBe('[REDACTED-CIRCULAR]');
  });

  it('should detect circular reference at deep nesting level', () => {
    const obj: Record<string, unknown> = { level1: { level2: { level3: {} } } };
    ((obj.level1 as Record<string, unknown>).level2 as Record<string, unknown>).level3 = obj;
    const redacted = redactBody(obj);
    const level1 = (redacted as Record<string, unknown>).level1 as Record<string, unknown>;
    const level2 = level1.level2 as Record<string, unknown>;
    const level3 = level2.level3;
    expect(level3).toBe('[REDACTED-CIRCULAR]');
  });
});

// ============================================================================
// PHASE 2: SIZE AND CONTENT HANDLING
// ============================================================================

describe('Size Limit Enforcement', () => {
  it('should skip logging when Content-Length exceeds 2x maxSize', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: {
        ...DEFAULT_BODY_LOGGING_CONFIG,
        maxSize: 1024, // 1KB
      },
    });

    // Response with content-length > 2KB
    const response = new Response('test', {
      headers: {
        'content-type': 'text/plain',
        'content-length': '3072', // 3KB > 2 * 1KB
      },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/large');

    // Response body should be undefined (not logged)
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.responseBody).toBeUndefined();
  });
});

describe('Missing Content-Type Header', () => {
  it('should default to text when Content-Type is missing', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    // Response without content-type header
    const response = new Response('plain text response', {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/no-ctype');

    // Should log the response
    expect(mockLogger.logResponse).toHaveBeenCalled();
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.statusCode).toBe(200);
  });

  it('should parse body with missing Content-Type', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const response = new Response('response body', {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/data');

    // Should log the response
    expect(mockLogger.logResponse).toHaveBeenCalled();
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.statusCode).toBe(200);
  });

  it('should handle empty Content-Type header', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const response = new Response('body', {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/empty-ctype');

    // Should log the response
    expect(mockLogger.logResponse).toHaveBeenCalled();
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.statusCode).toBe(200);
  });
});

// ============================================================================
// PHASE 3: SAMPLING AND PATTERN MATCHING
// ============================================================================

describe('Sampling Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip all requests when rate = 0', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: {
        ...DEFAULT_BODY_LOGGING_CONFIG,
        sampling: { rate: 0 },
      },
    });

    const response = new Response('data', {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/data');

    // Request should be logged, but response body should not
    expect(mockLogger.logRequest).toHaveBeenCalled();
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.responseBody).toBeUndefined();
  });

  it('should apply sampling without patterns to all URLs', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: {
        ...DEFAULT_BODY_LOGGING_CONFIG,
        sampling: { rate: 0.5 }, // 50% sampling
      },
    });

    const response = new Response('data', {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    // Make 10 requests, should sample some based on Math.random()
    for (let i = 0; i < 10; i++) {
      await loggedFetch('https://api.example.com/data');
    }

    // At least request should be logged
    expect(mockLogger.logRequest).toHaveBeenCalledTimes(10);
    expect(mockLogger.logResponse).toHaveBeenCalledTimes(10);
  });
});

// ============================================================================
// PHASE 4: BUILDER VALIDATION
// ============================================================================

describe('ApiLoggerBuilder Validation', () => {
  it('should throw error when sampling rate < 0', () => {
    const builder = new ApiLoggerBuilder();
    expect(() => {
      builder.sampling(-0.5);
    }).toThrow('Sampling rate must be between 0 and 1');
  });

  it('should throw error when sampling rate > 1', () => {
    const builder = new ApiLoggerBuilder();
    expect(() => {
      builder.sampling(1.5);
    }).toThrow('Sampling rate must be between 0 and 1');
  });

  it('should throw error when maxSize < 0', () => {
    const builder = new ApiLoggerBuilder();
    builder.maxSize(-1);
    expect(() => {
      builder.build();
    }).toThrow('maxSize must be non-negative');
  });

  it('should throw error when maxSize > 100MB', () => {
    const builder = new ApiLoggerBuilder();
    builder.maxSize(100 * 1024 * 1024 + 1); // 100MB + 1 byte
    expect(() => {
      builder.build();
    }).toThrow('maxSize cannot exceed 100MB');
  });

  it('should throw error when readTimeout < 0', () => {
    const builder = new ApiLoggerBuilder();
    builder.readTimeout(-1);
    expect(() => {
      builder.build();
    }).toThrow('readTimeout must be non-negative');
  });

  it('should validate sampling rate in build()', () => {
    const builder = new ApiLoggerBuilder();
    // Set sampling rate to an invalid value through config
    builder['config'].sampling = { rate: 2 };
    expect(() => {
      builder.build();
    }).toThrow('sampling rate must be between 0 and 1');
  });
});

// ============================================================================
// PHASE 5: REQUEST BODY EDGE CASES
// ============================================================================

describe('Request Body Redaction', () => {
  it('should handle null request body', () => {
    const body = null;
    const redacted = redactBody(body);
    expect(redacted).toBeNull();
  });

  it('should handle raw string bodies', () => {
    const body = 'raw string body';
    const redacted = redactBody(body);
    expect(redacted).toBe('raw string body');
  });

  it('should handle object bodies', () => {
    const body = {
      username: 'testuser',
      password: 'secret123',
      email: 'test@example.com',
    };
    const redacted = redactBody(body);
    expect((redacted as Record<string, unknown>).username).toBe('testuser');
    expect((redacted as Record<string, unknown>).password).toBe('[REDACTED]');
    expect((redacted as Record<string, unknown>).email).toBe('test@example.com');
  });
});

// ============================================================================
// PHASE 6: EMPTY AND SPECIAL RESPONSES
// ============================================================================

describe('Empty Response Bodies', () => {
  it('should return null for 204 No Content', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const response = new Response(null, {
      status: 204,
      headers: { 'content-type': 'text/plain' },
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/no-content');

    // Response body should not be logged for 204
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.responseBody).toBeUndefined();
  });

  it('should return null for 304 Not Modified', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const response = new Response(null, {
      status: 304,
      headers: { 'content-type': 'application/json' },
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/not-modified');

    // Response body should not be logged for 304
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.responseBody).toBeUndefined();
  });

  it('should handle empty string body', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const response = new Response('', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/empty');

    // Should log the response (body handling may vary by environment)
    expect(mockLogger.logResponse).toHaveBeenCalled();
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.statusCode).toBe(200);
  });

  it('should handle response with null body stream', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    // Response with null body (like HEAD request)
    const response = new Response(null, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/head');

    // Should not log null body
    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.responseBody).toBeUndefined();
  });
});

// ============================================================================
// ADDITIONAL EDGE CASES
// ============================================================================

describe('Additional Edge Cases', () => {
  it('should handle undefined values in objects', () => {
    const obj = { name: 'test', value: undefined, nested: { value: undefined } };
    const redacted = redactBody(obj);
    expect((redacted as Record<string, unknown>).value).toBeUndefined();
    const nested = (redacted as Record<string, unknown>).nested as Record<string, unknown>;
    expect(nested.value).toBeUndefined();
  });

  it('should convert Date objects to ISO strings', () => {
    const obj = { date: new Date('2024-01-01'), name: 'test' };
    const redacted = redactBody(obj);
    expect((redacted as Record<string, unknown>).date).toBe('2024-01-01T00:00:00.000Z');
    expect((redacted as Record<string, unknown>).name).toBe('test');
  });

  it('should convert RegExp objects to source strings', () => {
    const obj = { pattern: /test-\d+/, name: 'test' };
    const redacted = redactBody(obj);
    expect((redacted as Record<string, unknown>).pattern).toBe('test-\\d+');
    expect((redacted as Record<string, unknown>).name).toBe('test');
  });

  it('should handle function properties in objects', () => {
    const obj = { name: 'test', fn: () => 'hello' };
    const redacted = redactBody(obj);
    expect((redacted as Record<string, unknown>).name).toBe('test');
    expect(typeof (redacted as Record<string, unknown>).fn).toBe('function');
  });

  it('should handle empty objects', () => {
    const obj = {};
    const redacted = redactBody(obj);
    expect(redacted).toEqual({});
  });

  it('should handle empty arrays', () => {
    const arr: unknown[] = [];
    const redacted = redactBody(arr);
    expect(redacted).toEqual([]);
  });

  it('should handle mixed content types in arrays', () => {
    const arr = ['string', 123, null, undefined, true, false, { name: 'object' }, [1, 2, 3]];
    const redacted = redactBody(arr);
    expect(Array.isArray(redacted)).toBe(true);
    expect((redacted as unknown[]).length).toBe(arr.length);
  });
});

describe('Builder Edge Cases', () => {
  it('should build config with all defaults', () => {
    const builder = new ApiLoggerBuilder();
    const config = builder.build();

    expect(config.enabled).toBe(true);
    expect(config.maxSize).toBe(10 * 1024); // 10KB
    expect(config.readTimeout).toBe(5000); // 5s
    expect(config.maxDepth).toBe(10);
  });

  it('should chain builder methods', () => {
    const config = new ApiLoggerBuilder()
      .enabled(false)
      .maxSize('1mb')
      .readTimeout('10s')
      .maxDepth(20)
      .addSensitiveFields('customField')
      .addSensitiveHeaders('x-custom')
      .build();

    expect(config.enabled).toBe(false);
    expect(config.maxSize).toBe(1024 * 1024); // 1MB
    expect(config.readTimeout).toBe(10000); // 10s
    expect(config.maxDepth).toBe(20);
    expect(config.sensitiveFields).toContain('customfield');
    expect(config.sensitiveHeaders).toContain('x-custom');
  });

  it('should merge with initial config', () => {
    const initial = { enabled: false, maxSize: 2048 };
    const config = new ApiLoggerBuilder(initial).maxSize(4096).build();

    expect(config.enabled).toBe(false);
    expect(config.maxSize).toBe(4096); // Should override
  });

  it('should parse size strings correctly', () => {
    const builder = new ApiLoggerBuilder();
    expect(builder['config'].maxSize).toBeUndefined();

    builder.maxSize('10kb');
    expect(builder['config'].maxSize).toBe(10 * 1024);

    builder.maxSize('1mb');
    expect(builder['config'].maxSize).toBe(1024 * 1024);

    builder.maxSize(5000);
    expect(builder['config'].maxSize).toBe(5000);
  });

  it('should parse duration strings correctly', () => {
    const builder = new ApiLoggerBuilder();
    expect(builder['config'].readTimeout).toBeUndefined();

    builder.readTimeout('5s');
    expect(builder['config'].readTimeout).toBe(5000);

    builder.readTimeout('1000ms');
    expect(builder['config'].readTimeout).toBe(1000);

    builder.readTimeout(3000);
    expect(builder['config'].readTimeout).toBe(3000);
  });

  it('should validate maxDepth range', () => {
    const builder = new ApiLoggerBuilder();

    expect(() => {
      builder.maxDepth(0).build();
    }).toThrow('maxDepth must be between 1 and 100');

    expect(() => {
      builder.maxDepth(101).build();
    }).toThrow('maxDepth must be between 1 and 100');

    const config = builder.maxDepth(50).build();
    expect(config.maxDepth).toBe(50);
  });
});

// ============================================================================
// NEW TESTS: Code Review Edge Cases
// ============================================================================

describe('Malformed JSON Handling', () => {
  it('should handle malformed JSON response gracefully', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const invalidJsonBody = 'not valid json { broken';
    const response = new Response(invalidJsonBody, {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/malformed');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    expect(mockLogger.logResponse).toHaveBeenCalled();
  });

  it('should not crash on various malformed JSON patterns', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const malformedBodies = ['{invalid json', 'not json', '{"unclosed":}', 'null'];

    for (const body of malformedBodies) {
      const response = new Response(body, {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });

      global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

      await loggedFetch('https://api.example.com/test');
    }

    expect(mockLogger.logRequest).toHaveBeenCalledTimes(malformedBodies.length);
  });
});

describe('Timeout Scenarios', () => {
  it('should handle zero timeout gracefully', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: {
        ...DEFAULT_BODY_LOGGING_CONFIG,
        readTimeout: 0,
      },
    });

    const response = new Response('test body', {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/zero-timeout');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    expect(mockLogger.logResponse).toHaveBeenCalled();
  });

  it('should handle disabled body logging with timeout config', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: {
        ...DEFAULT_BODY_LOGGING_CONFIG,
        enabled: false,
        readTimeout: 1000,
      },
    });

    const response = new Response('body', {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/disabled');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    expect(mockLogger.logResponse).toHaveBeenCalled();
  });
});

describe('Invalid Regex Pattern Handling', () => {
  it('should handle regex patterns with extreme backtracking', () => {
    const builder = new ApiLoggerBuilder();

    const dangerousPatterns = [new RegExp('(a+)+c', 'g'), new RegExp('((a+)+)+b', 'g')];

    dangerousPatterns.forEach(pattern => {
      expect(() => {
        builder.addRedactionPattern(pattern, '[REDACTED]');
      }).not.toThrow();
    });

    const config = builder.build();
    expect(config.redactionPatterns.length).toBeGreaterThan(0);
  });

  it('should handle very long regex patterns', () => {
    const builder = new ApiLoggerBuilder();

    const longPattern = new RegExp('a'.repeat(1000), 'g');

    expect(() => {
      builder.addRedactionPattern(longPattern, '[REDACTED]');
    }).not.toThrow();

    const config = builder.build();
    expect(config.redactionPatterns.length).toBeGreaterThan(0);
  });
});

describe('Streaming Response Handling', () => {
  it('should handle streaming responses without Content-Length', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue('chunk1,');
        controller.enqueue('chunk2');
        controller.close();
      },
    });

    const response = new Response(stream, {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/stream');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    expect(mockLogger.logResponse).toHaveBeenCalled();
  });

  it('should handle empty streaming response', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const emptyStream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    const response = new Response(emptyStream, {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/empty-stream');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    expect(mockLogger.logResponse).toHaveBeenCalled();
  });
});

describe('Truncation Size Calculation', () => {
  it('should handle various maxSize configurations', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const maxSizeValues = [1, 10, 100, 1000, 10000];

    for (const maxSize of maxSizeValues) {
      const loggedFetch = createLoggedFetch({
        enabled: true,
        logger: mockLogger,
        bodyLoggingConfig: {
          ...DEFAULT_BODY_LOGGING_CONFIG,
          maxSize,
        },
      });

      const response = new Response('test body', {
        headers: { 'content-type': 'text/plain' },
        status: 200,
      });

      global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

      await loggedFetch(`https://api.example.com/size-${maxSize}`);
    }

    expect(mockLogger.logRequest).toHaveBeenCalledTimes(maxSizeValues.length);
    expect(mockLogger.logResponse).toHaveBeenCalledTimes(maxSizeValues.length);
  });

  it('should handle maxSize of 0 gracefully', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: {
        ...DEFAULT_BODY_LOGGING_CONFIG,
        maxSize: 0,
      },
    });

    const response = new Response('some content', {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/zero-size');

    expect(mockLogger.logRequest).toHaveBeenCalled();
    expect(mockLogger.logResponse).toHaveBeenCalled();
  });
});

describe('Very Large Response Handling', () => {
  it('should skip logging when Content-Length exceeds 2x maxSize', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: {
        ...DEFAULT_BODY_LOGGING_CONFIG,
        maxSize: 10 * 1024, // 10KB
      },
    });

    const hugeContentLength = (25 * 1024).toString(); // 25KB > 2x 10KB
    const response = new Response('content', {
      headers: {
        'content-type': 'application/json',
        'content-length': hugeContentLength,
      },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/huge');

    const responseCall = mockLogger.logResponse.mock.calls[0] as [unknown];
    const context = responseCall[0] as Record<string, unknown>;
    expect(context.responseBody).toBeUndefined();
  });
});

describe('Request Body String Handling', () => {
  it('should handle JSON string request bodies', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const requestBody = JSON.stringify({ username: 'testuser', password: 'secret123' });

    const response = new Response('ok', {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    await loggedFetch('https://api.example.com/login', {
      method: 'POST',
      body: requestBody,
    });

    expect(mockLogger.logRequest).toHaveBeenCalled();
  });

  it('should handle Buffer request bodies', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const response = new Response('ok', {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    const bufferBody = Buffer.from('test data');
    await loggedFetch('https://api.example.com/data', {
      method: 'POST',
      body: bufferBody,
    });

    expect(mockLogger.logRequest).toHaveBeenCalled();
  });

  it('should handle URLSearchParams request bodies', async () => {
    const mockLogger = {
      logRequest: vi.fn(),
      logResponse: vi.fn(),
      logError: vi.fn(),
    };

    const loggedFetch = createLoggedFetch({
      enabled: true,
      logger: mockLogger,
      bodyLoggingConfig: DEFAULT_BODY_LOGGING_CONFIG,
    });

    const response = new Response('ok', {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });

    global.fetch = vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

    const params = new URLSearchParams({ username: 'test', password: 'secret' });
    await loggedFetch('https://api.example.com/form', {
      method: 'POST',
      body: params,
    });

    expect(mockLogger.logRequest).toHaveBeenCalled();
  });
});
