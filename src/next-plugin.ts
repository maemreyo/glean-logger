/**
 * MIT License
 *
 * Copyright (c) 2026 Zaob <zaob.ogn@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Next.js Plugin for Browser Logging
 *
 * Feature: 001-browser-log-sync
 * Automatically sets up the API route and configuration for client-to-server logging.
 *
 * USAGE:
 * ```javascript
 * // next.config.js
 * const { withLogger } = require('@zaob/glean-logger/next-plugin');
 *
 * module.exports = withLogger({
 *   // Configuration options
 *   apiRoute: true,
 *   logDir: './_logs',
 *   batchingMode: 'time',
 *   batchingTimeMs: 3000,
 *   retryEnabled: true,
 * });
 * ```
 */

import path from 'path';
import fs from 'fs';
import type { NextConfig } from 'next';
import type { LoggerPluginOptions } from './types';

/**
 * Default plugin options
 */
const DEFAULT_OPTIONS: Required<LoggerPluginOptions> = {
  apiRoute: true,
  apiRoutePath: 'api/logger',
  reactProvider: true,
  logDir: './_logs',
  batchingMode: 'time',
  batchingTimeMs: 3000,
  batchingCount: 10,
  retryEnabled: true,
  retryMaxRetries: 3,
};

/**
 * Get the API route template path
 */
function getApiRouteTemplatePath(): string {
  // Try to find the template in node_modules (published package)
  let templatePath = path.resolve(
    process.cwd(),
    'node_modules/@zaob/glean-logger/dist/templates/next-api-logger-route.ts'
  );

  if (!fs.existsSync(templatePath)) {
    // Try to find the template in the source (development)
    templatePath = path.resolve(__dirname, '../../templates/next-api-logger-route.ts');
  }

  return templatePath;
}

/**
 * Get the output directory for the API route
 */
function getApiRouteOutputPath(
  nextConfig: NextConfig,
  options: Required<LoggerPluginOptions>
): string {
  // Determine the app directory
  const appDir = path.resolve(process.cwd(), 'src/app');

  if (fs.existsSync(appDir)) {
    // App Router structure
    return path.resolve(appDir, options.apiRoutePath, 'route.ts');
  }

  // Default to src/app/api/logger/route.ts
  return path.resolve(process.cwd(), 'src/app/api/logger/route.ts');
}

/**
 * Copy the API route template to the project
 */
function copyApiRoute(nextConfig: NextConfig, options: Required<LoggerPluginOptions>): void {
  if (!options.apiRoute) {
    return;
  }

  const templatePath = getApiRouteTemplatePath();
  const outputPath = getApiRouteOutputPath(nextConfig, options);

  if (!fs.existsSync(templatePath)) {
    console.warn('[Logger Plugin] API route template not found, skipping API route setup');
    return;
  }

  // Create the output directory if it doesn't exist
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read the template
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace the LOG_DIR default with the configured value
  template = template.replace(
    /const logDir = process\.env\['LOG_DIR'\] \|\| '\.\/_logs';/,
    `const logDir = process.env['LOG_DIR'] || '${options.logDir}';`
  );

  // Write the API route
  fs.writeFileSync(outputPath, template);

  console.log(`[Logger Plugin] Created API route at: ${outputPath}`);
}

/**
 * Generate public environment variables for client-side configuration
 */
function getClientEnv(options: Required<LoggerPluginOptions>): Record<string, string> {
  return {
    LOGGER_BATCH_MODE: options.batchingMode,
    LOGGER_BATCH_TIME_MS: String(options.batchingTimeMs),
    LOGGER_BATCH_COUNT: String(options.batchingCount),
    LOGGER_RETRY_ENABLED: String(options.retryEnabled),
    LOGGER_RETRY_MAX_RETRIES: String(options.retryMaxRetries),
    LOGGER_ENDPOINT: `/${options.apiRoutePath}`,
  };
}

/**
 * Create the Next.js plugin
 */
export function withLogger(userOptions: LoggerPluginOptions = {}) {
  return function plugin(nextConfig: NextConfig = {}): NextConfig {
    // Merge options with defaults
    const options: Required<LoggerPluginOptions> = {
      apiRoute: userOptions.apiRoute ?? DEFAULT_OPTIONS.apiRoute,
      apiRoutePath: userOptions.apiRoutePath ?? DEFAULT_OPTIONS.apiRoutePath,
      reactProvider: userOptions.reactProvider ?? DEFAULT_OPTIONS.reactProvider,
      logDir: userOptions.logDir ?? DEFAULT_OPTIONS.logDir,
      batchingMode: userOptions.batchingMode ?? DEFAULT_OPTIONS.batchingMode,
      batchingTimeMs: userOptions.batchingTimeMs ?? DEFAULT_OPTIONS.batchingTimeMs,
      batchingCount: userOptions.batchingCount ?? DEFAULT_OPTIONS.batchingCount,
      retryEnabled: userOptions.retryEnabled ?? DEFAULT_OPTIONS.retryEnabled,
      retryMaxRetries: userOptions.retryMaxRetries ?? DEFAULT_OPTIONS.retryMaxRetries,
    };

    // Copy the API route during build
    if (nextConfig.distDir) {
      // This runs during the build
      copyApiRoute(nextConfig, options);
    }

    // Return the modified config with public env vars
    return {
      ...nextConfig,
      env: {
        ...nextConfig.env,
        ...getClientEnv(options),
      },
    };
  };
}

/**
 * Get the default plugin options
 */
export function getDefaultOptions(): Required<LoggerPluginOptions> {
  return { ...DEFAULT_OPTIONS };
}

/**
 * Validate plugin options
 */
export function validateOptions(options: LoggerPluginOptions): string[] {
  const errors: string[] = [];

  if (options.batchingMode && !['time', 'count', 'immediate'].includes(options.batchingMode)) {
    errors.push('batchingMode must be "time", "count", or "immediate"');
  }

  if (options.batchingTimeMs !== undefined && options.batchingTimeMs < 100) {
    errors.push('batchingTimeMs must be at least 100ms');
  }

  if (options.batchingCount !== undefined && options.batchingCount < 1) {
    errors.push('batchingCount must be at least 1');
  }

  if (options.retryMaxRetries !== undefined && options.retryMaxRetries < 0) {
    errors.push('retryMaxRetries must be non-negative');
  }

  return errors;
}

// ============================================================================
// Type Definitions for next.config.js
// ============================================================================

/**
 * Extended Next.js config with logger plugin support
 */
interface NextConfigWithLogger extends NextConfig {
  /**
   * Logger plugin instance (for type checking in next.config.js)
   */
  logger?: {
    (options: LoggerPluginOptions): NextConfig;
  };
}

export type { NextConfigWithLogger, LoggerPluginOptions };
