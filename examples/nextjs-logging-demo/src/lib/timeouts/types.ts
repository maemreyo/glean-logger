/**
 * Timeout configuration types
 */

export interface TimeoutConfig {
  defaultTimeout: number;
  endpointTimeouts: Record<string, number>;
}

export interface TimeoutResolution {
  timeout: number;
  source: 'endpoint' | 'default';
}

export interface TimeoutEntry {
  endpoint: string;
  timeout: number;
  createdAt: number;
}

export type TimeoutStore = {
  config: TimeoutConfig;
  setConfig: (config: TimeoutConfig) => void;
  getTimeout: (endpoint: string) => number;
};
