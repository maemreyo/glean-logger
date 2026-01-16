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
 * - BodyLoggingConfig with builder pattern
 */

import { createServerLogger, ServerLoggerImpl } from './server';
import type {
  IApiLogger,
  ApiRequestContext,
  ApiResponseContext,
  LogContext,
  InterceptorFunction,
  IServerLogger,
  BodyLoggingConfig,
  ContentTypeFilter,
  RedactionPattern,
  SamplingConfig,
  LoggedFetchOptions,
} from './types';
import { generateRequestId, createTimestamp, getPerformanceNow } from './utils';

// ============================================================================
// Default Body Logging Configuration
// ============================================================================

/**
 * Default configuration for body logging
 * Sensible defaults: enable logging, 10KB limit, skip binary, redact sensitive
 */
const DEFAULT_BODY_LOGGING_CONFIG: BodyLoggingConfig = {
  enabled: true,
  maxSize: 10 * 1024, // 10KB
  readTimeout: 5000,
  maxDepth: 10,
  contentTypeFilter: {
    exclude: [
      'image/*',
      'audio/*',
      'video/*',
      'application/pdf',
      'application/zip',
      'application/octet-stream',
      'font/*',
      'multipart/form-data',
    ],
  },
  redactionPatterns: [
    {
      pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
      replacement: '[REDACTED-SSN]',
      fieldNames: ['ssn', 'socialsecuritynumber', 'taxid'],
    },
    {
      pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      replacement: '[REDACTED-CARD]',
      fieldNames: ['creditcard', 'cardnumber', 'ccnumber'],
    },
    {
      pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
      replacement: 'Bearer [REDACTED]',
      fieldNames: ['authorization'],
    },
  ],
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'apikey',
    'accesstoken',
    'refreshtoken',
    'privatekey',
    'ssn',
    'creditcard',
    'cardnumber',
    'cvv',
    'cvc',
  ],
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-forwarded-for',
  ],
  skipStatusCodes: [204, 304],
  verbose: false,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse size string (e.g., "10kb", "1mb") to bytes
 */
export function parseSize(sizeStr: string): number {
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    return DEFAULT_BODY_LOGGING_CONFIG.maxSize;
  }

  const value = parseFloat(match[1]!);
  const unit = match[2] || 'b';

  const multipliers: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  return Math.floor(value * (multipliers[unit] ?? 1));
}

/**
 * Parse duration string (e.g., "5s", "5000ms") to milliseconds
 */
export function parseDuration(durationStr: string): number {
  const match = durationStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(ms|s|m)?$/);
  if (!match) {
    return DEFAULT_BODY_LOGGING_CONFIG.readTimeout;
  }

  const value = parseFloat(match[1]!);
  const unit = match[2] || 'ms';

  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60 * 1000 };
  return Math.floor(value * (multipliers[unit] ?? 1));
}

// ============================================================================
// Builder Pattern for Body Logging Configuration
// ============================================================================

/**
 * Builder class for BodyLoggingConfig with fluent API
 */
export class ApiLoggerBuilder {
  private config: Partial<BodyLoggingConfig> = {};

  /**
   * Create a new builder instance
   */
  constructor(initialConfig?: Partial<BodyLoggingConfig>) {
    this.config = { ...initialConfig };
  }

  /**
   * Enable or disable body logging
   */
  enabled(enabled: boolean): this {
    this.config.enabled = enabled;
    return this;
  }

  /**
   * Set maximum body size (accepts bytes or string like "10kb", "1mb")
   */
  maxSize(size: number | string): this {
    this.config.maxSize = typeof size === 'string' ? parseSize(size) : size;
    return this;
  }

  /**
   * Set read timeout (accepts ms or string like "5s", "5000ms")
   */
  readTimeout(timeout: number | string): this {
    this.config.readTimeout = typeof timeout === 'string' ? parseDuration(timeout) : timeout;
    return this;
  }

  /**
   * Add content type patterns to exclude
   */
  excludeContentTypes(...patterns: string[]): this {
    if (!this.config.contentTypeFilter) {
      this.config.contentTypeFilter = {};
    }
    this.config.contentTypeFilter.exclude = [
      ...(this.config.contentTypeFilter.exclude ?? []),
      ...patterns,
    ];
    return this;
  }

  /**
   * Add content type patterns to include
   */
  includeContentTypes(...patterns: string[]): this {
    if (!this.config.contentTypeFilter) {
      this.config.contentTypeFilter = {};
    }
    this.config.contentTypeFilter.include = [
      ...(this.config.contentTypeFilter.include ?? []),
      ...patterns,
    ];
    return this;
  }

  /**
   * Add a custom redaction pattern
   */
  addRedactionPattern(pattern: RegExp, replacement: string, fieldNames?: string[]): this {
    if (!this.config.redactionPatterns) {
      this.config.redactionPatterns = [];
    }
    this.config.redactionPatterns.push({ pattern, replacement, fieldNames });
    return this;
  }

  /**
   * Add sensitive field names to redact
   */
  addSensitiveFields(...fields: string[]): this {
    if (!this.config.sensitiveFields) {
      this.config.sensitiveFields = [];
    }
    this.config.sensitiveFields.push(...fields.map(f => f.toLowerCase()));
    return this;
  }

  /**
   * Add sensitive header names to redact
   */
  addSensitiveHeaders(...headers: string[]): this {
    if (!this.config.sensitiveHeaders) {
      this.config.sensitiveHeaders = [];
    }
    this.config.sensitiveHeaders.push(...headers.map(h => h.toLowerCase()));
    return this;
  }

  /**
   * Configure sampling for high-traffic endpoints
   */
  sampling(rate: number, patterns?: string[]): this {
    if (rate < 0 || rate > 1) {
      throw new Error('Sampling rate must be between 0 and 1');
    }
    this.config.sampling = { rate, patterns };
    return this;
  }

  /**
   * Add status codes to skip body logging
   */
  skipStatusCodes(...codes: number[]): this {
    if (!this.config.skipStatusCodes) {
      this.config.skipStatusCodes = [];
    }
    this.config.skipStatusCodes.push(...codes);
    return this;
  }

  /**
   * Enable or disable verbose logging
   */
  verbose(enabled: boolean): this {
    this.config.verbose = enabled;
    return this;
  }

  /**
   * Set maximum nesting depth for response body logging
   */
  maxDepth(depth: number): this {
    this.config.maxDepth = depth;
    return this;
  }

  /**
   * Load configuration from environment variables
   */
  fromEnv(prefix = 'LOG_BODY'): this {
    const env = process.env as Record<string, string | undefined>;

    const keys = Object.keys(env).filter(k => k.startsWith(`${prefix}_`));

    for (const key of keys) {
      const value = env[key];
      if (!value) continue;

      const setting = key.slice(`${prefix}_`.length).toLowerCase();

      switch (setting) {
        case 'enabled':
          this.config.enabled = value === 'true' || value === '1';
          break;
        case 'max_size':
          this.config.maxSize = parseSize(value);
          break;
        case 'read_timeout':
          this.config.readTimeout = parseDuration(value);
          break;
        case 'sample_rate': {
          const rate = parseFloat(value);
          if (!isNaN(rate) && rate >= 0 && rate <= 1) {
            this.config.sampling = { ...this.config.sampling, rate };
          }
          break;
        }
        case 'sensitive_fields':
          this.config.sensitiveFields = value.split(',').map(s => s.trim().toLowerCase());
          break;
        case 'sensitive_headers':
          this.config.sensitiveHeaders = value.split(',').map(s => s.trim().toLowerCase());
          break;
        case 'verbose':
          this.config.verbose = value === 'true' || value === '1';
          break;
      }
    }

    return this;
  }

  /**
   * Build the final configuration by merging with defaults
   * Validates the configuration before returning
   */
  build(): BodyLoggingConfig {
    const finalConfig: BodyLoggingConfig = {
      ...DEFAULT_BODY_LOGGING_CONFIG,
      ...this.config,
      // Merge nested objects properly
      contentTypeFilter: {
        ...DEFAULT_BODY_LOGGING_CONFIG.contentTypeFilter,
        ...this.config.contentTypeFilter,
        exclude: [
          ...(DEFAULT_BODY_LOGGING_CONFIG.contentTypeFilter.exclude ?? []),
          ...(this.config.contentTypeFilter?.exclude ?? []),
        ],
        include: [
          ...(DEFAULT_BODY_LOGGING_CONFIG.contentTypeFilter.include ?? []),
          ...(this.config.contentTypeFilter?.include ?? []),
        ],
      },
      redactionPatterns: [
        ...(DEFAULT_BODY_LOGGING_CONFIG.redactionPatterns ?? []),
        ...(this.config.redactionPatterns ?? []),
      ],
      sensitiveFields: [
        ...(DEFAULT_BODY_LOGGING_CONFIG.sensitiveFields ?? []),
        ...(this.config.sensitiveFields ?? []),
      ],
      sensitiveHeaders: [
        ...(DEFAULT_BODY_LOGGING_CONFIG.sensitiveHeaders ?? []),
        ...(this.config.sensitiveHeaders ?? []),
      ],
      skipStatusCodes: [
        ...(DEFAULT_BODY_LOGGING_CONFIG.skipStatusCodes ?? []),
        ...(this.config.skipStatusCodes ?? []),
      ],
      maxDepth: this.config.maxDepth ?? DEFAULT_BODY_LOGGING_CONFIG.maxDepth,
      sampling:
        this.config.sampling !== undefined
          ? {
              ...DEFAULT_BODY_LOGGING_CONFIG.sampling,
              ...this.config.sampling,
            }
          : DEFAULT_BODY_LOGGING_CONFIG.sampling,
    };

    // Validate configuration
    this.validate(finalConfig);

    return finalConfig;
  }

  /**
   * Validate the configuration
   */
  private validate(config: BodyLoggingConfig): void {
    if (config.maxSize < 0) {
      throw new Error('maxSize must be non-negative');
    }

    if (config.maxSize > 100 * 1024 * 1024) {
      throw new Error('maxSize cannot exceed 100MB');
    }

    if (config.readTimeout < 0) {
      throw new Error('readTimeout must be non-negative');
    }

    if (config.sampling && (config.sampling.rate < 0 || config.sampling.rate > 1)) {
      throw new Error('sampling rate must be between 0 and 1');
    }

    if (config.maxDepth !== undefined && (config.maxDepth < 1 || config.maxDepth > 100)) {
      throw new Error('maxDepth must be between 1 and 100');
    }
  }
}

/**
 * Factory function to create a new ApiLoggerBuilder
 */
export function createBodyLoggingConfig(): ApiLoggerBuilder {
  return new ApiLoggerBuilder();
}

// ============================================================================
// Core Implementation
// ============================================================================

/**
 * Check if content type is binary (should not log body)
 */
export function isBinaryContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  const binaryPatterns = DEFAULT_BODY_LOGGING_CONFIG.contentTypeFilter.exclude ?? [];
  return binaryPatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(normalized);
    }
    return normalized.includes(pattern);
  });
}

/**
 * Get response body type based on content-type header
 */
export function getBodyType(contentType: string): 'json' | 'text' | null {
  const normalized = contentType.toLowerCase();

  if (
    normalized.includes('json') ||
    normalized.includes('application/xml') ||
    normalized.includes('text/')
  ) {
    return normalized.includes('json') ? 'json' : 'text';
  }

  if (isBinaryContentType(normalized)) {
    return null;
  }

  return 'text';
}

/**
 * Match content type against pattern (supports wildcards)
 */
function matchContentType(contentType: string, pattern: string): boolean {
  const normalizedPattern = pattern.toLowerCase();
  const normalized = contentType.toLowerCase();

  // Exact match
  if (normalizedPattern === normalized) {
    return true;
  }

  // Wildcard match
  if (normalizedPattern.includes('*')) {
    const regex = new RegExp('^' + normalizedPattern.replace(/\*/g, '.*') + '$');
    return regex.test(normalized);
  }

  // Prefix match
  return normalized.startsWith(normalizedPattern);
}

/**
 * Check if content type is allowed based on filter configuration
 */
function isContentTypeAllowed(contentType: string, filter: ContentTypeFilter): boolean {
  const normalized = contentType.toLowerCase();

  // Check exclude patterns first
  for (const pattern of filter.exclude ?? []) {
    if (matchContentType(normalized, pattern)) {
      return false;
    }
  }

  // Check include patterns
  if (filter.include && filter.include.length > 0) {
    for (const pattern of filter.include) {
      if (matchContentType(normalized, pattern)) {
        return true;
      }
    }
    return false;
  }

  return true;
}

/**
 * Determine if request should be logged based on sampling config
 * Returns true if request SHOULD be logged (sampled), false to skip
 */
function shouldSample(url: string, sampling: SamplingConfig): boolean {
  // If no patterns specified, apply sampling rate to all requests
  if (!sampling.patterns || sampling.patterns.length === 0) {
    return Math.random() < sampling.rate;
  }

  // Check if URL matches any pattern
  const matchesPattern = sampling.patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(url);
    }
    return url.includes(pattern);
  });

  // Only sample if URL matches pattern AND passes rate check
  return matchesPattern && Math.random() < sampling.rate;
}

/**
 * Apply all redaction patterns and field-based redaction to body
 * Handles circular references using WeakSet and depth limiting to prevent stack overflow
 */
function applyRedaction(
  body: unknown,
  config: BodyLoggingConfig,
  visited?: WeakSet<object>,
  depth = 0
): unknown {
  const maxDepth = config.maxDepth ?? 10;

  // Check depth limit before processing
  if (depth > maxDepth) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (!body || typeof body !== 'object') {
    return body;
  }

  // Initialize visited set for circular reference detection
  if (!visited) {
    visited = new WeakSet();
  }

  // Handle arrays
  if (Array.isArray(body)) {
    return body.map(item => applyRedaction(item, config, visited, depth));
  }

  // Check for circular reference
  if (visited.has(body)) {
    return '[REDACTED-CIRCULAR]';
  }
  visited.add(body);

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase();

    // Check if field is in sensitive fields list
    if (config.sensitiveFields.some(field => normalizedKey === field.toLowerCase())) {
      redacted[key] = '[REDACTED]';
      continue;
    }

    // Apply redaction patterns if field name matches
    let redactedValue = value;
    for (const pattern of config.redactionPatterns) {
      if (!pattern.fieldNames || pattern.fieldNames.some(f => normalizedKey === f.toLowerCase())) {
        if (typeof value === 'string') {
          redactedValue = value.replace(pattern.pattern, pattern.replacement);
        }
      }
    }

    // Recursively process nested objects with depth tracking
    if (typeof redactedValue === 'object' && redactedValue !== null) {
      redacted[key] = applyRedaction(redactedValue, config, visited, depth + 1);
    } else {
      redacted[key] = redactedValue;
    }
  }

  return redacted;
}

/**
 * Read body with timeout using the provided config for maxSize
 */
async function readBodyWithTimeout(
  response: Response,
  timeout: number,
  maxSize: number
): Promise<{ body: unknown; truncated: boolean } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const contentType = response.headers.get('content-type') || '';

    let body: unknown;
    let truncated = false;

    if (contentType.includes('json')) {
      body = await response.json();
    } else {
      const text = await response.text();

      // Check size after reading using the provided maxSize
      if (text.length > maxSize) {
        body = `${text.slice(0, maxSize)}... [truncated]`;
        truncated = true;
      } else {
        body = text;
      }
    }

    clearTimeout(timeoutId);
    return { body, truncated };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

/**
 * Safely parse response body for logging with configurable options
 */
async function parseResponseBodyForLog(
  response: Response,
  config: BodyLoggingConfig,
  url?: string
): Promise<{ body: unknown; truncated: boolean } | null> {
  // Check if body logging is disabled
  if (!config.enabled) {
    if (config.verbose) {
      console.debug('[BodyLogging] Body logging disabled');
    }
    return null;
  }

  // Check for no-content responses
  if (config.skipStatusCodes.includes(response.status)) {
    return null;
  }

  // Skip if body is null/undefined (HEAD requests, etc.)
  if (!response.body) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  // Check content type filter
  if (!isContentTypeAllowed(contentType, config.contentTypeFilter)) {
    return null;
  }

  // Check Content-Length header before cloning to avoid memory issues
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > config.maxSize * 2) {
      return null;
    }
  }

  // Check sampling
  if (config.sampling && url && !shouldSample(url, config.sampling)) {
    return null;
  }

  try {
    // Clone response with timeout
    const cloned = response.clone();
    const bodyResult = await readBodyWithTimeout(cloned, config.readTimeout, config.maxSize);

    if (!bodyResult) {
      return null;
    }

    const { body, truncated } = bodyResult;

    // Apply redaction
    const redactedBody = applyRedaction(body, config);

    return { body: redactedBody, truncated };
  } catch {
    return null;
  }
}

/**
 * Redact sensitive data from headers based on config
 */
function redactHeadersWithConfig(
  headers: Record<string, string>,
  config: BodyLoggingConfig
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();
    if (config.sensitiveHeaders.some(h => normalizedKey === h.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Redact sensitive data from body based on config
 */
function redactBodyWithConfig(body: unknown, config: BodyLoggingConfig): unknown {
  return applyRedaction(body, config);
}

/**
 * Redact sensitive data from headers (legacy function for backward compatibility)
 */
function redactHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const redacted: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();
    if (DEFAULT_BODY_LOGGING_CONFIG.sensitiveHeaders.includes(normalizedKey)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Redact sensitive data from body (legacy function for backward compatibility)
 */
function redactBody(body: unknown): unknown {
  return applyRedaction(body, DEFAULT_BODY_LOGGING_CONFIG);
}

// ============================================================================
// API Logger Implementation
// ============================================================================

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
    this.logger.info('API Request', {
      type: 'request',
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      headers: context.headers,
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
      ...(context.body !== undefined && { responseBody: context.body as object }),
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

// ============================================================================
// Public API
// ============================================================================

/**
 * Create API logger instance
 */
export function createApiLogger(options?: { name?: string }): IApiLogger {
  return new ApiLoggerImpl(options);
}

/**
 * Create a logged fetch function with automatic request/response logging
 * Supports BodyLoggingConfig via builder pattern
 */
export function createLoggedFetch(
  options?: LoggedFetchOptions
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const logger = options?.logger ?? createApiLogger({ name: 'fetch-logger' });
  const enabled = options?.enabled ?? true;

  // Build body logging config from options or defaults
  let bodyConfig: BodyLoggingConfig;

  if (options?.bodyLoggingConfig) {
    // Use provided config directly
    bodyConfig = options.bodyLoggingConfig;
  } else if (
    process.env.LOG_BODY_ENABLED !== undefined ||
    process.env.LOG_BODY_MAX_SIZE !== undefined
  ) {
    // Load from environment if any env var is set
    bodyConfig = new ApiLoggerBuilder().fromEnv().build();
  } else {
    // Use default config
    bodyConfig = DEFAULT_BODY_LOGGING_CONFIG;
  }

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

    // Redact headers based on config
    const redactHeadersValue = options?.redactHeaders !== false;
    const headers = redactHeadersValue
      ? redactHeadersWithConfig((init?.headers as Record<string, string>) ?? {}, bodyConfig)
      : ((init?.headers as Record<string, string>) ?? {});

    const requestContext: ApiRequestContext = {
      requestId,
      method: init?.method ?? 'GET',
      url,
      headers,
      body: redactBodyWithConfig(init?.body, bodyConfig),
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

      // Parse response body with config
      const parsedBody = await parseResponseBodyForLog(response, bodyConfig, url);

      const responseContext: ApiResponseContext = {
        requestId,
        method: requestContext.method,
        url: requestContext.url,
        statusCode: response.status,
        duration,
        timestamp: createTimestamp(),
        body: parsedBody ? parsedBody.body : undefined,
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

// ============================================================================
// Exports
// ============================================================================

export default createApiLogger;
export { ApiLoggerImpl, DEFAULT_BODY_LOGGING_CONFIG, redactHeaders, redactBody, applyRedaction };
