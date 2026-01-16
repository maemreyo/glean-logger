# Next.js Logging Demo

A comprehensive Next.js 16+ logging example demonstrating production-ready logging patterns with `@zaob/glean-logger`, openapi-fetch, and React Query.

## Features

This example implements a complete logging solution for Next.js applications:

### 1. Browser Exception Tracking

- **Global error handlers**: `window.onerror` and `window.onunhandledrejection`
- **React Error Boundary**: Catches component-level errors
- **API submission**: Batched logs sent to server via `/api/logs`

### 2. API Request/Response Logging

- **openapi-fetch middleware**: Automatic request/response interception
- **Request timing**: Measures request duration
- **Body logging**: Captures request and response bodies (sanitized)

### 3. React Query Integration

- **Custom QueryClient**: Global error/success handlers
- **QueryCache observer**: Monitors all queries
- **Mutation logging**: Tracks mutations and their results

### 4. Server-Side Logging with @zaob/glean-logger

- **Auto-detection**: Automatically uses Winston in Node.js environment
- **Daily rotation**: Logs rotate automatically via `winston-daily-rotate-file`
- **Multiple log files**: combined, api, error logs
- **Console output**: Colored formatting in development
- **Performance tracking**: Uses `measure()` for async operation timing

### 5. Environment-Based Configuration

- **`.env.local` control**: Enable/disable features
- **Development-only**: Only works in development mode
- **Feature flags**: Granular control per feature

### 6. Git-Ignored Log Storage

- **`_logs/` directory**: All logs persisted here
- **Automatic rotation**: Daily file rotation with 14-day retention
- **Never committed**: Added to .gitignore

## Architecture

This demo showcases the `@zaob/glean-logger` package:

```
@zaob/glean-logger/
├── Browser (auto-detected)
│   ├── Console output with colors
│   └── localStorage persistence
│
└── Server (auto-detected)
    ├── Winston with daily rotation
    ├── Console + file transports
    ├── Performance timing (measure())
    └── Child loggers with context
```

### Browser→Server Log Flow

```
Browser Events → browserLogger (batch + glean-logger) → /api/logs → serverLogger (glean-logger Winston) → _logs/
```

## Quick Start

### 1. Install Dependencies

```bash
cd examples/nextjs-logging-demo
npm install
```

### 2. Enable Logging

```bash
# Copy example config
cp .env.example .env.local

# Edit .env.local (optional - defaults work)
```

### 3. Run the Demo

```bash
npm run dev
```

Visit http://localhost:3000 to see the demo.

## Configuration

### `.env.local` Options

```env
# Master switch - must be true to enable logging
DEBUG_MODE=true

# Browser logging (requires DEBUG_MODE=true)
DEBUG_BROWSER_EXCEPTIONS=true    # Catch console errors
DEBUG_BROWSER_REQUESTS=true      # Log API calls
DEBUG_BROWSER_QUERIES=true       # Log React Query

# Server logging (requires DEBUG_MODE=true)
DEBUG_SERVER_LOGS=true           # Server events
DEBUG_SERVER_API=true            # API route logs

# @zaob/glean-logger Configuration
LOG_LEVEL=debug                  # debug, info, warn, error
LOG_DIR=./_logs                  # Log directory
LOG_MAX_SIZE=20m                 # Max file size per log
LOG_MAX_FILES=14d                # Days to retain logs

# Batch settings for browser log submission
LOG_BATCH_SIZE=10                # Logs per batch
LOG_BATCH_INTERVAL=5000          # Batch interval in ms
```

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js Application                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │  Client Components  │  │  React Query        │  │  API Routes     │  │
│  │                     │  │                     │  │                 │  │
│  │  - Error Boundary   │  │  - QueryClient      │  │  - /api/logs    │  │
│  │  - Global Handlers  │  │  - QueryCache       │  │  - /api/demo    │  │
│  │  - Manual Logging   │  │  - onError hooks    │  │                 │  │
│  └─────────┬───────────┘  └─────────┬───────────┘  └────────┬────────┘  │
│            │                        │                       │            │
│            └────────────────────────┼───────────────────────┘            │
│                                     │                                  │
│                            ┌────────▼────────┐                         │
│                            │  BrowserLogger │                         │
│                            │                │                         │
│                            │  - Batch logs  │                         │
│                            │  - Send to API │                         │
│                            └───────┬────────┘                         │
│                                    │                                  │
│                                    ▼                                  │
│                          ┌─────────────────┐                          │
│                          │  /api/logs      │                          │
│                          │                 │                          │
│                          │  - Receive logs │                          │
│                          │  - Forward to   │                          │
│                          │    Winston      │                          │
│                          └────────┬────────┘                          │
│                                   │                                   │
│                                   ▼                                   │
│                          ┌─────────────────┐                          │
│                          │  ServerLogger   │                          │
│                          │                 │                          │
│                          │  - Winston      │                          │
│                          │  - Daily rotate │                          │
│                          │  - _logs/ dir   │                          │
│                          └─────────────────┘                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
nextjs-logging-demo/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── logs/route.ts    # Receives browser logs
│   │   │   └── demo/route.ts    # Demo API with logging
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main demo page
│   │   └── providers.tsx       # React Query provider
│   ├── components/
│   │   ├── DemoComponents.tsx  # React Query examples
│   │   └── ErrorBoundary.tsx   # React Error Boundary
│   └── lib/
│       ├── api-client.ts       # openapi-fetch with middleware
│       ├── browser-logger.ts   # Browser logging utilities
│       ├── config.ts           # Environment configuration
│       ├── query-client.ts     # React Query with logging
│       └── server-logger.ts    # Winston server logger
├── _logs/                       # Log files (git-ignored)
├── .env.example                # Configuration template
├── .gitignore                  # Ignores _logs/
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Usage Examples

### Basic Browser Logging

```typescript
import { browserLogger } from '@/lib/browser-logger';

browserLogger.info('User performed action', { userId: 123 });
browserLogger.error('Something went wrong', { error: 'timeout' });
```

### React Query with Logging

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

// Errors are automatically logged
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

### API Request Logging

```typescript
import { apiClient } from '@/lib/api-client';

// Requests/responses are automatically logged
const response = await apiClient.GET('/api/users');
```

### Error Boundary

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary fallback={<ErrorPage />}>
  <MyComponent />
</ErrorBoundary>
```

## Viewing Logs

### Browser Console

Open DevTools (F12) → Console to see:

- Client-side logs
- ErrorBoundary catches
- React Query events

### Server Terminal

Check where `npm run dev` is running for:

- API request/response logs
- Server events
- Winston console output

### Log Files

Check `_logs/` directory for:

- `combined.YYYY-MM-DD.log` - All logs
- `api.YYYY-MM-DD.log` - API request/response
- `error.YYYY-MM-DD.log` - Errors only

## How to Enable/Disable Features

### Master Switch

```env
DEBUG_MODE=true    # Enable all logging (development only)
DEBUG_MODE=false   # Disable all logging
```

### Feature Flags

```env
DEBUG_BROWSER_EXCEPTIONS=true   # Browser error tracking
DEBUG_BROWSER_REQUESTS=true     # API call logging
DEBUG_BROWSER_QUERIES=true      # React Query logging
DEBUG_SERVER_LOGS=true         # Server events
DEBUG_SERVER_API=true          # API route logs
```

### Per-Environment

```env
# .env.local (local development)
DEBUG_MODE=true

# .env.production (production)
DEBUG_MODE=false
```

## Key Design Decisions

### Why Use @zaob/glean-logger?

- **Single package**: Browser + server logging from one import
- **Auto-detection**: No need to manually choose browser vs server imports
- **Winston integration**: Production-ready file rotation and formatting
- **Performance utilities**: Built-in `measure()` for async timing

### Why Batch Browser Logs?

- **Performance**: Fewer network requests
- **Reliability**: Survives network issues
- **Configurable**: Adjust batch size/interval

### How @zaob/glean-logger is Used

#### Server-Side

```typescript
import { logger, measure, child } from '@zaob/glean-logger';

const log = logger({ name: 'api' });
const apiLog = child({ module: 'api' });

// Performance tracking
const { result, duration } = await measure('operation', async () => {
  return await someAsyncOperation();
});
```

#### Browser-Side (with batching)

```typescript
import { logger } from '@zaob/glean-logger';
import { browserLogger } from '@/lib/browser-logger';

// Use glean-logger for console + localStorage
const log = logger({ name: 'browser' });
log.info('User action', { userId: 123 });

// Use browserLogger for batched server submission
browserLogger.info('Event logged', { type: 'analytics' });
```

### Why Error Boundary + Global Handlers?

- **Coverage**: Catches both component and non-component errors
- **Recovery**: Error Boundary allows UI recovery
- **Context**: Global handlers catch everything else

### Why openapi-fetch Middleware?

- **Non-invasive**: No code changes needed
- **Centralized**: One place for all request logging
- **Extensible**: Easy to add more interceptors

### Why React Query Callbacks?

- **Query-level**: Fine-grained control per query
- **Cache-level**: Catch all queries
- **Mutation-level**: Track mutations

## @zaob/glean-logger Usage Patterns

### Basic Logging

```typescript
import { logger } from '@zaob/glean-logger';

const log = logger({ name: 'my-module' });
log.info('Hello from glean-logger!', { userId: 123 });
log.error('Something failed', { error: 'timeout' });
```

### Performance Timing

```typescript
import { measure } from '@zaob/glean-logger';

const { result, duration } = await measure('fetch-users', async () => {
  return await fetch('/api/users').then(r => r.json());
});

console.log(`Fetch completed in ${duration}ms`);
```

### Child Loggers (Server Only)

```typescript
import { child } from '@zaob/glean-logger';

const apiLog = child({ module: 'api', version: '1.0' });
apiLog.info('Request received', { path: '/users' });
// Logs with module, version context automatically attached
```

### Logged Fetch (Server Only)

```typescript
import { loggedFetch } from '@zaob/glean-logger';

const fetch = loggedFetch();
const response = await fetch('/api/users');
// Automatically logs: request, response, duration, status
```

## Requirements

- Node.js 18+
- Next.js 16+
- React 19+
- @tanstack/react-query 5+
- openapi-fetch 0.13+
- @zaob/glean-logger 1.0+

## Refactoring to @zaob/glean-logger

This demo was refactored to use `@zaob/glean-logger` instead of custom logging implementations:

### What Changed

| File                | Change                                                                |
| ------------------- | --------------------------------------------------------------------- |
| `server-logger.ts`  | Replaced custom Winston setup with `logger()` from glean-logger       |
| `browser-logger.ts` | Integrated glean-logger for console/localStorage, kept batching layer |
| `query-client.ts`   | Uses glean-logger instead of custom logging                           |
| `api/logs/route.ts` | Uses `measure()` for performance tracking                             |
| `api/demo/route.ts` | Uses `measure()` for performance tracking                             |

### What Stayed the Same

| File                | Reason                                            |
| ------------------- | ------------------------------------------------- |
| `api-client.ts`     | openapi-fetch middleware pattern works well       |
| `ErrorBoundary.tsx` | Already uses browserLogger correctly              |
| `config.ts`         | Feature flags needed for browser batching control |

### Benefits

1. **Less custom code**: Winston configuration is handled by the package
2. **Better performance tracking**: Built-in `measure()` utility
3. **Future-proof**: Package updates benefit the demo automatically
4. **Consistent API**: Same import works in browser and server

## See Also

- [@zaob/glean-logger](../README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query)
- [openapi-fetch Documentation](https://openapi-ts.dev)
