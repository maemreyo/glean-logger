// Environment-based configuration for logging features
// All values can be overridden via .env.local

export interface LoggingConfig {
  // Master switch
  enabled: boolean;

  // Browser features
  browserExceptions: boolean;
  browserRequests: boolean;
  browserQueries: boolean;

  // Server features
  serverLogs: boolean;
  serverApi: boolean;

  // Log level
  level: 'debug' | 'info' | 'warn' | 'error';

  // Batch settings
  batchSize: number;
  batchInterval: number;

  // API URL
  apiUrl: string;
}

export function getLoggingConfig(): LoggingConfig {
  // Only enable in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Master switch - only works in development
  const enabled = isDevelopment && process.env.DEBUG_MODE === 'true';

  return {
    enabled,
    browserExceptions: enabled && process.env.DEBUG_BROWSER_EXCEPTIONS === 'true',
    browserRequests: enabled && process.env.DEBUG_BROWSER_REQUESTS === 'true',
    browserQueries: enabled && process.env.DEBUG_BROWSER_QUERIES === 'true',
    serverLogs: enabled && process.env.DEBUG_SERVER_LOGS === 'true',
    serverApi: enabled && process.env.DEBUG_SERVER_API === 'true',
    level: (process.env.LOG_LEVEL as LoggingConfig['level']) || 'debug',
    batchSize: parseInt(process.env.LOG_BATCH_SIZE || '10', 10),
    batchInterval: parseInt(process.env.LOG_BATCH_INTERVAL || '5000', 10),
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  };
}

// Check if logging is enabled
export function isLoggingEnabled(): boolean {
  return getLoggingConfig().enabled;
}

// Check if specific feature is enabled
export function isBrowserExceptionsEnabled(): boolean {
  return getLoggingConfig().browserExceptions;
}

export function isBrowserRequestsEnabled(): boolean {
  return getLoggingConfig().browserRequests;
}

export function isBrowserQueriesEnabled(): boolean {
  return getLoggingConfig().browserQueries;
}

export function isServerLogsEnabled(): boolean {
  return getLoggingConfig().serverLogs;
}

export function isServerApiEnabled(): boolean {
  return getLoggingConfig().serverApi;
}
