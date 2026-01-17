/**
 * Timeout configuration constants
 */

export const DEFAULT_RETRY = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY: 30000,
} as const;

export const DEFAULT_TIMEOUTS = {
  DEFAULT: 30000,
  LONG: 60000,
  SHORT: 5000,
} as const;
