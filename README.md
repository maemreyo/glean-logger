# Glean Logger

A production-ready logging module for Node.js/TypeScript with automatic environment detection, browser-safe logging, and Winston server logging with daily file rotation.

## 🚀 Quick Setup

Choose one of two installation methods:

### Option 1: Copy Source (Recommended for flexibility)

```bash
cd /path/to/your/project

# Local setup
./path/to/glean-logger/setup.sh

# Remote setup
curl -sSL https://raw.githubusercontent.com/maemreyo/glean-logger/main/setup.sh | bash
```

### Option 2: NPM Package (Recommended for easy updates)

```bash
cd /path/to/your/project

# Install via npm
./path/to/glean-logger/setup.sh --npm

# Or directly
npm install glean-logger
```

---

## 📦 Installation

### Option 1: Copy Source

Best for: Custom modifications, full TypeScript source access, no npm dependency.

```bash
# Clone or download the module
git clone https://github.com/maemreyo/glean-logger.git

# Run setup
cd your-project
./glean-logger/setup.sh

# Install dependencies
./glean-logger/install.sh
```

**Manual Setup:**
```bash
# 1. Copy module
cp -r glean-logger/lib/logger /your/project/lib/

# 2. Create logs directory
mkdir -p /your/project/_logs
chmod 755 /your/project/_logs

# 3. Install dependencies
npm install winston winston-daily-rotate-file

# 4. Update .gitignore
echo "_logs/" >> /your/project/.gitignore
echo "*.log" >> /your/project/.gitignore
```

### Option 2: NPM Package

Best for: Easy updates, semantic versioning, published package.

```bash
# Install via setup script
./glean-logger/setup.sh --npm

# Or install directly
npm install glean-logger
npm install winston winston-daily-rotate-file
```

**Usage with NPM:**
```typescript
import { logger, child, measure } from 'glean-logger';

const log = logger({ name: 'my-app' });
log.info('Hello!', { userId: 123 });
```

---

## 🎯 Usage

### Basic Logging (Works Everywhere)

```typescript
import { logger } from '@/lib/logger';  // Copy source
// or
import { logger } from 'glean-logger';   // NPM package

const log = logger({ name: 'my-module' });

log.info('User signed in', { userId: 123, email: 'user@example.com' });
log.error('Failed to fetch data', { endpoint: '/api/users', error: 'timeout' });
log.debug('Processing item', { itemId: 456, progress: 50 });
```

### Server-Only Features

#### Child Logger with Context

```typescript
import { child } from '@/lib/logger';
// or
import { child } from 'glean-logger';

const apiLog = child({ module: 'api', version: '1.0', endpoint: '/api/users' });

apiLog.info('Request received');
apiLog.info('Processing');
apiLog.info('Request completed');
```

#### Logged Fetch

```typescript
import { loggedFetch } from '@/lib/logger';
// or
import { loggedFetch } from 'glean-logger';

const fetch = loggedFetch();
const users = await fetch('/api/users');
const response = await fetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ title: 'Hello' })
});
```

#### Measure Execution Time

```typescript
import { measure } from '@/lib/logger';
// or
import { measure } from 'glean-logger';

const { result, duration } = await measure('fetch-users', async () => {
    return await database.query('SELECT * FROM users');
});
console.log(`Query completed in ${duration}ms`);
```

### Environment-Specific

#### Client-Side (Browser)

```typescript
import { logger } from '@/lib/logger';
// or
import { logger } from 'glean-logger';

const log = logger({ name: 'UserProfile' });
log.info('User clicked button', { buttonId: 'submit' });
// Logs to console + localStorage
```

#### Server-Side (Node.js)

```typescript
import { logger } from '@/lib/logger';
// or
import { logger } from 'glean-logger';

const log = logger({ name: 'api-users' });
log.info('User created', { userId: 123 });
// Logs to console + _logs/ directory
```

---

## 📁 File Structure

```
glean-logger/
├── lib/logger/
│   ├── index.ts         # Main entry point
│   ├── browser.ts       # Browser-safe logger
│   ├── server.ts        # Winston server logger
│   ├── http.ts          # HTTP request/response logging
│   ├── timing.ts        # Performance utilities
│   ├── types.ts         # TypeScript types
│   ├── config.ts        # Configuration
│   ├── formatters.ts    # Log formatters
│   ├── utils.ts         # Utilities
│   ├── redact.ts        # Sensitive data redaction
│   ├── schema.ts        # Schema validation
│   └── winston.config.ts
├── setup.sh             # Setup script
├── install.sh           # Install dependencies
├── README.md            # This file
├── CHANGELOG.md         # Changelog
├── package.json         # NPM package config
└── tsup.config.ts       # Build config
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
    email: 'user@example.com',      // ✅ Kept
    password: 'secret123',          // ❌ Redacted
    token: 'jwt-token',             // ❌ Redacted
    creditCard: '4111-1111-1111-1111', // ❌ Redacted
    authorization: 'Bearer xxx',    // ❌ Redacted
    cookie: 'session=abc123',       // ❌ Redacted
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
{"@timestamp":"2024-01-16T10:30:00.000Z","level":"INFO","message":"User signed in","userId":123}
```

### Files (Server)
```
_logs/
├── combined.2024-01-16.log    # All logs
├── api.2024-01-16.log         # API logs
└── error.2024-01-16.log       # Error logs
```

---

## 🔧 Building for NPM

If you want to build and publish the package:

```bash
# Install build tool
npm install

# Build (generates dist/)
npm run build

# Publish to npm
npm run pub

# Or release with git tag
npm run release
```

**Build outputs:**
- `dist/index.js` (CommonJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (Type definitions)

---

## 📚 API Reference

| Function | Description | Environment |
|----------|-------------|-------------|
| `logger(options?)` | Main logger factory | Both |
| `child(context)` | Child logger with context | Server |
| `loggedFetch(options?)` | Logged HTTP fetch | Server |
| `measure(label, fn)` | Time async operations | Both |
| `performance` | Performance utilities | Both |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- Repository: https://github.com/maemreyo/glean-logger
- Issues: https://github.com/maemreyo/glean-logger/issues
