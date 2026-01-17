# Quick Start: Client-to-Server Logging

**Feature**: 001-browser-log-sync
**Last Updated**: 2026-01-17

---

## Prerequisites

```bash
# Ensure you're on the 001-browser-log-sync branch
git checkout 001-browser-log-sync

# Install dependencies (if not already done)
npm install
```

---

## Installation

### 1. Install Package

```bash
# The package will be available after implementation is complete
npm install @zaob/glean-logger@^1.2.0
```

### 2. Configure Next.js Plugin

Create or update `next.config.js` in your project root:

```javascript
// next.config.js
const { withLogger } = require('@zaob/glean-logger/next-plugin');

module.exports = withLogger({
  // All configuration options go here (optional, see full config below)
});
```

### 3. Configure Environment Variables (Optional)

If you need to override defaults without using the plugin, create `.env.local`:

```env
# Batching
LOGGER_BATCH_MODE=time
LOGGER_BATCH_TIME_MS=3000
LOGGER_BATCH_COUNT=10

# Retry
LOGGER_RETRY_ENABLED=true
LOGGER_RETRY_MAX_RETRIES=3
LOGGER_RETRY_INITIAL_DELAY_MS=1000
LOGGER_RETRY_MAX_DELAY_MS=30000
LOGGER_RETRY_BACKOFF_MULTIPLIER=2

# Transport
LOGGER_TRANSPORT_ENDPOINT=/api/logger

# Log Directory (same as server-side logs)
LOG_DIR=./_logs
```

---

## Quick Start Options

### Option 1: Development Setup (Default)

**Configuration**:

```javascript
module.exports = withLogger();
```

**Behavior**:

- Batching: Time mode (send every 3 seconds)
- Retry: Enabled (3 retries with exponential backoff)
- API Route: Auto-copied to `.next/server/api/logger/`
- React Integration: Optional (add LoggerErrorBoundary manually)

**Use When**: You want to start quickly with minimal setup.

---

### Option 2: Production-Optimized Setup

**Configuration**:

```javascript
module.exports = withLogger({
  batchingMode: 'time',
  batchingTimeMs: 10000, // 10 seconds - reduces network overhead
  retryEnabled: true,
  retryMaxRetries: 3,
  logDir: './_logs',
});
```

**Behavior**:

- Batching: Time mode with 10-second interval
- Retry: Enabled for production reliability
- API Route: Auto-copied
- Log Directory: Explicitly set to `./_logs`

**Use When**: You're deploying to production and want to optimize for high-traffic scenarios.

---

### Option 3: Debug Mode (Immediate Logging)

**Configuration**:

```javascript
module.exports = withLogger({
  batchingMode: 'immediate', // No batching - send immediately
  retryEnabled: true,
});
```

**Behavior**:

- Batching: Immediate mode (send logs as soon as they're created)
- Retry: Enabled (still retries failed sends)
- API Route: Auto-copied

**Use When**: You're debugging an issue and need real-time log visibility.

---

### Option 4: Manual Setup (No Plugin)

If you prefer not to use the Next.js plugin, you can manually set up the API route:

```bash
# 1. Create API route directory
mkdir -p src/app/api/logger

# 2. Copy API route handler from package
cp node_modules/@zaob/glean-logger/dist/api/route.ts src/app/api/logger/route.ts

# 3. Configure environment variables (optional)
# Add to .env.local or .env
LOG_DIR=./_logs
```

Then configure the plugin to skip auto-setup:

```javascript
// next.config.js
module.exports = withLogger({
  apiRoute: false, // Disable auto-setup
  logDir: './_logs',
});
```

**Use When**: You want full control over the API route or need to customize it beyond what the plugin provides.

---

## Usage Examples

### Basic Browser Logging

```typescript
// src/app/page.tsx
'use client';

import { logger } from '@zaob/glean-logger';

export default function HomePage() {
  const handleClick = () => {
    logger.info('Button clicked', { buttonId: 'submit' });
    // Log is sent to:
    // 1. Browser console
    // 2. Browser localStorage (as fallback)
    // 3. Server API (via POST /api/logger, batched)
    // 4. Server file (_logs/browser.YYYY-MM-DD.log)
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### React Error Boundary

```typescript
// src/app/layout.tsx
'use client';

import { LoggerErrorBoundary } from '@zaob/glean-logger/react';

export default function RootLayout({ children }) {
  return (
    <LoggerErrorBoundary fallback={<ErrorComponent />}>
      {children}
    </LoggerErrorBoundary>
  );
}

// src/components/ErrorComponent.tsx
function ErrorComponent({ error, resetErrorBoundary }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error?.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
```

### Server-Side Logging (Unchanged)

Server-side logging continues to work exactly as before:

```typescript
import { logger } from '@zaob/glean-logger/server';

const log = logger({ name: 'api' });
log.info('Request received');
// Writes to: _logs/api.YYYY-MM-DD.log (existing behavior)
```

---

## Configuration Reference

### Plugin Options

| Option                 | Type    | Default      | Description                              |
| ---------------------- | ------- | ------------ | ---------------------------------------- | ------- | ----------- |
| apiRoute               | boolean | true         | Enable/disable automatic API route setup |
| apiRoutePath           | string  | 'api/logger' | Custom path for API route                |
| reactProvider          | boolean | true         | Enable/disable React Provider            |
| logDir                 | string  | './\_logs'   | Directory for log files                  |
| batchingMode           | enum    | 'time'       | Batching mode: 'time'                    | 'count' | 'immediate' |
| batchingTimeMs         | number  | 3000         | Batching interval (time mode only)       |
| batchingCount          | number  | 10           | Batch size threshold (count mode only)   |
| retryEnabled           | boolean | true         | Enable/disable retry logic               |
| retryMaxRetries        | number  | 3            | Maximum retry attempts                   |
| retryInitialDelayMs    | number  | 1000         | Delay before first retry (ms)            |
| retryMaxDelayMs        | number  | 30000        | Maximum delay between retries (ms)       |
| retryBackoffMultiplier | number  | 2            | Exponential backoff multiplier           |

### Environment Variables

| Variable                        | Default     | Description                          |
| ------------------------------- | ----------- | ------------------------------------ |
| LOGGER_BATCH_MODE               | time        | Batching mode (time/count/immediate) |
| LOGGER_BATCH_TIME_MS            | 3000        | Batching interval in ms (time mode)  |
| LOGGER_BATCH_COUNT              | 10          | Batch size threshold (count mode)    |
| LOGGER_RETRY_ENABLED            | true        | Enable retry logic                   |
| LOGGER_RETRY_MAX_RETRIES        | 3           | Maximum retry attempts               |
| LOGGER_RETRY_INITIAL_DELAY_MS   | 1000        | Initial retry delay (ms)             |
| LOGGER_RETRY_MAX_DELAY_MS       | 30000       | Maximum retry delay (ms)             |
| LOGGER_RETRY_BACKOFF_MULTIPLIER | 2           | Exponential backoff multiplier       |
| LOGGER_TRANSPORT_ENDPOINT       | /api/logger | API endpoint path                    |
| LOG_DIR                         | ./\_logs    | Log directory path                   |

---

## Verification

### 1. Check API Route Exists

```bash
# After starting Next.js dev server
curl -X POST http://localhost:3000/api/logger \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"id":"test-id","timestamp":1,"level":"info","message":"Test log","source":"console"}]}'

# Expected response: {"success":true,"count":1}
```

### 2. Check Logs Are Written

```bash
# Wait for batching interval (default 3 seconds)
tail -f ./_logs/browser.$(date +%Y-%m-%d).log
```

**Expected Output**:

```json
{
  "@timestamp": "2026-01-17T10:30:00.000Z",
  "level": "INFO",
  "message": "Test log",
  "source": "console",
  "id": "test-id",
  "timestamp": 1
}
```

### 3. Check Batching Behavior

Open browser DevTools (F12) → Network tab. Generate multiple log entries quickly. You should see:

- With default time mode: Single POST request after 3 seconds with all entries
- With immediate mode: Multiple POST requests (one per log entry)
- With count mode 10: Single POST request after 10th entry

---

## Troubleshooting

### Logs Not Appearing in Server

**Problem**: Logs appear in browser console but not in `_logs/` folder.

**Possible Causes**:

1. API route not found - Check if plugin copied route correctly
2. Network errors - Check browser DevTools Network tab for failed requests
3. File permissions - Check if `_logs` directory is writable
4. Batching still waiting - Logs may be buffered (wait for configured interval)

**Solutions**:

1. Verify plugin is added to `next.config.js`
2. Check Next.js server logs for route registration: `[glean-logger] API route copied`
3. Verify `curl` to `/api/logger` works from terminal
4. Check browser DevTools Network tab for 4xx/5xx responses

---

### High Memory Usage

**Problem**: Browser's localStorage is full or quota exceeded.

**Symptoms**:

- Console warning: `[BrowserLogger] localStorage unavailable or quota exceeded`
- Logs are being sent to server but not saved locally

**Solution**:

1. Reduce `maxEntries` in browser logger (currently fixed at 100)
2. Check localStorage size with: `localStorage.getItem('glean_api_logs')?.length`
3. Clear old logs from browser devTools → Application → Local Storage

---

### API Route Conflicts

**Problem**: You already have an `/api/logger` route in your Next.js app.

**Solutions**:

1. Disable plugin's auto-setup:
   ```javascript
   module.exports = withLogger({ apiRoute: false });
   ```
2. Set `apiRoutePath` to a custom path:
   ```javascript
   module.exports = withLogger({ apiRoutePath: 'api/custom-logger' });
   ```
3. Manually copy and customize the route handler from package:
   ```bash
   cp node_modules/@zaob/glean-logger/dist/api/route.ts src/app/api/custom-logger/route.ts
   ```

---

## Next Steps

After completing the quick start:

1. **Read full documentation**: See `GUIDES.md` for detailed configuration options
2. **Explore features**: Try different batching modes (time, count, immediate)
3. **Add React Error Boundary**: Protect your app from unhandled errors
4. **Test production deployment**: Verify logs are written to `_logs/` in production
5. **Configure monitoring**: Set up log rotation and retention policies

---

## Support

If you encounter issues or have questions:

1. Check the spec: `specs/001-browser-log-sync/spec.md`
2. Review the implementation plan: `specs/001-browser-log-sync/plan.md`
3. Check GitHub issues: https://github.com/maemreyo/glean-logger/issues
