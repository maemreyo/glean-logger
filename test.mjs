import { logger, child, measure } from './dist/index.mjs';

const log = logger({ name: 'test-app' });

log.info('Hello from glean-logger!', { userId: 123, email: 'test@example.com' });
log.warn('This is a warning message');
log.error('This is an error message');

const apiLog = child({ module: 'api', version: '1.0' });
apiLog.info('Child logger with context');

const { result, duration } = await measure('async-operation', async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return 'Operation completed';
});

console.log(`Result: ${result}, Duration: ${duration}ms`);
