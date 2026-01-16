import {
  logger,
  child,
  ApiLoggerBuilder,
  createLoggedFetch,
  createApiLogger,
} from '@zaob/glean-logger';

export interface ServerLogger {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  debug: (message: string, metadata?: Record<string, unknown>) => void;
}

// ============================================================================
// ApiLoggerBuilder Configuration
// ============================================================================

/**
 * Configure HTTP body logging for Next.js API routes.
 * This demonstrates the ApiLoggerBuilder pattern for production-ready
 * HTTP logging with security, performance, and content filtering.
 */
export const bodyLoggingConfig = new ApiLoggerBuilder()
  .enabled(true)
  .maxSize('10kb')
  .readTimeout('5s')
  .excludeContentTypes('image/*', 'video/*', 'application/pdf', 'font/*', 'multipart/form-data')
  .addRedactionPattern(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '[REDACTED-SSN]', [
    'ssn',
    'socialsecuritynumber',
    'taxid',
  ])
  .addRedactionPattern(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED-CARD]', [
    'creditcard',
    'cardnumber',
    'ccnumber',
  ])
  .addSensitiveFields('password', 'token', 'secret', 'apikey', 'accesstoken', 'refreshtoken')
  .addSensitiveHeaders('authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token')
  .skipStatusCodes(204, 304)
  .verbose(process.env.NODE_ENV === 'development')
  .maxDepth(10)
  .build();

// Create loggedFetch for external API calls with body logging
export const loggedFetch = createLoggedFetch({
  enabled: true,
  logger: createApiLogger({ name: 'external-api' }),
  bodyLoggingConfig,
});

// ============================================================================
// Logger Setup
// ============================================================================

// Create main server logger - auto-detects Node.js environment
export const serverLogger = logger({ name: 'nextjs-app' }) as unknown as ServerLogger;

// Child logger for API context
export const apiLogger = child({ module: 'api' });

export function logApiRequest(method: string, url: string, requestId: string) {
  serverLogger.info('API Request', {
    type: 'request',
    method,
    url,
    requestId,
  });
}

export function logApiResponse(
  method: string,
  url: string,
  requestId: string,
  status: number,
  duration: number,
  responseBody?: unknown
) {
  serverLogger.info('API Response', {
    type: 'response',
    method,
    url,
    requestId,
    status,
    duration: `${duration}ms`,
    ...(responseBody !== undefined && { responseBody }),
  });
}

export function logServerEvent(event: string, metadata?: Record<string, unknown>) {
  serverLogger.info(event, { type: 'event', ...metadata });
}

export function logError(error: Error, context?: Record<string, unknown>) {
  serverLogger.error(error.message, {
    type: 'error',
    stack: error.stack,
    ...context,
  });
}
