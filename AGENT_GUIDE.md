# AI Agent Reference Guide

Quick reference for AI agents integrating glean-logger into user projects.

---

## 📦 Package Info

```json
{
  "name": "@zaob/glean-logger",
  "version": "1.1.1",
  "exports": {
    ".": {
      "browser": {
        "types": "./dist/browser-entry.d.mts",
        "import": "./dist/browser-entry.mjs",
        "require": "./dist/browser-entry.js"
      },
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./browser": {
      "types": "./dist/browser-entry.d.mts",
      "import": "./dist/browser-entry.mjs",
      "require": "./dist/browser-entry.js"
    },
    "./server": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "typesVersions": {
    ">=4.7": {
      "*": ["dist/index.d.ts"],
      "browser": ["dist/browser-entry.d.mts"]
    }
  }
}
```

---

## 🔑 Conditional Exports Explained

The library uses **conditional exports** to automatically provide the correct types and implementation based on the target environment:

| Import Path                    | TypeScript Sees       | Runtime Returns     |
| ------------------------------ | --------------------- | ------------------- |
| `@zaob/glean-logger` (browser) | `browser-entry.d.mts` | `browser-entry.mjs` |
| `@zaob/glean-logger` (server)  | `index.d.ts`          | `index.mjs`         |
| `@zaob/glean-logger/browser`   | `browser-entry.d.mts` | `browser-entry.mjs` |
| `@zaob/glean-logger/server`    | `index.d.ts`          | `index.mjs`         |

### Browser-Safe Exports

When importing from `@zaob/glean-logger` in a browser context, TypeScript will resolve to `browser-entry.d.mts`:

```typescript
// browser-entry.d.mts exports:
export {
  type IBrowserLogger,
  type LogContext,
  type LogLevel,
  logger,
  measure,
  perf as performance,
};
```

### Server-Only Exports

The following are **server-only** (available only in server context or via explicit server import):

```typescript
// These require server environment or explicit @zaob/glean-logger/server import:
- child(context: LogContext): IServerLogger | null  // Returns null in browser
- loggedFetch(options?): WrappedFetch                // Throws in browser
- ApiLoggerBuilder                                   // Winston-based
- createLoggedFetch(options?)                        // HTTP logging
- createApiLogger(options?)                          // API logger
```

---

## ⚠️ Type Safety: Server-Only Functions

TypeScript types include JSDoc warnings for server-only functions:

### `child()` - Returns `null` in browser

```typescript
/**
 * **⚠️ SERVER-ONLY**: Returns `null` in browser. Use conditional checks:
 * const apiLog = child({ module: 'api' });
 * if (apiLog) { apiLog.info('Request received'); }
 */
declare function child(context: LogContext): IServerLogger | null;
```

**Usage (safe pattern):**

```typescript
import { child } from '@zaob/glean-logger';

const apiLog = child({ module: 'api', version: '1.0' });
if (apiLog) {
  apiLog.info('Request received');
}
```

### `loggedFetch()` - Throws in browser

```typescript
/**
 * **⚠️ SERVER-ONLY**: This function throws `Error('loggedFetch is server-only')` in browser.
 * Import from `@zaob/glean-logger/browser` for browser-safe builds.
 */
declare function loggedFetch(options?): WrappedFetch;
```

**Usage (safe pattern):**

```typescript
import { loggedFetch } from '@zaob/glean-logger/server';

// Or use dynamic import for SSR
if (typeof window === 'undefined') {
  const { loggedFetch } = await import('@zaob/glean-logger');
  const fetch = loggedFetch();
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

### Core Functions (Browser-Safe)

| Function             | Import               | Returns               | Environment | Notes                       |
| -------------------- | -------------------- | --------------------- | ----------- | --------------------------- |
| `logger(options?)`   | `@zaob/glean-logger` | `IBrowserLogger`      | Both        | Auto-detects browser/server |
| `measure(label, fn)` | `@zaob/glean-logger` | `{result, duration}`  | Both        | Returns no-op in disabled   |
| `performance`        | `@zaob/glean-logger` | Performance utilities | Both        | now(), time(), etc.         |

### Server-Only Functions

| Function            | Import               | Returns                 | Notes                                    |
| ------------------- | -------------------- | ----------------------- | ---------------------------------------- |
| `child(context)`    | `@zaob/glean-logger` | `IServerLogger \| null` | ⚠️ Returns `null` in browser             |
| `loggedFetch(opt?)` | `@zaob/glean-logger` | Wrapped fetch           | ⚠️ Throws `Error('server-only')` browser |

### Performance Utilities

| Function                         | Import               | Returns                 |
| -------------------------------- | -------------------- | ----------------------- |
| `performance.now()`              | `@zaob/glean-logger` | `number`                |
| `performance.formatDuration(ms)` | `@zaob/glean-logger` | `string`                |
| `performance.time(fn)`           | `@zaob/glean-logger` | `TimingResult`          |
| `performance.timeAsync(fn)`      | `@zaob/glean-logger` | `Promise<TimingResult>` |

### HTTP Logging (Server-Only)

| Function                      | Import               | Returns                             |
| ----------------------------- | -------------------- | ----------------------------------- |
| `createLoggedFetch(options?)` | `@zaob/glean-logger` | `(url, init?) => Promise<Response>` |
| `ApiLoggerBuilder`            | `@zaob/glean-logger` | Builder class                       |
| `createApiLogger(options?)`   | `@zaob/glean-logger` | `IApiLogger`                        |

---

## 🛡️ Type Safety Patterns

### Pattern: Safe Usage of Server-Only Functions

```typescript
import { child, loggedFetch } from '@zaob/glean-logger';

// ✅ SAFE: Check for null (child returns null in browser)
const apiLog = child({ module: 'api', version: '1.0' });
if (apiLog) {
  apiLog.info('Request received');
}

// ✅ SAFE: Dynamic import for SSR (loggedFetch throws in browser)
if (typeof window === 'undefined') {
  const { loggedFetch } = await import('@zaob/glean-logger');
  const fetch = loggedFetch();
}

// ✅ SAFE: Explicit server import
import { loggedFetch } from '@zaob/glean-logger/server';
```

### Pattern: TypeScript Will Warn You

When you import `@zaob/glean-logger` in a browser context:

- TypeScript automatically resolves to `browser-entry.d.mts`
- Server-only functions (`child`, `loggedFetch`, etc.) are **not visible** in autocomplete
- No chance of accidentally using server-only features

When you import in server context:

- TypeScript resolves to `index.d.ts`
- All functions available
- JSDoc warnings indicate server-only functions

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

### Pattern 5: Child Logger with Context (Server Only)

```typescript
import { child } from '@zaob/glean-logger';

const apiLog = child({ module: 'users', version: '1.0' });

// ✅ SAFE: Check for null (returns null in browser)
if (apiLog) {
  apiLog.info('Request received', { method: 'GET', path: '/users' });
  // Logs with: { ..., module: 'users', version: '1.0' }
}
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

// WRONG: Using child() without null check (returns null in browser)
const apiLog = child({ module: 'api' });
apiLog.info('Request'); // ❌ Runtime error if apiLog is null

// WRONG: Using createLoggedFetch in browser code
// TypeScript may not warn you if import resolution is incorrect
import { createLoggedFetch } from '@zaob/glean-logger';
const fetch = createLoggedFetch(); // ❌ Throws at runtime in browser

// ✅ CORRECT: Always null-check server-only functions
const apiLog = child({ module: 'api' });
if (apiLog) {
  apiLog.info('Request');
}

// ✅ CORRECT: Use dynamic import for SSR code
if (typeof window === 'undefined') {
  const { createLoggedFetch } = await import('@zaob/glean-logger');
  const fetch = createLoggedFetch();
}

// ✅ CORRECT: Explicit server import in server-only files
import { createLoggedFetch } from '@zaob/glean-logger/server';
```

**Note on TypeScript Safety:**

- In browser context: TypeScript auto-resolves to `browser-entry.d.mts`, server-only functions won't appear in autocomplete
- In server context: TypeScript resolves to `index.d.ts`, all functions available with JSDoc warnings
- Always use null-checks for functions that return `null` in browser (`child`)

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
- [ ] Imported `child` only for server-side code with null-check
- [ ] Verified no file writes in production (Cloudflare/Serverless safe)
- [ ] For SSR: Used dynamic imports or explicit server import for `loggedFetch`, `createLoggedFetch`

---

## 📖 Related Documentation

- [GETTING_STARTED.md](GETTING_STARTED.md) - Quick start for humans
- [QUICK_START.md](QUICK_START.md) - Comprehensive guide
- [README.md](README.md) - Full documentation
- [src/](src/) - Source code with JSDoc

---

## 🤖 For AI Agents: Fetch This Guide

Use this prompt to fetch and use this documentation:

### Option 1: Raw GitHub URL

```
https://raw.githubusercontent.com/maemreyo/glean-logger/main/AGENT_GUIDE.md
```

### Option 2: GitHub CLI

```bash
gh api repos/maemreyo/glean-logger/contents/AGENT_GUIDE.md --jq '.content' | base64 -d
```

### 📝 Copy-Paste Prompt

```
You are integrating @zaob/glean-logger into a user project.

First, fetch the agent guide:
- URL: https://raw.githubusercontent.com/maemreyo/glean-logger/main/AGENT_GUIDE.md

Follow the "Verification Checklist" section to:
1. Create src/lib/logger.ts with `enabled: process.env.NODE_ENV !== 'production'`
2. Configure .env.local (enabled) and .env.production (disabled)
3. Use @zaob/glean-logger/browser for client components
4. Use @zaob/glean-logger (auto-detect) for universal code
5. Use measure() for async timing
6. Check for null when using child() (server-only)
7. Use @zaob/glean-logger/server or dynamic import for loggedFetch/createLoggedFetch

Key type safety features:
- Package uses conditional exports: browser builds get browser-entry.d.mts types
- Server-only functions have JSDoc warnings in index.d.ts
- child() returns null in browser (always null-check)
- loggedFetch() throws in browser (use @zaob/glean-logger/server import)

DO NOT:
- Enable logging in production
- Use createLoggedFetch/loggedFetch in browser without explicit server import
- Write files in serverless/Cloudflare environments
- Forget null-check for child() even in server code

Key patterns from the guide:
- Local dev only: logger({ enabled: process.env.NODE_ENV !== 'production' })
- Client: import { logger } from '@zaob/glean-logger/browser'
- Server: import { child, loggedFetch } from '@zaob/glean-logger/server'
- Timing: const { result, duration } = await measure('label', async () => {...})
- Child logger: const apiLog = child({ module: 'api' }); if (apiLog) {...}
```

You are integrating @zaob/glean-logger into a user project.

First, fetch the agent guide:

- URL: https://raw.githubusercontent.com/maemreyo/glean-logger/main/AGENT_GUIDE.md

Follow the "Verification Checklist" section to:

1. Create src/lib/logger.ts with `enabled: process.env.NODE_ENV !== 'production'`
2. Configure .env.local (enabled) and .env.production (disabled)
3. Use @zaob/glean-logger/browser for client components
4. Use @zaob/glean-logger (auto-detect) for universal code
5. Use measure() for async timing
6. Check for null when using child() (server-only)

DO NOT:

- Enable logging in production
- Use createLoggedFetch in browser
- Write files in serverless/Cloudflare environments

Key patterns from the guide:

- Local dev only: logger({ enabled: process.env.NODE_ENV !== 'production' })
- Client: import { logger } from '@zaob/glean-logger/browser'
- Timing: const { result, duration } = await measure('label', async () => {...})
- Child logger: const apiLog = child({ module: 'api' }); if (apiLog) {...}

```

---

## 📁 Documentation Files Available

| File               | URL                        | Purpose              |
| ------------------ | -------------------------- | -------------------- |
| **AGENT_GUIDE.md** | `/main/AGENT_GUIDE.md`     | AI Agent integration |
| GETTING_STARTED.md | `/main/GETTING_STARTED.md` | Human quick start    |
| QUICK_START.md     | `/main/QUICK_START.md`     | Human comprehensive  |
| README.md          | `/main/README.md`          | Overview             |
| examples/          | `/main/examples/`          | Code examples        |

**Latest version:** `https://raw.githubusercontent.com/maemreyo/glean-logger/main/AGENT_GUIDE.md`
```
