# Getting Started with Glean Logger

A lightweight logger for local development debugging with zero overhead in production.

---

## 🚀 Quick Install

```bash
npm install @zaob/glean-logger
```

---

## 💻 Local Development Setup

### 1. Create logger utility

```typescript
// src/lib/logger.ts
import { logger } from '@zaob/glean-logger';

export const log = logger({
  name: 'my-app',
  enabled: process.env.NODE_ENV !== 'production', // Local only
});
```

### 2. Use in your code

```typescript
import { log } from '@/lib/logger';
import { measure } from '@zaob/glean-logger';

log.info('User signed in', { userId: 123 });
log.error('Failed to fetch', { endpoint: '/api/users' });

// Time async operations
const { result, duration } = await measure('fetch-users', async () => {
  return await database.query('SELECT * FROM users');
});
```

### 3. View logs locally

```bash
npm run dev
```

Logs appear in your terminal with colors and are saved to `_logs/` directory.

### 4. Browser Log Sync

Browser logs are automatically synced to the server by default (batched or immediate for errors).

```typescript
// Client-side logs are sent to /api/logs
log.error('Something went wrong', { error: err });
```

---

## 🚫 Disable in Production

```bash
# .env.production
NEXT_PUBLIC_LOG_ENABLED=false
NODE_ENV=production
```

That's it! Zero logs, zero overhead in production.

---

## 📚 Full Documentation

- [README.md](README.md) - Complete documentation
- [QUICK_START.md](QUICK_START.md) - Advanced features & examples
