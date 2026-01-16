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
  'apiKey',
  'apikey',
  'accessToken',
  'refreshToken',
  'ssn',
  'creditCard',
  'cardNumber',
];

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

      const responseContext: ApiResponseContext = {
        requestId,
        method: requestContext.method,
        url: requestContext.url,
        statusCode: response.status,
        duration,
        timestamp: createTimestamp(),
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
export { ApiLoggerImpl };
