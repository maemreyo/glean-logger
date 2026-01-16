import { logger, child } from '@zaob/glean-logger';

export interface ServerLogger {
  info: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  debug: (message: string, metadata?: Record<string, unknown>) => void;
}

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
