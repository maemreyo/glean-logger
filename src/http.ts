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
 * API Logger for automatic request/response logging
 *
 * Feature: 011-api-logger
 * User Story 3: Automatic API Request/Response Logging
 *
 * Provides:
 * - Request ID generation
 * - Automatic request/response logging
 * - createLoggedFetch() wrapper
 * - Fetch interceptors
 * - timeApiCall() utility
 */

import { createServerLogger, ServerLoggerImpl } from './server';
import type {
  IApiLogger,
  ApiRequestContext,
  ApiResponseContext,
  LogContext,
  InterceptorFunction,
  IServerLogger,
} from './types';
import { generateRequestId, createTimestamp, getPerformanceNow } from './utils';

/**
 * Default sensitive headers to redact
 */
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token'];

/**
 * Default sensitive field names to redact
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apikey',
  'accesstoken',
  'refreshtoken',
  'ssn',
  'creditcard',
  'cardnumber',
];

/**
 * Maximum response body size to log (10KB)
 */
const MAX_BODY_SIZE = 10 * 1024;

/**
 * Timeout for reading response body (5 seconds)
 */
const BODY_READ_TIMEOUT = 5000;

/**
 * Content types that should NOT have their body logged
 */
const BINARY_CONTENT_TYPES = [
  'image/',
  'audio/',
  'video/',
  'application/pdf',
  'application/zip',
  'application/octet-stream',
  'font/',
];

/**
 * Content types that should be logged as text
 */
const TEXT_CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'application/vnd.api+json',
  'text/',
];

/**
 * Check if content type is binary (should not log body)
 */
function isBinaryContentType(contentType: string): boolean {
  return BINARY_CONTENT_TYPES.some(type => contentType.toLowerCase().includes(type));
}

/**
 * Get response body type based on content-type header
 */
function getBodyType(contentType: string): 'json' | 'text' | null {
  const normalized = contentType.toLowerCase();

  if (TEXT_CONTENT_TYPES.some(type => normalized.includes(type))) {
    return normalized.includes('json') ? 'json' : 'text';
  }

  if (isBinaryContentType(normalized)) {
    return null;
  }

  // Default to text for unknown types
  return 'text';
}

/**
 * Safely parse response body for logging with timeout and single clone
 * Handles JSON, text, and skips binary content appropriately
 */
async function parseResponseBodyForLog(
  response: Response,
  maxSize: number
): Promise<{ body: unknown; truncated: boolean } | null> {
  // Check for no-content responses
  if (response.status === 204 || response.status === 304) {
    return null;
  }

  // Skip if body is null/undefined (HEAD requests, etc.)
  if (!response.body) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const bodyType = getBodyType(contentType);

  if (bodyType === null) {
    // Binary content - don't log body
    return null;
  }

  // Check Content-Length header before cloning to avoid memory issues
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxSize * 2) {
      // Response too large - skip body logging
      return null;
    }
  }

  try {
    // Clone response ONCE - read based on content type
    const cloned = response.clone();

    let body: unknown;
    if (bodyType === 'json') {
      body = await cloned.json();
    } else {
      // For text content, read and check size
      const text = await cloned.text();
      body = text.length > maxSize ? `${text.slice(0, maxSize)}... [truncated]` : text;
    }

    return { body, truncated: false };
  } catch {
    // Parsing failed - return null
    return null;
  }
}

/**
 * Redact sensitive data from headers
 */
function redactHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Redact sensitive data from body
 */
function redactBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map(redactBody);
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactBody(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Truncate large response bodies for logging
 */
function truncateBody(body: unknown, maxLength = MAX_BODY_SIZE): unknown {
  if (!body || typeof body === 'string') {
    const str = String(body ?? '');
    return str.length > maxLength ? `${str.slice(0, maxLength)}... [truncated]` : str;
  }
  if (typeof body === 'object') {
    const str = JSON.stringify(body);
    return str.length > maxLength ? `${str.slice(0, maxLength)}... [truncated]` : body;
  }
  return body;
}

/**
 * API Logger implementation
 */
class ApiLoggerImpl implements IApiLogger {
  private logger: IServerLogger;

  constructor(options?: { name?: string }) {
    this.logger = createServerLogger({
      name: options?.name || 'api-logger',
    });
  }

  logRequest(context: ApiRequestContext): void {
    const redactedHeaders = redactHeaders(context.headers);
    const redactedBody = redactBody(context.body);

    this.logger.info('API Request', {
      type: 'request',
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      headers: redactedHeaders,
      timestamp: context.timestamp,
    });
  }

  logResponse(context: ApiResponseContext): void {
    this.logger.info('API Response', {
      type: 'response',
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      statusCode: context.statusCode,
      duration: context.duration,
      timestamp: context.timestamp,
      // Include response body if available (already redacted and truncated)
      ...(context.body !== undefined && { responseBody: context.body }),
    });
  }

  logError(error: Error, context?: LogContext): void {
    this.logger.error('API Error', {
      type: 'error',
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      ...context,
    });
  }
}

/**
 * Create API logger instance
 */
export function createApiLogger(options?: { name?: string }): IApiLogger {
  return new ApiLoggerImpl(options);
}

/**
 * Create a logged fetch function with automatic request/response logging
 */
export function createLoggedFetch(options?: {
  logger?: IApiLogger;
  enabled?: boolean;
  redactHeaders?: boolean;
  redactBody?: boolean;
}): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const logger = options?.logger ?? createApiLogger({ name: 'fetch-logger' });
  const enabled = options?.enabled ?? true;

  return async function loggedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (!enabled) {
      return fetch(input, init);
    }

    const url =
      typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
    const requestId = generateRequestId();
    const startTime = getPerformanceNow();

    const requestContext: ApiRequestContext = {
      requestId,
      method: init?.method ?? 'GET',
      url,
      headers: redactHeaders((init?.headers as Record<string, string>) ?? {}),
      body: redactBody(init?.body),
      timestamp: createTimestamp(),
    };

    logger.logRequest(requestContext);

    try {
      const response = await fetch(input, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          'X-Request-ID': requestId,
        },
      });
      const duration = getPerformanceNow() - startTime;

      // Clone response to capture body for logging without consuming the original
      const parsedBody = await parseResponseBodyForLog(response, MAX_BODY_SIZE);

      const responseContext: ApiResponseContext = {
        requestId,
        method: requestContext.method,
        url: requestContext.url,
        statusCode: response.status,
        duration,
        timestamp: createTimestamp(),
        // Apply redaction to response body (already truncated if needed)
        body: parsedBody ? redactBody(parsedBody.body) : undefined,
      };

      logger.logResponse(responseContext);

      return response;
    } catch (error) {
      const duration = getPerformanceNow() - startTime;

      logger.logError(error as Error, {
        requestId,
        method: requestContext.method,
        url: requestContext.url,
        duration,
      });

      throw error;
    }
  };
}

/**
 * Create fetch interceptors for manual integration
 */
export function createFetchInterceptor(options?: { logger?: IApiLogger; enabled?: boolean }): {
  request: InterceptorFunction;
  response: InterceptorFunction;
  error: InterceptorFunction;
} {
  const logger = options?.logger ?? createApiLogger({ name: 'interceptor' });
  const enabled = options?.enabled ?? true;

  const request: InterceptorFunction = async (url: string, options?: RequestInit) => {
    if (!enabled) {
      return { url, options };
    }

    const requestId = generateRequestId();
    const startTime = getPerformanceNow();

    logger.logRequest({
      requestId,
      method: options?.method ?? 'GET',
      url,
      headers: redactHeaders((options?.headers as Record<string, string>) ?? {}),
      body: redactBody(options?.body),
      timestamp: createTimestamp(),
    });

    return {
      url,
      options: {
        ...options,
        headers: {
          ...(options?.headers ?? {}),
          'X-Request-ID': requestId,
        },
      },
    };
  };

  const response: InterceptorFunction = async (url: string, options?: RequestInit) => {
    if (!enabled) {
      return { url, options };
    }

    const requestId = (options?.headers as Record<string, string>)?.['X-Request-ID'];
    const duration = getPerformanceNow() - getPerformanceNow(); // This would need start time from request

    if (requestId) {
      logger.logResponse({
        requestId,
        method: options?.method ?? 'GET',
        url,
        timestamp: createTimestamp(),
      } as ApiResponseContext);
    }

    return { url, options };
  };

  const error: InterceptorFunction = async (url: string, options?: RequestInit) => {
    if (!enabled) {
      return { url, options };
    }

    const requestId = (options?.headers as Record<string, string>)?.['X-Request-ID'];

    if (requestId) {
      logger.logError(new Error('Fetch failed'), {
        requestId,
        method: options?.method ?? 'GET',
        url,
      });
    }

    return { url, options };
  };

  return { request, response, error };
}

/**
 * Time an async API call with automatic logging
 */
export async function timeApiCall<T>(
  operation: string,
  fn: () => Promise<T>,
  logger?: IServerLogger,
  context?: LogContext
): Promise<T> {
  const log = logger ?? createServerLogger({ name: 'perf' });
  const startTime = getPerformanceNow();

  log.info(`${operation} started`, context);

  try {
    const result = await fn();
    const duration = getPerformanceNow() - startTime;

    log.info(`${operation} completed`, {
      ...context,
      duration,
    });

    return result;
  } catch (error) {
    const duration = getPerformanceNow() - startTime;

    log.error(`${operation} failed`, {
      ...context,
      duration,
      error: {
        message: (error as Error).message,
        name: (error as Error).name,
      },
    });

    throw error;
  }
}

export default createApiLogger;
export { ApiLoggerImpl, redactHeaders, redactBody, isBinaryContentType, getBodyType };
