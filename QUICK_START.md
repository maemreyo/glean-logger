# Glean Logger - Quick Start Guide

A production-ready logging module for Node.js/TypeScript with automatic environment detection, browser-safe logging, and Winston server logging with daily file rotation.

---

## 🚀 Quick Installation

```bash
npm install @zaob/glean-logger
```

---

## 💻 Local Development Only (Next.js)

Use glean-logger for debugging in development with zero production overhead. Perfect for serverless and Cloudflare Workers deployments where file logging isn't possible.

### Why Use Glean Logger Only for Local Development?

- **Debug during development**: Get detailed logs with file rotation and colored console output
- **Zero overhead in production**: Completely disabled logging with no performance impact
- **Safe for serverless**: Works perfectly with Vercel, Netlify, Cloudflare Workers, and other serverless platforms
- **No filesystem writes in production**: Ideal for environments without persistent disk access

### Quick Setup for Local-Only Logging

Copy this configuration for Next.js local development with automatic production disabling:

```typescript
// src/lib/logger.ts
import { logger, isDevelopment, isProduction } from '@zaob/glean-logger';

// Only enable logging in development
const log = logger({
  name: 'my-app',
  enabled: isDevelopment(), // false in production
});

export { log, isDevelopment, isProduction };
```

```typescript
// src/app/api/example/route.ts
import { NextResponse } from 'next/server';
import { measure } from '@zaob/glean-logger';
import { log } from '@/lib/logger';

export async function GET() {
  // Performance tracking
  const { result, duration } = await measure('fetch-data', async () => {
    // Your async logic here
    return await fetchDataFromDB();
  });

  log.info('Data fetched', { count: result.length, duration: `${duration.toFixed(2)}ms` });

  return NextResponse.json(result);
}
```

```bash
# .env.local (development only - DO NOT commit)
NEXT_PUBLIC_LOG_ENABLED=true
NODE_ENV=development
```

```bash
# .env.production (Vercel/Netlify/Cloudflare)
NODE_ENV=production
NEXT_PUBLIC_LOG_ENABLED=false  # or omit this entirely
```

### Verify It's Working Locally

```bash
# Start development server
npm run dev

# You should see logs in terminal:
# 2024-01-16T10:30:00.000Z [info] Data fetched count=10 duration=123.45ms
```

```bash
# Check logs directory (local development only)
ls -la _logs/
# combined.2024-01-16.log
# api.2024-01-16.log
# error.2024-01-16.log
```

### Configuration Options

#### Option 1: Environment Variable Control

```typescript
// src/lib/logger.ts
const log = logger({
  name: 'my-app',
  enabled: process.env.NODE_ENV === 'development', // Only log in dev
});
```

**Environment variables:**

```env
# Development (.env.local)
NODE_ENV=development
NEXT_PUBLIC_LOG_ENABLED=true

# Production (.env.production)
NODE_ENV=production
NEXT_PUBLIC_LOG_ENABLED=false
```

#### Option 2: Runtime Check

```typescript
// src/lib/logger.ts
import { isDevelopment } from '@zaob/glean-logger';

const log = logger({
  name: 'my-app',
  enabled: isDevelopment(), // Returns true only in dev
});
```

#### Option 3: Conditional Import

```typescript
// src/app/api/route.ts
const log =
  process.env.NODE_ENV === 'development'
    ? (await import('@zaob/glean-logger')).then(m => m.logger({ name: 'api' }))
    : null;

// Use with guard
if (log) {
  log.info('This only logs in development');
}
```

#### Option 4: Complete Disable

```typescript
// src/lib/logger.ts
// Completely disable logging everywhere
const log = logger({
  name: 'my-app',
  enabled: false, // Never logs
});
```

### What Happens When Disabled?

When logging is disabled (`enabled: false` or `NODE_ENV=production`):

- **No console output**: All `log.info()`, `log.error()` calls become no-ops
- **No filesystem writes**: No files created in `_logs/` directory
- **No localStorage**: Browser doesn't store logs
- **Zero performance impact**: Logging functions return immediately without processing
- **No bundle size impact**: Tree-shaking removes Winston from production builds

```typescript
// Example: All of these are no-ops in production
log.info('User signed in'); // Nothing happens
log.error('API failed'); // Nothing happens
await measure('query', fn); // Returns result without timing
```

### Local Development Features

#### File Rotation for Logs

In development, logs automatically rotate daily:

```bash
_logs/
├── combined.2024-01-16.log    # All logs (debug+)
├── api.2024-01-16.log         # API logs (info+)
└── error.2024-01-16.log       # Errors only
```

**Configuration:**

```typescript
// Default rotation settings (configurable)
const log = logger({
  name: 'my-app',
  level: 'debug', // debug | info | warn | error
  // File rotation happens automatically
  // - Max file size: 10MB (configurable via LOG_MAX_SIZE)
  // - Retention: 14 days (configurable via LOG_MAX_FILES)
});
```

#### Console Output with Colors

Development console uses colored, readable format:

```typescript
// Development output
2024-01-16T10:30:00.000Z [info] User signed in userId=123 email=user@example.com
2024-01-16T10:30:01.000Z [error] API failed endpoint=/api/users error=timeout
```

#### Performance Tracking with `measure()`

Track async operation timing in development:

```typescript
import { measure } from '@zaob/glean-logger';

// Simple timing
const { result, duration } = await measure('fetch-users', async () => {
  return await db.users.findMany();
});

console.log(`Fetched ${result.length} users in ${duration}ms`);

// In API routes
export async function GET() {
  const { result, duration } = await measure('api-call', async () => {
    return await externalService.getData();
  });

  log.info('API call completed', {
    service: 'external-service',
    duration: `${duration.toFixed(2)}ms`,
    recordCount: result.length,
  });

  return NextResponse.json(result);
}
```

**Note**: In production, `measure()` still returns the result but skips timing logic for zero overhead.

#### Child Loggers for Context

Server-side only: Create loggers with persistent context:

```typescript
import { child } from '@zaob/glean-logger';

// Create child logger with context
const apiLog = child({
  module: 'api',
  version: '1.0',
  environment: 'development',
});

// All logs include this context automatically
apiLog.info('Request received', { endpoint: '/api/users' });
// Output: 2024-01-16T10:30:00.000Z [info] Request received module=api version=1.0 endpoint=/api/users

// Create nested child logger
const userApiLog = apiLog.child({ route: '/users' });
userApiLog.info('User fetched', { userId: 123 });
// Output: 2024-01-16T10:30:01.000Z [info] User fetched module=api version=1.0 route=/users userId=123
```

**Browser limitation**: Child loggers are server-only (require Winston). Use regular logger in client components.

### Production Safety

#### Confirm Logging is Disabled in Production

```typescript
// src/lib/logger.ts
import { isDevelopment, isProduction } from '@zaob/glean-logger';

if (isProduction()) {
  console.log('✅ Production mode - Logging is DISABLED');
}

const log = logger({
  name: 'my-app',
  enabled: isDevelopment(),
});

export { log };
```

```bash
# In production build
NODE_ENV=production npm run build

# Check bundle size (should be smaller without Winston)
ls -lh .next/static/chunks/

# Deploy to Vercel/Netlify
vercel --prod
```

#### No LocalStorage Accumulation

When disabled in production:

- **No `localStorage` writes**: Browser logger checks `isLoggingEnabled()` before writing
- **No quota issues**: 5MB localStorage limit never touched
- **No stale data**: No cleanup required for old log entries

```typescript
// Browser code - production safe
import { logger } from '@zaob/glean-logger';

const log = logger({
  name: 'my-app',
  enabled: isDevelopment(), // false in production
});

// In production, this is a no-op
log.info('Button clicked', { buttonId: 'submit' });
// Nothing written to localStorage, nothing logged to console
```

#### No Filesystem Writes

When disabled in production:

- **No `_logs/` directory created**: File transport is skipped
- **No disk I/O**: Zero filesystem operations
- **Safe for serverless**: Works on platforms without file system access

```typescript
// Server code - production safe
import { logger } from '@zaob/glean-logger';

const log = logger({
  name: 'api',
  enabled: process.env.NODE_ENV === 'development',
});

// In production, this is a no-op
log.info('API request', { path: '/api/users' });
// No files written, no disk operations
```

#### No Performance Impact

Benchmark results (disabled vs enabled):

```typescript
// Disabled logging (production)
log.info('test'); // ~0.001ms (no-op)
await measure('fn', fn); // ~0.001ms (no timing)

// Enabled logging (development)
log.info('test'); // ~0.1ms (console + file write)
await measure('fn', fn); // ~0.1ms (timing + logging)
```

### Troubleshooting

#### Verify Local Logging is Working

```bash
# 1. Check environment variables
echo $NODE_ENV  # Should be: development
echo $NEXT_PUBLIC_LOG_ENABLED  # Should be: true (or unset)

# 2. Run development server
npm run dev

# 3. Trigger a log
# Visit: http://localhost:3000
# You should see colored logs in terminal

# 4. Check log files
ls -la _logs/
cat _logs/combined.$(date +%Y-%m-%d).log
```

```typescript
// Test logging programmatically
import { log, isDevelopment } from '@/lib/logger';

console.log('Environment:', process.env.NODE_ENV);
console.log('isDevelopment():', isDevelopment());
console.log('Logging enabled:', log ? 'YES' : 'NO');

log.info('Test log', { timestamp: Date.now() });
// Should see this in terminal
```

#### Check Logs Are Not Appearing in Production

```bash
# 1. Verify production environment
cat .env.production
NODE_ENV=production
NEXT_PUBLIC_LOG_ENABLED=false

# 2. Build production bundle
npm run build

# 3. Check bundle size
ls -lh .next/static/chunks/
# Should NOT see winston in chunks

# 4. Test production server
npm run start
# Should NOT see any logs in terminal
```

```typescript
// Add runtime check
import { isLoggingEnabled } from '@zaob/glean-logger';

if (isLoggingEnabled()) {
  console.warn('⚠️  WARNING: Logging is enabled in production!');
}

// Log a test message
log.info('Test log');
// If you see this in production, logging is NOT disabled
```

#### Common Mistakes to Avoid

**Mistake 1: Committing `.env.local`**

```bash
# ❌ WRONG - Don't commit development env vars
git add .env.local
git commit -m "Add env vars"

# ✅ CORRECT - Use .env.example
cp .env.local .env.example
# Edit .env.example to remove sensitive values
git add .env.example
git commit -m "Add env example"
```

**Mistake 2: Using Child Loggers in Client Components**

```typescript
// ❌ WRONG - child() is server-only
// src/app/page.tsx
'use client';
import { child } from '@zaob/glean-logger';

const log = child({ module: 'client' }); // Returns null in browser
log.info('Test'); // Nothing happens, silent failure

// ✅ CORRECT - Use regular logger
('use client');
import { logger } from '@zaob/glean-logger';

const log = logger({ name: 'client' });
log.info('Test'); // Works correctly
```

**Mistake 3: Forgetting `enabled` Option**

```typescript
// ❌ WRONG - Always logs in production
const log = logger({ name: 'my-app' });
// Will log in production, creating _logs/ directory

// ✅ CORRECT - Explicitly disable in production
const log = logger({
  name: 'my-app',
  enabled: process.env.NODE_ENV === 'development',
});
```

**Mistake 4: Using `NEXT_PUBLIC_` in Server Code**

```typescript
// ❌ WRONG - Server can't access NEXT_PUBLIC_ vars directly
const enabled = process.env.NEXT_PUBLIC_LOG_ENABLED; // undefined on server

// ✅ CORRECT - Use NODE_ENV on server
const enabled = process.env.NODE_ENV === 'development';

// Or use helper
import { isDevelopment } from '@zaob/glean-logger';
const enabled = isDevelopment();
```

**Mistake 5: Not Tree-Shaking Winston**

```typescript
// ✅ GOOD - Tree-shaking removes Winston from client code
import { logger } from '@zaob/glean-logger';

// Browser build checks environment
if (typeof window !== 'undefined') {
  // Uses browser logger (no Winston)
  return createBrowserLogger(...);
}

// ✅ GOOD - Dynamic import for server-only code
import { loggedFetch } from '@zaob/glean-logger';
// loggedFetch returns no-op in browser
```

---

## 📦 Common Patterns (Copy & Paste)

### 1. Basic Logging (Works Everywhere)

```typescript
import { logger } from '@zaob/glean-logger';

const log = logger({ name: 'my-module' });

log.info('User signed in', { userId: 123, email: 'user@example.com' });
log.error('Failed to fetch data', { endpoint: '/api/users', error: 'timeout' });
log.debug('Processing item', { itemId: 456, progress: 50 });
```

### 2. Performance Tracking

```typescript
import { measure } from '@zaob/glean-logger';

const { result, duration } = await measure('fetch-users', async () => {
  return await database.query('SELECT * FROM users');
});
console.log(`Query completed in ${duration}ms`);
```

### 3. HTTP Request/Response Logging (Server)

```typescript
import { createLoggedFetch } from '@zaob/glean-logger';

// Simple - just works
const fetch = createLoggedFetch();
const response = await fetch('/api/users');

// With custom configuration
import { ApiLoggerBuilder } from '@zaob/glean-logger';

const loggedFetch = createLoggedFetch({
  bodyLoggingConfig: new ApiLoggerBuilder()
    .production() // or .basic(), .development(), .minimal()
    .build(),
});

const response = await loggedFetch('/api/data');
```

### 4. Express.js Integration

```typescript
import express from 'express';
import { createLoggedFetch, ApiLoggerBuilder, createApiLogger } from '@zaob/glean-logger';

const app = express();
const PORT = process.env.PORT || 3000;

// Configure HTTP logging
const bodyConfig = new ApiLoggerBuilder().production().build();

const loggedFetch = createLoggedFetch({
  enabled: true,
  logger: createApiLogger({ name: 'express-api' }),
  bodyLoggingConfig: bodyConfig,
});

// Use for external API calls
app.get('/users/:id', async (req, res) => {
  const user = await loggedFetch(`https://api.example.com/users/${req.params.id}`);
  const data = await user.json();
  res.json(data);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### 5. Next.js Integration

```typescript
// src/lib/logger.ts - Unified logger (auto-detects environment)
import { logger } from '@zaob/glean-logger';
export const log = logger({ name: 'my-app' });

// src/app/api/users/route.ts - Server-side API route
import { NextResponse } from 'next/server';
import { measure } from '@zaob/glean-logger';

export async function GET() {
  const { result, duration } = await measure('fetch-users', async () => {
    // Your async logic here
    return await db.users.findMany();
  });

  log.info('Users fetched', { count: result.length, duration: `${duration}ms` });
  return NextResponse.json(result);
}

// src/app/page.tsx - Client component
'use client';
import { logger } from '@zaob/glean-logger/browser';

const log = logger({ name: 'HomePage' });

export default function HomePage() {
  log.info('Page mounted');

  const handleClick = () => {
    log.info('Button clicked', { buttonId: 'submit' });
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### 6. Security Redaction (Auto-Protect Sensitive Data)

```typescript
import { ApiLoggerBuilder } from '@zaob/glean-logger';

// Production preset includes comprehensive security
const config = new ApiLoggerBuilder()
  .production() // Includes SSN, credit card, Bearer token redaction
  .build();

// Or customize with your own patterns
const customConfig = new ApiLoggerBuilder()
  .addRedactionPattern(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL-REDACTED]', [
    'email',
  ])
  .addSensitiveFields('apiKey', 'privateKey', 'sessionId')
  .build();
```

### 7. Log Normalization (New)

The package includes utilities to normalize and clean logs before storage:

```typescript
import {
  normalizeBrowserLogEntry,
  serializeError,
  serializeConsoleArgs,
} from '@zaob/glean-logger/utils';

// Clean error object for JSON
const cleanError = serializeError(new Error('Failed'));

// Normalize browser log entry
const normalized = normalizeBrowserLogEntry(entry);
```

### 8. React Integration

Deep React integration with Context, Hooks, and Error Boundary:

```tsx
// app/layout.tsx
import { Logger } from '@zaob/glean-logger/react';

export default function RootLayout({ children }) {
  return <Logger>{children}</Logger>;
}

// app/page.tsx
('use client');
import { useLogger } from '@zaob/glean-logger/react';

export default function MyComponent() {
  const logger = useLogger();

  const handleClick = () => {
    logger.info('Button clicked', { buttonId: 'submit' });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

**React Exports:**

| Export                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `Logger`              | Combined Provider + Error Boundary (recommended) |
| `LoggerProvider`      | React Context Provider                           |
| `LoggerErrorBoundary` | Error Boundary with automatic logging            |
| `useLogger()`         | Hook to access logger in components              |
| `useLoggerContext()`  | Hook to access utilities (flush, getLogs)        |

**Example with Next.js:** See [examples/nextjs-logging-demo](examples/nextjs-logging-demo/)

---

## 🔧 Configuration Presets

Use presets to reduce configuration from ~25 lines to 1-2 lines:

| Preset           | Use Case   | Key Features                                             |
| ---------------- | ---------- | -------------------------------------------------------- |
| `.basic()`       | Just works | 10KB, 5s timeout, common redactions                      |
| `.production()`  | Production | 5KB, 3s timeout, full security, SSN/credit card patterns |
| `.development()` | Debugging  | 50KB, 10s timeout, verbose on                            |
| `.minimal()`     | High perf  | Body logging disabled, minimal overhead                  |

```typescript
// Before: ~25 lines of configuration
const config = new ApiLoggerBuilder()
  .enabled(true)
  .maxSize('10kb')
  .readTimeout('5s')
  .excludeContentTypes('image/*', 'video/*', 'application/pdf', 'font/*', 'multipart/form-data')
  .addSensitiveFields('password', 'token', 'secret')
  .skipStatusCodes(204, 304)
  .verbose(process.env.NODE_ENV === 'development')
  .maxDepth(10)
  .build();

// After: 1 line with preset
const config = new ApiLoggerBuilder().basic().build();

// Or customize after preset
const config = new ApiLoggerBuilder()
  .production()
  .maxSize('20kb') // Override preset default
  .build();
```

---

## 📚 API Reference

### Core Functions

| Function             | Description                                       | Environment |
| -------------------- | ------------------------------------------------- | ----------- |
| `logger(options?)`   | Main logger factory (auto-detects browser/server) | Both        |
| `child(context)`     | Child logger with persistent context              | Server      |
| `measure(label, fn)` | Time async operations                             | Both        |

### React Integration (@zaob/glean-logger/react)

| Export                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `Logger`              | Combined Provider + Error Boundary (recommended) |
| `LoggerProvider`      | React Context Provider                           |
| `LoggerErrorBoundary` | Error Boundary with automatic logging            |
| `useLogger()`         | Hook to access logger in components              |
| `useLoggerContext()`  | Hook to access utilities (flush, getLogs)        |

### HTTP Logging

| Function/Class                | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `createLoggedFetch(options?)` | Wrap fetch for automatic request/response logging |
| `ApiLoggerBuilder`            | Fluent API for configuring body logging           |
| `createApiLogger(options?)`   | Create API logger instance                        |
| `parseSize(sizeStr)`          | Parse size strings like "10kb", "1mb"             |
| `parseDuration(durationStr)`  | Parse duration strings like "5s", "5000ms"        |

### Performance

| Function/Class                   | Description               |
| -------------------------------- | ------------------------- |
| `performance.now()`              | High-resolution timestamp |
| `performance.formatDuration(ms)` | Human-readable duration   |
| `performance.time(fn)`           | Time synchronous function |
| `performance.timeAsync(fn)`      | Time async function       |
| `performance.Stopwatch`          | Manual timing control     |

---

## 📁 Examples

| Example                                              | Description                    | When to Use                 |
| ---------------------------------------------------- | ------------------------------ | --------------------------- |
| [basic-starter](examples/basic-starter/)             | Core logging functionality     | Getting started             |
| [express-api](examples/express-api/)                 | Express.js with HTTP logging   | Backend API development     |
| [nextjs-logging-demo](examples/nextjs-logging-demo/) | Next.js with React integration | Full-stack React apps (NEW) |
| [nextjs-app](examples/nextjs-app/)                   | Next.js client/server logging  | Full-stack Next.js apps     |
| [performance-demo](examples/performance-demo/)       | Performance tracking patterns  | Benchmarking & optimization |
| [security-redaction](examples/security-redaction/)   | Sensitive data protection      | Compliance & security       |

---

## 🔒 Security Features

Automatic sensitive data redaction (enabled by default):

```typescript
log.info('User login attempt', {
  email: 'user@example.com', // ✅ Kept
  password: 'secret123', // ❌ Redacted → "[REDACTED]"
  token: 'jwt-token', // ❌ Redacted → "[REDACTED]"
  creditCard: '4111-1111-1111-1111', // ❌ Redacted → "[REDACTED-CARD]"
  authorization: 'Bearer xxx', // ❌ Redacted → "Bearer [REDACTED]"
  ssn: '123-45-6789', // ❌ Redacted → "[REDACTED-SSN]"
});
```

### Redacted by Default

**Fields:** password, token, secret, apikey, accesstoken, refreshtoken, privatekey, ssn, creditcard, cardnumber, cvv, cvc

**Headers:** authorization, cookie, set-cookie, x-api-key, x-auth-token, x-forwarded-for

**Patterns:** SSN, credit cards, Bearer tokens

---

## 📊 Log Output

### Browser

```
DevTools Console → See all logs
```

### Server (Development)

```
Terminal output → Colored console logs
```

### Server (Production - Traditional Node.js)

```
_logs/
├── combined.2026-01-16.log    # All logs
├── api.2026-01-16.log         # API logs
└── error.2026-01-16.log       # Errors only
```

---

## ☁️ Cloudflare Workers & Local Development

This section covers the recommended setup for **local development debugging** and **Cloudflare Workers deployment**.

### Cloudflare Workers Considerations

**Key Facts:**

- Cloudflare Workers has **NO persistent filesystem**
- Cannot write logs to local files (unlike traditional Node.js servers)
- Console logs are automatically captured by Cloudflare dashboard (7-day retention)
- Use **Logpush** to send logs to external storage (R2, D1, KV) for long-term retention

**Will Logging Fill Up Cloudflare Storage?**

**NO.** Here's why:

- Workers console logs go to Cloudflare's managed logging system, not your storage
- No persistent files are written to disk (Cloudflare doesn't allow it)
- Logpush sends logs to external destinations you control
- Head-based sampling automatically limits volume to 5 billion logs/day

### Recommended Configuration for Cloudflare Workers

```typescript
// For Cloudflare Workers / Edge environments
import { logger } from '@zaob/glean-logger';

// Always use console-only logging in Workers
const log = logger({
  name: 'my-worker',
  level: process.env.LOG_LEVEL || 'info',
});

// Logs appear in Cloudflare Dashboard → Workers & Pages → Your Worker → Logs
log.info('Request received', { method: 'GET', url: '/api/users' });
log.error('Something went wrong', { error: err.message });
```

### Cloudflare Logpush Configuration (wrangler.toml)

```toml
name = "my-worker"
compatibility_date = "2024-01-01"

[observability]
enabled = true
head_sampling_rate = 1

# Optional: Send only errors to external storage
[[logpush]]
destination = "r2://my-bucket/logs"
filter = "level == \"error\""
sampling_rate = 0.1
```

### Local Development Setup (Debug Only)

For local development with Cloudflare Workers:

```bash
# Install Wrangler for local development
npm install -D wrangler

# Run worker locally with live logging
npx wrangler dev

# Or use wrangler tail for real-time logs
npx wrangler tail
```

### Disabling Logging in Production

If you want to disable logging entirely in production:

```typescript
// Option 1: Environment-based
const log = logger({
  name: 'my-app',
  enabled: process.env.NODE_ENV !== 'production',
});

log.info('This will only log in development'); // No-op in production

// Option 2: Complete disable
const log = logger({
  name: 'my-app',
  enabled: false,
});
```

### Environment Detection

```typescript
import { logger, isDevelopment, isProduction } from '@zaob/glean-logger';

const log = logger({ name: 'my-app' });

if (isDevelopment()) {
  // Development-specific logging
  log.debug('Detailed debug info', { verboseData });
}

if (isProduction()) {
  // Production - minimal logging
  log.info('Production event', { eventType: 'user_login' });
}
```

---

## ⚙️ Environment Variables

```env
# Master switch
LOGGER_ENABLED=true

# Log level
LOG_LEVEL=debug  # debug, info, warn, error

# Server logging
LOG_DIR=./_logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# Body logging (ApiLoggerBuilder)
LOG_BODY_ENABLED=true
LOG_BODY_MAX_SIZE=10kb
LOG_BODY_READ_TIMEOUT=5s
```

---

## 🚨 Troubleshooting

### "loggedFetch is server-only"

```typescript
// Wrong - this runs in browser
import { loggedFetch } from '@zaob/glean-logger';

// Correct - check environment first
if (typeof window === 'undefined') {
  const { createLoggedFetch } = require('@zaob/glean-logger');
  // Use createLoggedFetch
}
```

### "Child logger returns null"

```typescript
// Child loggers are server-only
const apiLog = child({ module: 'api' });
// In browser, this returns null
if (apiLog) {
  apiLog.info('Request received');
}
```

### "Type 'fatal' does not exist"

```typescript
// Fatal method is not available on all loggers
// Use error() instead
log.error('Critical error', { error: err.message });
```

---

## 📖 Full Documentation

For complete documentation including architecture, advanced configuration, and contribution guidelines, see:

- [README.md](README.md) - Main documentation
- [examples/README.md](examples/README.md) - Examples guide
- [src/](src/) - Source code with JSDoc comments

---

## ✅ Quality Assurance

- **128 tests** - Vitest test suite
- **80% coverage** - Code coverage requirement
- **TypeScript** - Full type safety
- **ESLint + Prettier** - Code quality
- **GitHub Actions** - Automated CI/CD

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and breaking changes.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run test:ci` and `npm run lint`
5. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.
