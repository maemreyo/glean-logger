/**
 * Performance Demo - Advanced Performance Tracking
 *
 * This example demonstrates:
 * - measure() for async operations
 * - performance.start()/.end() for manual timing
 * - performance.time() for sync functions
 * - Nested performance tracking
 */

import { logger, measure, performance } from '@zaob/glean-logger';

const log = logger({ name: 'performance-demo', level: 'info' });

console.log('=== Performance Tracking Demo ===\n');

// Mock database queries
const simulateDatabaseQuery = async (queryName: string, delay: number) => {
  await new Promise(resolve => setTimeout(resolve, delay));
  return { query: queryName, rows: Math.floor(Math.random() * 100) };
};

// 1. Basic async measurement
async function demonstrateBasicMeasurement() {
  console.log('\n--- 1. Basic Async Measurement ---');

  const { result, duration } = await measure('fetch-data', async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { data: 'example', count: 100 };
  });

  log.info('Operation completed', {
    operation: 'fetch-data',
    duration: `${duration.toFixed(2)}ms`,
    result: result.data,
  });

  console.log(`Result: ${JSON.stringify(result)}`);
  console.log(`Duration: ${duration.toFixed(2)}ms\n`);
}

// 2. Manual timing with start/end
function demonstrateManualTiming() {
  console.log('--- 2. Manual Timing (start/end) ---');

  const end = performance.start('manual-operation');

  // Do some work
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }

  const duration = end();

  log.info('Manual operation completed', {
    operation: 'manual-operation',
    duration: `${duration.toFixed(2)}ms`,
    result: sum,
  });

  console.log(`Sum: ${sum}`);
  console.log(`Duration: ${duration.toFixed(2)}ms\n`);
}

// 3. Sync function timing
function demonstrateSyncTiming() {
  console.log('--- 3. Sync Function Timing ---');

  const expensiveOperation = (n: number) => {
    let result = 0;
    for (let i = 0; i < n; i++) {
      result += Math.sqrt(i);
    }
    return result;
  };

  const result = performance.time('expensive-calc', () => expensiveOperation(1000000));

  log.info('Sync operation completed', {
    operation: 'expensive-calc',
    result: Math.round(result),
  });

  console.log(`Result: ${Math.round(result)}\n`);
}

// 4. Database query benchmarks
async function demonstrateDatabaseBenchmarks() {
  console.log('\n--- 4. Database Query Benchmarks ---');

  const allUsers = await measure('db-select-all', async () => {
    return simulateDatabaseQuery('SELECT * FROM users', 100);
  });

  log.info('SELECT all users', { count: allUsers.result.rows });
  console.log(
    `  SELECT * FROM users: ${allUsers.result.rows} rows (${allUsers.duration.toFixed(2)}ms)\n`
  );

  const filteredUsers = await measure('db-filter', async () => {
    return simulateDatabaseQuery('SELECT * FROM users WHERE active=1', 50);
  });

  log.info('Filter users', { count: filteredUsers.result.rows });
  console.log(
    `  Filter active users: ${filteredUsers.result.rows} rows (${filteredUsers.duration.toFixed(2)}ms)\n`
  );
}

// 5. Concurrent operations
async function demonstrateConcurrentOperations() {
  console.log('--- 5. Concurrent Operations ---');

  const tasks = Array.from({ length: 3 }, (_, i) =>
    measure(`task-${i}`, () => simulateDatabaseQuery(`task-${i}`, 100 + Math.random() * 200))
  );

  const results = await Promise.all(tasks);
  results.forEach(({ result, duration }) => {
    log.info('Task completed', { task: result.query, duration: `${duration.toFixed(2)}ms` });
  });

  console.log('All concurrent tasks completed\n');
}

// 6. Performance comparison
async function demonstratePerformanceComparison() {
  console.log('--- 6. Performance Comparison ---');

  const slowOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return 'slow-result';
  };

  const fastOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'fast-result';
  };

  const [{ duration: slowDuration }, { duration: fastDuration }] = await Promise.all([
    measure('slow-op', slowOperation),
    measure('fast-op', fastOperation),
  ]);

  const speedup = (((slowDuration - fastDuration) / slowDuration) * 100).toFixed(1);
  log.info('Performance comparison', {
    slowDuration: `${slowDuration.toFixed(2)}ms`,
    fastDuration: `${fastDuration.toFixed(2)}ms`,
    improvement: `${speedup}%`,
  });

  console.log(`Slow: ${slowDuration.toFixed(2)}ms, Fast: ${fastDuration.toFixed(2)}ms`);
  console.log(`Speedup: ${speedup}%\n`);
}

// 7. Error handling with timing
async function demonstrateErrorHandling() {
  console.log('\n--- 7. Error Handling ---');

  const failingOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('Simulated error');
  };

  try {
    await measure('failing-op', failingOperation);
  } catch (error) {
    log.error('Operation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.log('Error caught and logged successfully\n');
  }
}

// Main function
async function main() {
  await demonstrateBasicMeasurement();
  demonstrateManualTiming();
  demonstrateSyncTiming();
  await demonstrateDatabaseBenchmarks();
  await demonstrateConcurrentOperations();
  await demonstratePerformanceComparison();
  await demonstrateErrorHandling();

  console.log('=== Performance Demo Complete ===');
}

main().catch(error => {
  log.fatal('Demo failed', { error: error.message });
  process.exit(1);
});
