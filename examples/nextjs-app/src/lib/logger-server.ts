import { child } from '@zaob/glean-logger';

export const apiLog = child({
  service: 'nextjs-api',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

export const serverLog = child({
  service: 'nextjs-app',
  environment: process.env.NODE_ENV || 'development',
});
