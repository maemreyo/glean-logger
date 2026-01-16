import { child, ApiLoggerBuilder, createLoggedFetch, createApiLogger } from '@zaob/glean-logger';

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

export const apiLog = child({
  service: 'nextjs-api',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

export const serverLog = child({
  service: 'nextjs-app',
  environment: process.env.NODE_ENV || 'development',
});
