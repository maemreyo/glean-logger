# Glean Logger

A production-ready logging module for Node.js/TypeScript with automatic environment detection, browser-safe logging, and Winston server logging with daily file rotation.

## 🚀 Quick Installation

```bash
# Install via npm
npm install @zaob/glean-logger
```

## 📦 Usage

### Basic Logging (Works Everywhere)

```typescript
import { logger, measure, performance } from '@zaob/glean-logger';

const log = logger({ name: 'my-module' });

log.info('User signed in', { userId: 123, email: 'user@example.com' });
log.error('Failed to fetch data', { endpoint: '/api/users', error: 'timeout' });
log.debug('Processing item', { itemId: 456, progress: 50 });

// Measure execution time
const { result, duration } = await measure('fetch-users', async () => {
  return await database.query('SELECT * FROM users');
});
console.log(`Query completed in ${duration}ms`);
```

### Server-Only Features

```typescript
import { child, loggedFetch } from '@zaob/glean-logger';

// Child logger with context
const apiLog = child({ module: 'api', version: '1.0', endpoint: '/api/users' });
apiLog.info('Request received');

// Logged fetch
const fetch = loggedFetch();
const users = await fetch('/api/users');
```

### Environment-Specific

```typescript
// Client-Side (Browser) - console + localStorage
import { logger } from 'glean-logger';
const log = logger({ name: 'UserProfile' });
log.info('User clicked button', { buttonId: 'submit' });

// Server-Side (Node.js) - console + file rotation
import { logger } from 'glean-logger';
const log = logger({ name: 'api-users' });
log.info('User created', { userId: 123 });
```

---

## 🔧 Next.js Integration

**@zaob/glean-logger now works seamlessly with Next.js - no webpack configuration needed!**

The package uses conditional exports to automatically provide the right entry point:

- **Client Components**: Uses browser-safe logger (console + localStorage)
- **Server Components**: Uses full Node.js logger with `measure()` for performance tracking
- **API Routes**: Uses full Node.js logger with optional Winston integration

### Client-Side Logging

```typescript
// src/app/page.tsx
'use client';

import { clientLog } from '@/lib/logger-client';

export default function HomePage() {
  clientLog.info('Home page mounted', { path: '/' });

  const handleClick = () => {
    clientLog.info('Button clicked', { buttonId: 'demo-button' });
  };

  return <button onClick={handleClick}>Log Event</button>;
}
```

```typescript
// src/lib/logger-client.ts
export const clientLog = {
  info: (msg: string, meta?: Record<string, unknown>) => console.log(`[INFO] ${msg}`, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(`[DEBUG] ${msg}`, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[WARN] ${msg}`, meta),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[ERROR] ${msg}`, meta),
};
```

### Server-Side Logging (API Routes)

```typescript
// src/app/api/hello/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { measure } from '@zaob/glean-logger';

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[API] INFO: ${msg}`, meta ? JSON.stringify(meta) : ''),
};

export async function GET(_request: NextRequest) {
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

### Performance Tracking with `measure()`

```typescript
import { measure } from '@zaob/glean-logger';

const { result, duration } = await measure('fetch-data', async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
});

console.log(`Fetch completed in ${duration}ms`);
```

### View Logs

| Environment | Where to View                     |
| ----------- | --------------------------------- |
| **Browser** | DevTools → Console                |
| **Server**  | Terminal where `npm run dev` runs |

---

## 🏗 Architecture

@zaob/glean-logger uses a **dual-entry-point architecture** with conditional exports:

```
@zaob/glean-logger/
├── dist/
│   ├── index.js              # Main entry (auto-detects environment)
│   ├── browser.js            # Browser-safe entry (no Node.js APIs)
│   └── server.js             # Server entry (full Winston support)
```

### Conditional Exports (package.json)

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./browser": {
      "import": "./dist/browser.mjs",
      "require": "./dist/browser.js",
      "default": "./dist/browser.js"
    },
    "./server": {
      "import": "./dist/server.mjs",
      "require": "./dist/server.js",
      "default": "./dist/server.js"
    }
  }
}
```

### Entry Points

| Entry Point                  | Environment | Features                             |
| ---------------------------- | ----------- | ------------------------------------ |
| `@zaob/glean-logger`         | Auto        | Environment auto-detection           |
| `@zaob/glean-logger/browser` | Browser     | Console + localStorage, no Winston   |
| `@zaob/glean-logger/server`  | Node.js     | Full Winston + child() + loggedFetch |

### How It Works

1. **Main Entry (`index.js`)**: Checks for Node.js environment at runtime
   - If Node.js detected → imports `server.js`
   - If browser detected → imports `browser.js`

2. **Browser Entry (`browser.js`)**: Browser-safe logger
   - Uses `console` for output
   - Uses `localStorage` for persistence
   - No Winston, no `fs` module

3. **Server Entry (`server.js`)**: Full-featured logger
   - Uses `winston` with file rotation
   - Supports `child()` for context-aware logging
   - Supports `loggedFetch()` for HTTP request logging

---

## 📚 Examples

Check out our comprehensive examples:

| Example                                            | Description                      | Link                                 |
| -------------------------------------------------- | -------------------------------- | ------------------------------------ |
| [Basic Starter](examples/basic-starter/)           | Core logging functionality       | [View](examples/basic-starter/)      |
| [Express API](examples/express-api/)               | HTTP server with request logging | [View](examples/express-api/)        |
| [Next.js App](examples/nextjs-app/)                | Next.js client and API logging   | [View](examples/nextjs-app/)         |
| [Performance Demo](examples/performance-demo/)     | Performance tracking patterns    | [View](examples/performance-demo/)   |
| [Security Redaction](examples/security-redaction/) | Sensitive data protection        | [View](examples/security-redaction/) |

### Quick Start with Examples

```bash
# Basic logging example
cd examples/basic-starter
npm install
npm start

# Express.js API with full logging
cd examples/express-api
npm install
npm start

# Next.js app with client/server logging
cd examples/nextjs-app
npm install
npm run dev

# Performance tracking benchmarks
cd examples/performance-demo
npm install
npm start

# Security redaction demo
cd examples/security-redaction
npm install
npm start
```

---

## ⚙️ Configuration

### Environment Variables

```env
LOGGER_ENABLED=true
LOG_LEVEL=debug
LOG_DIR=./_logs
MAX_FILE_SIZE=10m
MAX_FILES=14
REDACT_SENSITIVE=true
```

### Programmatic

```typescript
const log = logger({ name: 'api', level: 'debug' });
```

---

## 🔒 Security

Automatic sensitive data redaction:

```typescript
log.info('User login', {
  email: 'user@example.com', // ✅ Kept
  password: 'secret123', // ❌ Redacted
  token: 'jwt-token', // ❌ Redacted
  creditCard: '4111-1111-1111-1111', // ❌ Redacted
  authorization: 'Bearer xxx', // ❌ Redacted
  cookie: 'session=abc123', // ❌ Redacted
});
```

---

## 📊 Log Output

### Console (Development)

```
2024-01-16T10:30:00.000Z [info] User signed in userId=123 email=user@example.com
```

### Console (Production)

```json
{
  "@timestamp": "2024-01-16T10:30:00.000Z",
  "level": "INFO",
  "message": "User signed in",
  "userId": 123
}
```

### Files (Server)

```
_logs/
├── combined.2024-01-16.log    # All logs
├── api.2024-01-16.log         # API logs
└── error.2024-01-16.log       # Error logs
```

---

## 🛠 Development

### Setup

```bash
# Install dependencies
npm install

# Run development tasks
npm run build          # Build for production
npm run build:watch    # Build with watch mode
npm run test           # Run tests (watch mode)
npm run test:ci        # Run tests with coverage
npm run lint           # Auto-fix lint issues
npm run lint:check     # Check lint issues
npm run format         # Auto-format code
npm run format:check   # Check format issues
npm run typecheck      # TypeScript type check
```

### Building for NPM

```bash
# Build (generates dist/)
npm run build

# Publish to npm
npm run pub

# Release with git tag
npm run release
```

**Build outputs:**

- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (Type definitions)

---

## 📁 Project Structure

```
@zaob/glean-logger/
├── src/                      # Source code
│   ├── index.ts             # Main entry point
│   ├── browser.ts           # Browser-safe logger
│   ├── server.ts            # Winston server logger
│   ├── browser-entry.ts     # Browser entry (conditional export)
│   ├── http.ts              # HTTP request/response logging
│   ├── timing.ts            # Performance utilities
│   ├── types.ts             # TypeScript types
│   ├── config.ts            # Configuration
│   ├── formatters.ts        # Log formatters
│   ├── utils.ts             # Utilities
│   ├── redact.ts            # Sensitive data redaction
│   ├── schema.ts            # Schema validation
│   ├── winston.config.ts    # Winston configuration
│   └── test/                # Unit tests
├── dist/                     # Build output (generated)
├── examples/                 # Example applications
│   ├── basic-starter/       # Basic logging demo
│   ├── express-api/         # Express.js example
│   ├── nextjs-app/          # Next.js example
│   ├── performance-demo/    # Performance benchmarks
│   └── security-redaction/  # Security demo
├── .github/
│   └── workflows/ci.yml     # GitHub Actions CI
├── .husky/                   # Git hooks
├── eslint.config.js         # ESLint config
├── prettier.config.cjs      # Prettier config
├── vitest.config.ts         # Vitest config
├── tsconfig.json            # TypeScript config
├── tsup.config.ts           # Build config
├── package.json             # NPM package config
├── README.md                # This file
└── CHANGELOG.md             # Changelog
```

---

## 📚 API Reference

| Function                | Description               | Environment |
| ----------------------- | ------------------------- | ----------- |
| `logger(options?)`      | Main logger factory       | Both        |
| `child(context)`        | Child logger with context | Server      |
| `loggedFetch(options?)` | Logged HTTP fetch         | Server      |
| `measure(label, fn)`    | Time async operations     | Both        |
| `performance`           | Performance utilities     | Both        |

---

## ✅ Quality Assurance

This project includes:

- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **Vitest** - Unit testing with coverage reporting
- **GitHub Actions** - Automated CI/CD pipeline
- **TypeScript** - Full type safety

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run test:ci`
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- Repository: https://github.com/maemreyo/glean-logger
- Issues: https://github.com/maemreyo/glean-logger/issues
- NPM: https://www.npmjs.com/package/@zaob/glean-logger

# Demo release
