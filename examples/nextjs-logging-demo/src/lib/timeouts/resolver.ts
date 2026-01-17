/**
 * Timeout resolver - determines the appropriate timeout for an endpoint
 */

import type { TimeoutConfig, TimeoutResolution } from './types';

/**
 * Resolve the timeout for a given endpoint
 */
export function resolveTimeout(endpoint: string, config: TimeoutConfig): TimeoutResolution {
  // Check for exact match first
  if (config.endpointTimeouts[endpoint] !== undefined) {
    return {
      timeout: config.endpointTimeouts[endpoint]!,
      source: 'endpoint',
    };
  }

  // Check for pattern match (prefix-based)
  for (const [pattern, timeout] of Object.entries(config.endpointTimeouts)) {
    if (endpoint.startsWith(pattern)) {
      return { timeout, source: 'endpoint' };
    }
  }

  // Fall back to default
  return {
    timeout: config.defaultTimeout,
    source: 'default',
  };
}
