# Glean Logger

A production-ready logging module for Node.js/TypeScript with automatic environment detection, browser-safe logging, and Winston server logging with daily file rotation.

## 🚀 Quick Installation

```bash
# Install via npm
npm install glean-logger

# Install peer dependencies
npm install winston winston-daily-rotate-file
```

## 📦 Usage

### Basic Logging (Works Everywhere)

```typescript
import { logger, measure, performance } from 'glean-logger';

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
import { child, loggedFetch } from 'glean-logger';

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
glean-logger/
├── src/                      # Source code
│   ├── index.ts             # Main entry point
│   ├── browser.ts           # Browser-safe logger
│   ├── server.ts            # Winston server logger
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
- NPM: https://www.npmjs.com/package/glean-logger
