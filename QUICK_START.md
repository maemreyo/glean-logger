# Glean Logger - Quick Start Guide

A production-ready logging module for Node.js/TypeScript with automatic environment detection, browser-safe logging, and Winston server logging with daily file rotation.

---

## 🚀 Quick Installation

```bash
npm install @zaob/glean-logger
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

| Example                                            | Description                   | When to Use                 |
| -------------------------------------------------- | ----------------------------- | --------------------------- |
| [basic-starter](examples/basic-starter/)           | Core logging functionality    | Getting started             |
| [express-api](examples/express-api/)               | Express.js with HTTP logging  | Backend API development     |
| [nextjs-app](examples/nextjs-app/)                 | Next.js client/server logging | Full-stack Next.js apps     |
| [performance-demo](examples/performance-demo/)     | Performance tracking patterns | Benchmarking & optimization |
| [security-redaction](examples/security-redaction/) | Sensitive data protection     | Compliance & security       |

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

### Server (Production)

```
_logs/
├── combined.2026-01-16.log    # All logs
├── api.2026-01-16.log         # API logs
└── error.2026-01-16.log       # Errors only
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
