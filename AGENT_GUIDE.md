# AI Agent Reference Guide

Quick reference for AI agents integrating glean-logger into user projects.

---

## 📦 Package Info

```json
{
  "name": "@zaob/glean-logger",
  "version": "1.1.0",
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.js" },
    "./browser": { "import": "./dist/browser-entry.mjs", "require": "./dist/browser-entry.js" },
    "./server": { "import": "./dist/index.mjs", "require": "./dist/index.js" }
  }
}
```

---

## 🎯 Decision Tree

```
User wants logging?
│
├─► Local development only?
│   └─► YES → Use logger({ enabled: process.env.NODE_ENV !== 'production' })
│
├─► Cloudflare/Serverless?
│   └─► YES → Console logging only, NO file writes
│
├─► Node.js server with file logs?
│   └─► YES → Use full Winston logger with child(), measure()
│
└─► Browser client only?
    └─► YES → Use @zaob/glean-logger/browser (localStorage persistence)
```

---

## 📚 Function Catalog

### Core Functions

| Function             | Import               | Returns                 | Environment | Notes                       |
| -------------------- | -------------------- | ----------------------- | ----------- | --------------------------- |
| `logger(options?)`   | `@zaob/glean-logger` | `IBaseLogger`           | Both        | Auto-detects browser/server |
| `child(context)`     | `@zaob/glean-logger` | `IServerLogger \| null` | Server only | Returns null in browser     |
| `measure(label, fn)` | `@zaob/glean-logger` | `{result, duration}`    | Both        | Returns no-op in disabled   |

### HTTP Logging

| Function                      | Import               | Returns                             |
| ----------------------------- | -------------------- | ----------------------------------- |
| `createLoggedFetch(options?)` | `@zaob/glean-logger` | `(url, init?) => Promise<Response>` |
| `ApiLoggerBuilder`            | `@zaob/glean-logger` | Builder class                       |
| `createApiLogger(options?)`   | `@zaob/glean-logger` | `IApiLogger`                        |

### Performance

| Function                         | Import               | Returns                 |
| -------------------------------- | -------------------- | ----------------------- |
| `performance.now()`              | `@zaob/glean-logger` | `number`                |
| `performance.formatDuration(ms)` | `@zaob/glean-logger` | `string`                |
| `performance.time(fn)`           | `@zaob/glean-logger` | `TimingResult`          |
| `performance.timeAsync(fn)`      | `@zaob/glean-logger` | `Promise<TimingResult>` |

---

## 🔧 Logger Options

```typescript
interface LoggerOptions {
  name: string; // Required: logger identifier
  level?: LogLevel; // Optional: debug, info, warn, error, fatal
  enabled?: boolean; // Optional: default true
  developmentFormat?: boolean; // Optional: colored output
}
```

---

## 📋 Common Patterns

### Pattern 1: Local Development Only (RECOMMENDED)

```typescript
// src/lib/logger.ts
import { logger } from '@zaob/glean-logger';

export const log = logger({
  name: 'my-app',
  enabled: process.env.NODE_ENV !== 'production', // 👈 Key!
});
```

### Pattern 2: Conditional Development Logging

```typescript
import { logger, isDevelopment, isProduction } from '@zaob/glean-logger';

const log = logger({ name: 'my-app' });

if (isDevelopment()) {
  log.debug('Verbose debug info', { verboseData });
}

if (isProduction()) {
  // Logs are still collected but minimal
  log.info('Production event', { eventType: 'user_login' });
}
```

### Pattern 3: Performance Timing

```typescript
import { measure } from '@zaob/glean-logger';

const { result, duration } = await measure('fetch-users', async () => {
  return await database.query('SELECT * FROM users');
});

console.log(`Query took ${duration}ms`);
```

### Pattern 4: HTTP Request Logging (Server Only)

```typescript
import { createLoggedFetch, ApiLoggerBuilder } from '@zaob/glean-logger';

const loggedFetch = createLoggedFetch({
  enabled: true,
  bodyLoggingConfig: new ApiLoggerBuilder()
    .production() // or .basic(), .development(), .minimal()
    .build(),
});

const response = await loggedFetch('https://api.example.com/users');
```

### Pattern 5: Child Logger with Context

```typescript
import { child } from '@zaob/glean-logger';

const apiLog = child({ module: 'users', version: '1.0' });

apiLog.info('Request received', { method: 'GET', path: '/users' });
// Logs with: { ..., module: 'users', version: '1.0' }
```

---

## 🔒 Security: Auto Redaction

Fields automatically redacted in production:

**Fields:** `password`, `token`, `secret`, `apikey`, `ssn`, `creditcard`, etc.

**Headers:** `authorization`, `cookie`, `x-api-key`, etc.

**Patterns:** SSN, credit card numbers, Bearer tokens

```typescript
log.info('User login', {
  email: 'user@example.com', // ✅ Kept
  password: 'secret123', // ❌ → "[REDACTED]"
  token: 'jwt-token', // ❌ → "[REDACTED]"
});
```

---

## ⚙️ Environment Variables

```bash
# Local development
NEXT_PUBLIC_LOG_ENABLED=true      # Enable logging
NEXT_PUBLIC_LOG_LEVEL=debug       # debug, info, warn, error

# File logging (server only)
LOG_DIR=./_logs                   # Log directory
LOG_MAX_SIZE=10m                  # Max file size
LOG_MAX_FILES=14d                 # Retention period

# Production
NEXT_PUBLIC_LOG_ENABLED=false     # Disable all logging
NODE_ENV=production
```

---

## 🏗️ Project Structure Template

```
src/
├── lib/
│   └── logger.ts        ← Create this file
├── app/
│   ├── api/
│   │   └── route.ts     ← Import log here
│   └── page.tsx         ← Import log here
├── .env.local           ← Enable logging
└── .env.production      ← Disable logging
```

---

## ❌ What NOT To Do

```typescript
// WRONG: Always logs in production
const log = logger({ name: 'my-app' });

// WRONG: Using child() in browser (returns null)
const apiLog = child({ module: 'api' });
apiLog.info('Request'); // ❌ TypeError if not null-checked

// WRONG: Using createLoggedFetch in browser
import { createLoggedFetch } from '@zaob/glean-logger';
const fetch = createLoggedFetch(); // ❌ Server-only feature

// CORRECT: Check for null
const apiLog = child({ module: 'api' });
if (apiLog) {
  apiLog.info('Request');
}

// CORRECT: Conditional import
if (typeof window === 'undefined') {
  const { createLoggedFetch } = await import('@zaob/glean-logger');
}
```

---

## ✅ Verification Checklist

When integrating glean-logger into a user project:

- [ ] Created `src/lib/logger.ts` with environment-aware config
- [ ] Added `enabled: process.env.NODE_ENV !== 'production'`
- [ ] Configured `.env.local` with `NEXT_PUBLIC_LOG_ENABLED=true`
- [ ] Configured `.env.production` with `NEXT_PUBLIC_LOG_ENABLED=false`
- [ ] Used `@zaob/glean-logger/browser` for client components
- [ ] Used `@zaob/glean-logger` (auto-detect) for universal code
- [ ] Used `@zaob/glean-logger/server` explicitly for server-only features
- [ ] Imported `measure` for async timing
- [ ] Imported `child` only for server-side code
- [ ] Verified no file writes in production (Cloudflare/Serverless safe)

---

## 📖 Related Documentation

- [GETTING_STARTED.md](GETTING_STARTED.md) - Quick start for humans
- [QUICK_START.md](QUICK_START.md) - Comprehensive guide
- [README.md](README.md) - Full documentation
- [src/](src/) - Source code with JSDoc
