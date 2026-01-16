# Glean Logger Examples

This directory contains comprehensive examples demonstrating `@zaob/glean-logger` usage patterns.

## Quick Start

```bash
# Install dependencies for all examples
cd examples/basic-starter && npm install
cd ../express-api && npm install
cd ../performance-demo && npm install
cd ../security-redaction && npm install
cd ../nextjs-app && npm install
```

## Examples Overview

| Example                                   | Description                      | Difficulty   |
| ----------------------------------------- | -------------------------------- | ------------ |
| [basic-starter](basic-starter/)           | Core logging functionality       | Beginner     |
| [express-api](express-api/)               | HTTP server with request logging | Intermediate |
| [nextjs-app](nextjs-app/)                 | Next.js client and API logging   | Intermediate |
| [performance-demo](performance-demo/)     | Performance tracking patterns    | Advanced     |
| [security-redaction](security-redaction/) | Sensitive data protection        | All levels   |

---

## basic-starter

**Tags:** Beginner, Logging Basics, Performance

Minimal example showing core logging features:

```bash
cd basic-starter && npm start
```

**Covers:**

- Log levels (debug, info, warn, error)
- Contextual metadata
- `measure()` for async timing
- `Stopwatch` for manual timing

---

## express-api

**Tags:** Intermediate, Express, HTTP, Middleware

Complete Express.js server with comprehensive logging:

```bash
cd express-api && npm start
```

**Covers:**

- Request/response middleware
- Child loggers with context
- Winston file rotation
- API route logging

**Endpoints:**

- `GET /` - Root
- `GET /users/:id` - Get user
- `POST /users` - Create user
- `GET /products` - List products
- `GET /health` - Health check

---

## nextjs-app

**Tags:** Intermediate, Next.js, Client-Side

Next.js 15 application with client logging:

```bash
cd nextjs-app && npm run dev
```

**Covers:**

- Client-side logging
- API routes with timing
- Real-time console output

**Note:** Server-side Winston logging requires additional webpack configuration.

---

## performance-demo

**Tags:** Advanced, Performance, Benchmarking

Comprehensive performance tracking patterns:

```bash
cd performance-demo && npm start
```

**Covers:**

- `measure()` for async operations
- `Stopwatch` for manual timing
- Concurrent operations
- Metrics aggregation

---

## security-redaction

**Tags:** All Levels, Security, Compliance

Automatic sensitive data detection and redaction:

```bash
cd security-redaction && npm start
```

**Covers:**

- Password/secret redaction
- Token/API key masking
- Credit card protection
- PII detection (SSN, etc.)
- Cookie security

**Redacted Patterns:**

```
password → [REDACTED]
creditCard → [REDACTED]
ssn → [REDACTED]
authorization → [REDACTED]
```

---

## Common Patterns

### Basic Logging

```typescript
import { logger } from '@zaob/glean-logger';

const log = logger({ name: 'my-app' });
log.info('User signed in', { userId: 123 });
```

### Async Timing

```typescript
import { measure } from '@zaob/glean-logger';

const { result, duration } = await measure('fetch-users', async () => {
  return await db.query('SELECT * FROM users');
});
```

### Server Logging

```typescript
import { child } from '@zaob/glean-logger';

const apiLog = child({ module: 'api', version: '1.0' });
apiLog.info('Request received', { path: '/users' });
```

---

## Log Output

### Console (Development)

```
2024-01-16T10:30:00.000Z [info] User signed in userId=123
```

### Files (Server)

```
_logs/
├── combined.2024-01-16.log
├── api.2024-01-16.log
└── error.2024-01-16.log
```

---

## Learn More

- [Full Documentation](../README.md)
- [API Reference](../README.md#-api-reference)
- [NPM Package](https://www.npmjs.com/package/@zaob/glean-logger)
- [GitHub Repository](https://github.com/zaob/glean-logger)

---

## Requirements

- Node.js 18+
- npm 9+

## License

MIT - See [../../LICENSE](../../LICENSE)
