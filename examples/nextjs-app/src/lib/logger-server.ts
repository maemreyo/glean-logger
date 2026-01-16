import { child, ApiLoggerBuilder, createLoggedFetch, createApiLogger } from '@zaob/glean-logger';

// ============================================================================
// ApiLoggerBuilder Configuration
// ============================================================================

/**
 * Configure HTTP body logging using the basic preset.
 *
 * Presets available:
 * - .basic()      - Just works with sensible defaults (used here)
 * - .production() - Security & performance optimized
 * - .development() - Verbose logging for debugging
 * - .minimal()    - Maximum performance, minimal logging
 */
export const bodyLoggingConfig = new ApiLoggerBuilder().basic().build();

// Create loggedFetch for external API calls with body logging
export const loggedFetch = createLoggedFetch({
  enabled: true,
  logger: createApiLogger({ name: 'external-api' }),
  bodyLoggingConfig,
});

// ============================================================================
// Logger Setup
// ============================================================================

export const apiLog = child({
  service: 'nextjs-api',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

export const serverLog = child({
  service: 'nextjs-app',
  environment: process.env.NODE_ENV || 'development',
});
