// Mock for lib/config
// Used in tests

export interface LoggingConfig {
  enabled: boolean;
  browserExceptions: boolean;
  browserRequests: boolean;
  browserQueries: boolean;
  serverLogs: boolean;
  serverApi: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  batchSize: number;
  batchInterval: number;
  apiUrl: string;
}

let mockConfig: LoggingConfig = {
  enabled: true,
  browserExceptions: true,
  browserRequests: true,
  browserQueries: true,
  serverLogs: true,
  serverApi: true,
  level: 'debug',
  batchSize: 10,
  batchInterval: 5000,
  apiUrl: 'http://localhost:3000',
};

export function getLoggingConfig(): LoggingConfig {
  return mockConfig;
}

export function isLoggingEnabled(): boolean {
  return mockConfig.enabled;
}

export function isBrowserExceptionsEnabled(): boolean {
  return mockConfig.enabled && mockConfig.browserExceptions;
}

export function isBrowserRequestsEnabled(): boolean {
  return mockConfig.enabled && mockConfig.browserRequests;
}

export function isBrowserQueriesEnabled(): boolean {
  return mockConfig.enabled && mockConfig.browserQueries;
}

export function isServerLogsEnabled(): boolean {
  return mockConfig.enabled && mockConfig.serverLogs;
}

export function isServerApiEnabled(): boolean {
  return mockConfig.enabled && mockConfig.serverApi;
}

export function setMockConfig(config: Partial<LoggingConfig>) {
  mockConfig = { ...mockConfig, ...config };
}

export function resetMockConfig() {
  mockConfig = {
    enabled: true,
    browserExceptions: true,
    browserRequests: true,
    browserQueries: true,
    serverLogs: true,
    serverApi: true,
    level: 'debug',
    batchSize: 10,
    batchInterval: 5000,
    apiUrl: 'http://localhost:3000',
  };
}
