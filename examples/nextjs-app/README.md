# Next.js App Example

A Next.js 15 application demonstrating logging patterns with `@zaob/glean-logger`.

## Architecture

This example demonstrates the **dual-layer logging pattern** for Next.js:

- **Client-side**: Lightweight console logger (browser-safe)
- **Server-side**: Full `@zaob/glean-logger` with `measure()` for performance tracking

```
src/
├── app/
│   ├── page.tsx           # Client component with browser logging
│   └── api/
│       └── hello/
│           └── route.ts   # API route with server logging + measure()
└── lib/
    └── logger-client.ts   # Lightweight client logger
```

## Usage

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build (use --webpack flag)
npm run build
npm start
```

## Client-Side Logging

Use a lightweight logger for browser components:

```typescript
// src/lib/logger-client.ts
export const clientLog = {
  info: (msg: string, meta?: Record<string, unknown>) => console.log(`[INFO] ${msg}`, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(`[DEBUG] ${msg}`, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[WARN] ${msg}`, meta),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[ERROR] ${msg}`, meta),
};
```

```typescript
// src/app/page.tsx
'use client';
import { clientLog } from '@/lib/logger-client';

export default function HomePage() {
  clientLog.info('Home page mounted', { userAgent: navigator.userAgent });

  const handleClick = () => {
    clientLog.info('Button clicked', { buttonId: 'demo-button' });
  };

  return <button onClick={handleClick}>Log Event</button>;
}
```

## Server-Side Logging (API Routes)

Use `@zaob/glean-logger` in API routes for full server logging:

```typescript
// src/app/api/hello/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { measure } from '@zaob/glean-logger';

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[API] INFO: ${msg}`, meta ? JSON.stringify(meta) : ''),
};

export async function GET(request: NextRequest) {
  log.info('Request received', { path: '/api/hello' });

  const { result, duration } = await measure('hello-api', async () => {
    // Your async logic here
    await new Promise(r => setTimeout(r, 100));
    return { message: 'Hello!', timestamp: Date.now() };
  });

  log.info('Response sent', { duration: `${duration.toFixed(2)}ms` });

  return NextResponse.json(result);
}
```

## Performance Tracking

Use `measure()` for async operation timing:

```typescript
import { measure } from '@zaob/glean-logger';

const { result, duration } = await measure('fetch-data', async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
});

console.log(`Fetch completed in ${duration}ms`);
```

## View Logs

| Environment | Where to View                     |
| ----------- | --------------------------------- |
| **Browser** | DevTools → Console                |
| **Server**  | Terminal where `npm run dev` runs |

## Why Dual-Layer Logging?

`@zaob/glean-logger` bundles both browser-safe code and Winston server code. For Next.js:

1. **Client components**: Cannot use Winston (requires Node.js `fs` module)
2. **API routes**: Can use full package including `child()` and Winston

### Server-Side Logging with Winston (Production)

For full Winston integration with file rotation in production:

```typescript
// next.config.ts
module.exports = {
  serverExternalPackages: ['winston', 'winston-daily-rotate-file'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...config.externals,
        { winston: 'winston' },
        { 'winston-daily-rotate-file': 'winston-daily-rotate-file' },
      ];
    }
    return config;
  },
};
```

Then in API routes:

```typescript
import { child } from '@zaob/glean-logger';

const apiLog = child({
  service: 'nextjs-api',
  environment: process.env.NODE_ENV,
});

apiLog.info('Request received', { path: '/api/users' });
```

## See Also

- [Full Documentation](../../README.md)
- [Express API Example](../express-api/) - Full Winston example
- [Performance Demo](../performance-demo/) - Timing patterns
- [Next.js Documentation](https://nextjs.org/docs)
