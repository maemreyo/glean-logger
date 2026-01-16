/**
 * Express API Example with Full HTTP Logging
 *
 * This example demonstrates:
 * - ApiLoggerBuilder for configuring HTTP body logging
 * - Request/response middleware with body logging
 * - Child loggers for different modules
 * - createLoggedFetch for external API calls with automatic redaction
 * - Performance tracking
 * - Security redaction for sensitive data
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import {
  logger,
  child,
  measure,
  ApiLoggerBuilder,
  createLoggedFetch,
  createApiLogger,
} from '@zaob/glean-logger';

// ============================================================================
// API Logger Builder Configuration
// ============================================================================

/**
 * Configure body logging for HTTP requests/responses.
 * This demonstrates the ApiLoggerBuilder pattern for production-ready
 * HTTP logging with security, performance, and content filtering.
 */
const bodyLoggingConfig = new ApiLoggerBuilder()
  // Enable/disable body logging (default: true)
  .enabled(true)

  // Maximum body size to log (default: 10KB)
  // Supports: number (bytes) or string ("10kb", "1mb")
  .maxSize('10kb')

  // Read timeout for body parsing (default: 5s)
  // Supports: number (ms) or string ("5s", "5000ms")
  .readTimeout('5s')

  // Content-Type filtering - exclude binary types from logging
  .excludeContentTypes(
    'image/*', // Don't log images
    'video/*', // Don't log videos
    'application/pdf', // Don't log PDFs
    'application/zip', // Don't log archives
    'font/*', // Don't log fonts
    'multipart/form-data' // Don't log form uploads
  )

  // Custom redaction patterns for sensitive data
  .addRedactionPattern(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '[REDACTED-SSN]', [
    'ssn',
    'socialsecuritynumber',
    'taxid',
  ])
  .addRedactionPattern(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED-CARD]', [
    'creditcard',
    'cardnumber',
    'ccnumber',
  ])

  // Fields to redact from JSON bodies
  .addSensitiveFields(
    'password',
    'token',
    'secret',
    'apikey',
    'accesstoken',
    'refreshtoken',
    'privatekey',
    'ssn',
    'creditcard',
    'cvv',
    'cvc'
  )

  // Headers to redact from request/response
  .addSensitiveHeaders(
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'x-forwarded-for'
  )

  // Status codes to skip body logging
  .skipStatusCodes(204, 304)

  // Verbose logging for debugging (default: false)
  .verbose(process.env.NODE_ENV === 'development')

  // Maximum JSON nesting depth for redaction (default: 10)
  .maxDepth(10)

  // Build the final configuration
  .build();

// Create main logger
const log = logger({ name: 'express-api' });

// Create child logger with service context
const apiLog = child({
  service: 'express-api',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

// Create loggedFetch for external API calls with body logging config
const loggedFetch = createLoggedFetch({
  enabled: true,
  logger: createApiLogger({ name: 'fetch-logger' }),
  bodyLoggingConfig,
});

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies (up to 10MB)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// HTTP Request Logging Middleware
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  if (apiLog) {
    apiLog.info('HTTP Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      contentType: req.get('content-type'),
      ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });
  }

  // Capture response body
  const originalSend = res.send;
  let responseBody: unknown;

  res.send = function (body: unknown): Response {
    if (typeof body === 'string') {
      try {
        responseBody = JSON.parse(body);
      } catch {
        responseBody = body;
      }
    } else {
      responseBody = body;
    }
    return originalSend.call(this, body);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Only log response body for non-binary content types
    const contentType = res.get('content-type')?.toLowerCase() ?? '';
    const shouldLogBody = !bodyLoggingConfig.contentTypeFilter.exclude?.some(pattern =>
      contentType.includes(pattern.replace('*', ''))
    );

    if (apiLog) {
      apiLog.info('HTTP Response', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentType: res.get('content-type'),
        ...(shouldLogBody && responseBody !== undefined && { responseBody }),
      });
    }
  });

  next();
});

// ============================================================================
// API Routes
// ============================================================================

app.get('/', (_req: Request, res: Response) => {
  log.info('Root endpoint accessed');
  res.json({
    message: 'Express API with Glean Logger',
    version: '1.0.0',
    features: [
      'ApiLoggerBuilder configuration',
      'Request/response body logging',
      'Automatic sensitive data redaction',
      'Content-Type filtering',
      'Performance tracking',
    ],
    endpoints: ['/users', '/users/:id', '/products', '/health', '/external/:endpoint'],
  });
});

app.get('/users/:id', (req: Request, res: Response) => {
  const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (apiLog) {
    apiLog.info('Fetching user', { userId });
  }

  // Simulate database lookup
  const user = {
    id: parseInt(userId, 10),
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123',
    token: 'jwt-token-here',
    creditCard: '4111-1111-1111-1111',
  };

  res.json(user);
});

app.post('/users', async (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (apiLog) {
    apiLog.info('Creating user', { email, nameHasValue: !!name });
  }

  // Measure async operation
  const { result, duration } = await measure('create-user', async () => {
    // Simulate database insertion
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      id: Date.now(),
      name,
      email,
      createdAt: new Date().toISOString(),
    };
  });

  if (apiLog) {
    apiLog.info('User created', { userId: result.id, duration: `${duration}ms` });
  }
  res.status(201).json(result);
});

app.get('/products', async (_req: Request, res: Response) => {
  if (apiLog) {
    apiLog.info('Fetching products');
  }

  // Simulate database query
  const { result, duration } = await measure('fetch-products', async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return [
      { id: 1, name: 'Widget', price: 19.99, category: 'tools' },
      { id: 2, name: 'Gadget', price: 49.99, category: 'electronics' },
      { id: 3, name: 'Gizmo', price: 9.99, category: 'tools' },
      { id: 4, name: 'Premium Plan', price: 99.99, category: 'subscription' },
    ];
  });

  if (apiLog) {
    apiLog.info('Products fetched', { count: result.length, duration: `${duration}ms` });
  }
  res.json({ products: result, count: result.length });
});

// ============================================================================
// External API Integration Example
// ============================================================================

app.get('/external/:endpoint', async (req: Request, res: Response) => {
  const endpoint = req.params.endpoint;
  const targetUrl = `https://jsonplaceholder.typicode.com/${endpoint}`;

  if (apiLog) {
    apiLog.info('Calling external API', { url: targetUrl });
  }

  try {
    // loggedFetch automatically logs request/response with configured redaction
    const response = await loggedFetch(targetUrl);
    const data = await response.json();

    if (apiLog) {
      apiLog.info('External API response', {
        url: targetUrl,
        status: response.status,
        dataSample: JSON.stringify(data).slice(0, 100),
      });
    }

    res.json({ source: 'external', data });
  } catch (error) {
    if (apiLog) {
      apiLog.error('External API error', {
        url: targetUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    res.status(502).json({ error: 'Failed to fetch from external API' });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', async (_req: Request, res: Response) => {
  const { result: memoryUsage } = await measure('memory-check', async () => {
    const used = process.memoryUsage();
    return {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      unit: 'MB',
    };
  });

  log.info('Health check requested');

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.round(process.uptime())}s`,
    memory: memoryUsage,
    environment: process.env.NODE_ENV || 'development',
    loggingConfig: {
      enabled: bodyLoggingConfig.enabled,
      maxSize: bodyLoggingConfig.maxSize,
      readTimeout: bodyLoggingConfig.readTimeout,
      verbose: bodyLoggingConfig.verbose,
    },
  });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  log.warn('Route not found', { method: req.method, path: req.path });
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================================================
// Server Startup
// ============================================================================

async function startServer() {
  log.info('Starting Express API server...');

  const { duration } = await measure('server-start', async () => {
    return new Promise<void>(resolve => {
      app.listen(PORT, () => {
        resolve();
      });
    });
  });

  log.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    startupDuration: `${duration}ms`,
  });

  console.log('');
  console.log('🚀 Express API Server Running');
  console.log(`   Local: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('   GET  /                         - API info');
  console.log('   GET  /users/:id                - Get user (try with id=1)');
  console.log('   POST /users                    - Create user');
  console.log('   GET  /products                 - List products');
  console.log('   GET  /health                   - Health check');
  console.log('   GET  /external/:endpoint       - External API (try /users/1)');
  console.log('');
  console.log('🔒 Logging Features Active:');
  console.log('   • Body logging: enabled');
  console.log(`   • Max body size: ${bodyLoggingConfig.maxSize} bytes`);
  console.log(`   • Read timeout: ${bodyLoggingConfig.readTimeout}ms`);
  console.log('   • Sensitive field redaction: active');
  console.log('   • Binary content filtering: active');
  console.log('');
}

startServer().catch(error => {
  log.error('Failed to start server', { error: error.message });
  process.exit(1);
});

export { app, bodyLoggingConfig, loggedFetch };
