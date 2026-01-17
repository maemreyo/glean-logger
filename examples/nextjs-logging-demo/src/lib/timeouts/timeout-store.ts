/**
 * Timeout store for managing timeout configurations
 */

import type { TimeoutStore, TimeoutConfig } from './types';

const defaultConfig: TimeoutConfig = {
  defaultTimeout: 30000,
  endpointTimeouts: {},
};

let storeConfig: TimeoutConfig = { ...defaultConfig };

export const useTimeoutStore = {
  getState: (): TimeoutStore => ({
    config: storeConfig,
    setConfig: (config: TimeoutConfig) => {
      storeConfig = config;
    },
    getTimeout: (endpoint: string): number => {
      return storeConfig.endpointTimeouts[endpoint] ?? storeConfig.defaultTimeout;
    },
  }),
};
