/**
 * API Client with comprehensive logging using @zaob/glean-logger
 *
 * Features:
 * - Request/Response logging with timing
 * - Automatic body logging with sensitive data redaction
 * - Configurable logging presets (development, production, basic, minimal)
 * - Environment-based configuration
 * - Full authentication, timeout, and error handling
 */

import createClient from 'openapi-fetch';
import { toast } from 'sonner';
import { securityUtils, useTokenStore } from '@/lib/auth/secure-tokens';
import { createTimeoutController } from './timeouts/abort-timeout';

// Timeout configuration imports
import { DEFAULT_RETRY } from './timeouts/constants';
import { resolveTimeout } from './timeouts/resolver';
import { useTimeoutStore } from './timeouts/timeout-store';
import type { paths } from './v1.d.ts';

// ============================================================================
// Glean Logger Imports - API Logging
// ============================================================================

import { ApiLoggerBuilder, createApiLogger, createLoggedFetch } from '@zaob/glean-logger';
import { browserLogger } from '@/lib/browser-logger';

// ============================================================================
// Body Logging Configuration
// ============================================================================

/**
 * Create body logging configuration with builder pattern
 *
 * Presets:
 * - .basic() - Sensible defaults for most use cases
 * - .production() - Security & performance optimized (recommended for production)
 * - .development() - Verbose logging for debugging
 * - .minimal() - Maximum performance, minimal logging
 *
 * @example
 * ```typescript
 * const bodyLoggingConfig = new ApiLoggerBuilder()
 *   .production()
 *   .addSensitiveFields('customField')
 *   .build();
 * ```
 */
const bodyLoggingConfig = new ApiLoggerBuilder().production().build();

// Create API logger instance for server-side logging
const apiLogger = createApiLogger({ name: 'api-client' });

// Create logged fetch for external API calls
const loggedFetch = createLoggedFetch({
  enabled: true,
  logger: apiLogger,
  bodyLoggingConfig,
});

// ============================================================================
// Environment Configuration
// ============================================================================

// API Configuration based on environment
const getApiConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const environment = process.env.NEXT_PUBLIC_API_ENVIRONMENT || nodeEnv;

  switch (environment) {
    case 'production':
      return {
        baseUrl: 'https://api.dop-fe.com/',
        mockMode: false,
      };
    case 'staging':
      return {
        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://dop-stg.datanest.vn/',
        mockMode: false,
      };
    case 'development':
    default:
      return {
        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
        mockMode: false,
      };
  }
};

const apiConfig = getApiConfig();

// ============================================================================
// Request/Response Logging Utilities
// ============================================================================

/**
 * Extended Request interface with logging metadata
 */
interface LoggingRequest extends Request {
  _loggingStartTime?: number;
  _loggingRequestId?: string;
}

/**
 * Parse request body for logging purposes
 * Handles FormData, JSON strings, and other body types
 */
async function parseRequestBody(body: unknown): Promise<unknown> {
  if (!body) return undefined;

  if (body instanceof FormData) {
    const entries: Record<string, string> = {};
    for (const [key, value] of body.entries()) {
      entries[key] =
        value instanceof File ? `File(${value.name}, ${value.size} bytes)` : String(value);
    }
    return entries;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  if (body instanceof ReadableStream) {
    return '[ReadableStream]';
  }

  if (body instanceof Blob) {
    return `[Blob: ${body.size} bytes, ${body.type}]`;
  }

  return body;
}

/**
 * Parse response body for logging purposes
 * Clones the response to avoid consuming the original stream
 */
async function parseResponseBody(
  response: Response,
  maxSize: number = 10240 // 10KB default
): Promise<{ body: unknown; truncated: boolean } | null> {
  try {
    // Check content-type to determine parsing strategy
    const contentType = response.headers.get('content-type') || '';
    const cloned = response.clone();

    if (contentType.includes('application/json')) {
      const text = await cloned.text();
      if (text.length > maxSize) {
        return {
          body: `${text.slice(0, maxSize)}... [truncated]`,
          truncated: true,
        };
      }
      try {
        return { body: JSON.parse(text), truncated: false };
      } catch {
        return { body: text, truncated: false };
      }
    }

    if (contentType.includes('text/')) {
      const text = await cloned.text();
      if (text.length > maxSize) {
        return {
          body: `${text.slice(0, maxSize)}... [truncated]`,
          truncated: true,
        };
      }
      return { body: text, truncated: false };
    }

    // Binary content - don't log body
    return null;
  } catch (error) {
    console.warn('[API Client] Failed to parse response body for logging:', error);
    return null;
  }
}

// ============================================================================
// Initialize API Client
// ============================================================================

const apiClient = createClient<paths>({
  baseUrl: apiConfig.baseUrl,
  // Add headers for API versioning
  headers: {
    // "X-API-Version": "1.0",
    // "X-Client-Version": "1.0.0",
  },
});

// ============================================================================
// Add Advanced Interceptors with Logging
// ============================================================================

apiClient.use({
  /**
   * Request interceptor - runs on every request
   * Handles: Auth, CSRF, Timeout, Logging
   */
  async onRequest(req): Promise<Request> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    // Store timing data on request for response logging
    (req.request as LoggingRequest)._loggingStartTime = startTime;
    (req.request as LoggingRequest)._loggingRequestId = requestId;

    // ========================================================================
    // Authentication Logic
    // ========================================================================

    const { getAccessToken, isTokenExpired, refreshTokens } = useTokenStore.getState();
    let token = getAccessToken();

    // Check if token needs refresh
    if (token && isTokenExpired()) {
      const refreshed = await refreshTokens();
      token = getAccessToken();

      if (!refreshed || !token) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Authentication failed');
      }
    }

    if (token) {
      req.request.headers.set('Authorization', `Bearer ${token}`);

      // Add CSRF protection for state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.request.method)) {
        const csrfToken = securityUtils.generateCSRFToken();
        req.request.headers.set('X-CSRF-Token', csrfToken);
      }
    }

    // ========================================================================
    // Timeout Handling
    // ========================================================================

    const url = new URL(req.request.url, window.location.origin);
    const endpoint = url.pathname;
    const config = useTimeoutStore.getState().config;

    // Resolve timeout for this endpoint
    const resolution = resolveTimeout(endpoint, config);

    // Create timeout controller
    const { signal: timeoutSignal } = createTimeoutController(resolution.timeout);

    // Merge timeout signal with existing signal if present
    let finalSignal = timeoutSignal;

    if (req.request.signal) {
      const combinedController = new AbortController();

      // Handler for timeout abort
      const handleTimeoutAbort = () => {
        combinedController.abort();
        if (req.request.signal) {
          req.request.signal.removeEventListener('abort', handleOriginalAbort);
        }
      };

      // Handler for original signal abort
      const handleOriginalAbort = () => {
        combinedController.abort();
        timeoutSignal.removeEventListener('abort', handleTimeoutAbort);
      };

      // Listen to both signals
      timeoutSignal.addEventListener('abort', handleTimeoutAbort, {
        once: true,
      });
      req.request.signal.addEventListener('abort', handleOriginalAbort, {
        once: true,
      });

      finalSignal = combinedController.signal;
    }

    // ========================================================================
    // API Request Logging (using browserLogger)
    // ========================================================================

    // Parse request body for logging (with redaction for sensitive data)
    const requestBody = bodyLoggingConfig.enabled
      ? await parseRequestBody(req.request.body)
      : undefined;

    // Log request using browserLogger (for client-side batching to server)
    browserLogger.logRequest(
      {
        method: req.request.method,
        url: req.request.url,
        body: requestBody,
      },
      undefined
    );

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${req.request.method} ${req.request.url}`, {
        requestId,
        body: requestBody,
        headers: Object.fromEntries(req.request.headers.entries()),
      });
    }

    // Create a new Request with the combined signal
    const modifiedRequest = new Request(req.request, {
      signal: finalSignal,
    });

    // Restore logging metadata to new request
    (modifiedRequest as LoggingRequest)._loggingStartTime = startTime;
    (modifiedRequest as LoggingRequest)._loggingRequestId = requestId;

    return modifiedRequest;
  },

  /**
   * Response interceptor - runs on every response
   * Handles: Token Refresh, Security Headers, Errors, Rate Limiting, Logging
   */
  async onResponse(res) {
    const req = res.request;
    const loggingRequest = req as LoggingRequest;

    // ========================================================================
    // Calculate Request Duration
    // ========================================================================

    const startTime = loggingRequest._loggingStartTime || Date.now();
    const requestId = loggingRequest._loggingRequestId || 'unknown';
    const duration = Date.now() - startTime;

    // ========================================================================
    // Token Refresh Logic
    // ========================================================================

    if (res.response.status === 401 && !req.url.includes('/refresh')) {
      const { refreshTokens, clearTokens } = useTokenStore.getState();

      try {
        const refreshed = await refreshTokens();
        if (!refreshed) {
          throw new Error('Token refresh failed');
        }

        // In a real implementation, you would retry the original request
      } catch (error) {
        console.error('Token refresh failed, logging out.', error);
        clearTokens();

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Authentication failed');
      }
    }

    // ========================================================================
    // Security Headers Validation
    // ========================================================================

    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
    ];

    const missingHeaders = securityHeaders.filter(header => !res.response.headers.get(header));

    if (missingHeaders.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('Missing security headers:', missingHeaders);
    }

    // ========================================================================
    // Global Error Handling
    // ========================================================================

    if (res.response.status >= 500) {
      const errorData = {
        status: res.response.status,
        url: res.request.url,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        requestId,
        duration,
      };

      // Log error using browserLogger
      browserLogger.error(`Server error: ${res.response.status}`, {
        ...errorData,
      });

      // Log to monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Server error:', errorData);
        // logErrorToMonitoringService(errorData);
      }

      toast.error('A server error occurred', {
        description: 'Please try again later or contact support.',
      });
    }

    // ========================================================================
    // Rate Limiting Detection
    // ========================================================================

    if (res.response.status === 429) {
      const retryAfter = res.response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

      browserLogger.warn('Rate limit exceeded', {
        retryAfter: waitTime,
        url: res.request.url,
      });

      toast.error('Rate limit exceeded', {
        description: `Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`,
      });

      throw new Error(`Rate limited. Retry after ${waitTime}ms`);
    }

    // ========================================================================
    // Timeout Error Detection
    // ========================================================================

    if (res.request.signal?.aborted) {
      const url = new URL(res.request.url, window.location.origin);
      const endpoint = url.pathname;
      const config = useTimeoutStore.getState().config;
      const resolution = resolveTimeout(endpoint, config);

      const timeoutError = new Error(
        `Request to ${endpoint} timed out after ${resolution.timeout}ms`
      ) as Error & {
        name: string;
        code: string;
        endpoint: string;
        timeout: number;
      };

      timeoutError.name = 'TimeoutError';
      timeoutError.code = 'TIMEOUT';
      timeoutError.endpoint = endpoint;
      timeoutError.timeout = resolution.timeout;

      // Log timeout error using browserLogger
      browserLogger.error(`Request timeout: ${endpoint}`, {
        requestId,
        method: res.request.method,
        url: res.request.url,
        duration,
        timeout: resolution.timeout,
      });

      // Show user-friendly error toast
      toast.error('Request timeout', {
        description: `The request took too long to complete. Please try again.`,
      });

      throw timeoutError;
    }

    // ========================================================================
    // API Response Logging (using browserLogger)
    // ========================================================================

    // Parse response body for logging (respects body logging config)
    const responseBodyResult = await parseResponseBody(res.response, bodyLoggingConfig.maxSize);

    // Log response using browserLogger
    browserLogger.logRequest(
      {
        method: res.request.method,
        url: res.request.url,
        body: res.request.body ? await parseRequestBody(res.request.body) : undefined,
      },
      {
        status: res.response.status,
        body: responseBodyResult?.body,
      }
    );

    return res.response;
  },
});

// ============================================================================
// Retry Utility with Logging
// ============================================================================

/**
 * Retry utility for API calls with exponential backoff
 * Uses correct defaults from DEFAULT_RETRY constants
 */
export const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = DEFAULT_RETRY.MAX_RETRIES,
  delay = DEFAULT_RETRY.INITIAL_DELAY
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (
        lastError.name === 'TimeoutError' ||
        lastError.message.includes('Authentication failed')
      ) {
        throw lastError;
      }

      if (i === maxRetries) {
        throw lastError;
      }

      // Log retry attempt using browserLogger
      browserLogger.warn(`Retry attempt ${i + 1}/${maxRetries}`, {
        error: lastError.message,
        nextRetryDelay: delay,
      });

      // Show retry notification to user
      toast.info(`Retrying... (${i + 1}/${maxRetries})`, {
        description: `Attempting again in ${Math.ceil(delay / 1000)}s`,
      });

      // Exponential backoff with max delay cap
      const backoffDelay = Math.min(
        delay * DEFAULT_RETRY.BACKOFF_MULTIPLIER ** i,
        DEFAULT_RETRY.MAX_DELAY
      );
      const jitter = Math.random() * 200; // Add 0-200ms jitter
      await new Promise(resolve => setTimeout(resolve, backoffDelay + jitter));
    }
  }

  throw lastError!;
};

// ============================================================================
// Export
// ============================================================================

export default apiClient;
export { loggedFetch, bodyLoggingConfig };
