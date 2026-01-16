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
 * Configure HTTP body logging using the production preset.
 *
 * Presets available:
 * - .basic()      - Just works with sensible defaults
 * - .production() - Security & performance optimized (used here)
 * - .development() - Verbose logging for debugging
 * - .minimal()    - Maximum performance, minimal logging
 */
export const bodyLoggingConfig = new ApiLoggerBuilder().production().build();

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
