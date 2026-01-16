/**
 * Client-side logger for Next.js
 * Uses @zaob/glean-logger's browser-safe exports
 */

import { logger } from '@zaob/glean-logger';

export const clientLog = logger({ name: 'nextjs-client' });
