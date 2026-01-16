/**
 * Basic Starter Example - Hello World with @zaob/glean-logger
 *
 * This example demonstrates:
 * - Basic logger setup
 * - Different log levels (debug, info, warn, error, fatal)
 * - Contextual logging with metadata
 * - Works in both browser and server environments
 */

import { logger, measure, performance } from '@zaob/glean-logger';

// Create a logger instance
const log = logger({
  name: 'basic-starter',
  level: 'debug', // Show all log levels
});

console.log('=== Basic Starter Example ===\n');

// Info level - General information
log.info('Application started', {
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  nodeVersion: process.version,
});

// Debug level - Detailed debugging information
log.debug('Initializing configuration', {
  config: {
    port: 3000,
    host: 'localhost',
    debugMode: true,
  },
  settings: {
    timeout: 5000,
    retries: 3,
  },
});

// Info with user action
log.info('User signed in', {
  userId: 12345,
  username: 'johndoe',
  timestamp: new Date().toISOString(),
});

// Warn level - Warning messages
log.warn('Cache miss for user data', {
  userId: 12345,
  cacheKey: 'user:12345',
  fallback: 'database',
});

// Error level - Error messages
log.error('Failed to connect to database', {
  host: 'localhost',
  port: 5432,
  error: 'Connection refused',
  retryCount: 3,
});

// Fatal level - Critical errors
log.fatal('Application cannot start', {
  reason: 'Missing required configuration',
  missingKeys: ['API_KEY', 'DB_URL'],
});

// Complex object logging
log.info('Processing order', {
  orderId: 'ORD-2024-001',
  customer: {
    id: 12345,
    name: 'John Doe',
    email: 'john@example.com',
  },
  items: [
    { productId: 1, name: 'Widget', quantity: 2, price: 19.99 },
    { productId: 2, name: 'Gadget', quantity: 1, price: 49.99 },
  ],
  total: 89.97,
  status: 'processing',
});

console.log('\n=== Check the logs in: _logs/ directory ===\n');

// Log application shutdown
log.info('Application shutting down', {
  uptime: process.uptime(),
  memory: process.memoryUsage(),
});

// Async operation with timing
async function simulateAsyncTask() {
  await new Promise(resolve => setTimeout(resolve, 500));
  return { data: 'Task completed', itemsProcessed: 10 };
}

console.log('\n--- Performance Timing ---\n');

const { result, duration } = await measure('async-task', simulateAsyncTask);
log.info('Task completed', { result, duration: `${duration.toFixed(2)}ms` });

// Performance utilities
console.log('\n--- Performance Utilities ---\n');

// Using Stopwatch for timing operations
const stopwatch = new performance.Stopwatch();
// Simulate some work
for (let i = 0; i < 3; i++) {
  log.debug(`Processing item ${i + 1}`);
}
const batchDuration = stopwatch.elapsed();
log.info('Batch operations completed', { duration: `${batchDuration.toFixed(2)}ms` });

// Error handling
console.log('\n--- Error Handling ---\n');

try {
  throw new Error('Something went wrong!');
} catch (error) {
  log.error('Caught an error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

console.log('\n=== Example Complete ===');
