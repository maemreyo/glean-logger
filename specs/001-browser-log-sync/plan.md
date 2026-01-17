# Implementation Plan: Client-to-Server Logging with Next.js Plugin

**Branch**: `001-browser-log-sync`
**Date**: 2026-01-17
**Spec**: [spec.md](./spec.md)

## Summary

Extend @zaob/glean-logger to synchronize browser-side logs to server's file system via REST API, with intelligent batching, retry logic, React integration, and Next.js plugin for automatic setup. This feature enables developers to have centralized logging across client and server without manual configuration overhead.

---

## Technical Context

**Language/Version**: TypeScript 5.9+
**Primary Dependencies**: Next.js (peerDependency, optional for plugin), winston (peerDependency), winston-daily-rotate-file (peerDependency)
**Storage**: File system (write to `_logs/browser.YYYY-MM-DD.log`)
**Testing**: Vitest (existing setup with @vitest/coverage-v8)
**Project Type**: Single NPM package (library), NOT a Next.js application
**Target Platform**: Next.js App Router (src/app directory structure) - Pages Router support in future iteration
**Performance Goals**: Handle 1000+ batched logs per minute with <50ms client-side overhead, support 3 retry attempts with exponential backoff

---

## Constitution Check

### Gates

| Gate                    | Status  | Notes                                                      |
| ----------------------- | ------- | ---------------------------------------------------------- |
| Single package scope    | ✅ PASS | Feature extends existing @zaob/glean-logger package        |
| No breaking changes     | ✅ PASS | All changes are additive, existing functionality preserved |
| TypeScript types        | ✅ PASS | Full type safety for all new interfaces                    |
| Backwards compatibility | ✅ PASS | New features are opt-in via plugin                         |
| No new external deps    | ✅ PASS | Uses existing winston peerDependency                       |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-browser-log-sync/
├── plan.md              # This file (/zo.plan command output)
├── research.md          # Phase 0 output (created below)
├── data-model.md        # Phase 1 output (created below)
├── quickstart.md        # Phase 1 output (created below)
├── contracts/           # Phase 1 output (API schemas)
└── tasks.md            # Phase 2 output (/zo.tasks command)
```

### Source Code (repository root)

```text
# Modified Files
src/
├── browser.ts              # Add client-transport injection
├── types.ts               # Add ClientLogEntry, BatchingConfig, RetryConfig, TransportConfig
├── config.ts              # Add batching/retry configuration
├── winston.config.ts       # Existing (no changes needed)
└── server.ts              # Existing (no changes needed)

# New Files
src/
├── client-transport.ts    # Core batching + retry + fetch logic
├── api/
│   └── route.ts         # Next.js API route handler
├── react.tsx             # React ErrorBoundary + hooks + Provider
├── interceptors.ts       # console.log + window.onerror wrappers
├── next-plugin.ts        # Next.js plugin for automatic setup
└── test/
    ├── client-transport.test.ts
    ├── api-route.test.ts
    └── integration.test.ts

# Documentation
GUIDES.md               # User guide for setup and configuration
AGENTS.md               # AI assistant guide for codebase navigation
README.md               # Update with new features + Next.js section
CHANGELOG.md            # Document v1.2.0 release
package.json             # Bump version to 1.2.0, add next-plugin export
```

### Structure Decision

**Selected Structure**: Single-package extension (monorepo not needed)

**Rationale**:

- @zaob/glean-logger is already a standalone NPM package
- Client-to-server logging is a feature ADDITION, not a separate product
- Keeping everything in one package reduces:
  - Release overhead (single npm publish)
  - Version coordination (all features in sync)
  - Development friction (single install)
  - Testing complexity (single test suite)
- Next.js plugin is an optional enhancement that auto-configures when used
- Users who don't use Next.js can still use the package manually

---

## Complexity Tracking

| Task                           | Estimated Complexity | Notes                                              |
| ------------------------------ | -------------------- | -------------------------------------------------- |
| Client transport with batching | Medium               | Buffer management + timer + retry state machine    |
| Next.js plugin                 | Medium               | Webpack config + env var injection + route copying |
| API route handler              | Low                  | Simple JSON receive → file write                   |
| React ErrorBoundary            | Low                  | Standard React error catching pattern              |
| Console interceptors           | Low                  | Function wrapping + event listeners                |
| TypeScript types               | Low                  | Adding new interfaces is straightforward           |
| Configuration extension        | Low                  | Adding env vars + defaults is simple               |

**Total Complexity**: Medium (manageable within ~5 hours)

---

## Phase 0: Outline & Research

### Research Tasks

1. **Research**: Browser batching patterns and best practices
   - Find common batching strategies (time-based vs count-based)
   - Research retry with exponential backoff patterns
   - Identify React Error Boundary patterns for logging

2. **Research**: Next.js plugin architecture
   - Understand webpack config modification patterns
   - Research how to inject env vars into client
   - Find examples of API route copying patterns

3. **Research**: Storage patterns for browser logs on server
   - Identify optimal file rotation (reuse existing winston-daily-rotate)
   - Determine log format consistency with server logs
   - Research how to handle concurrent writes from multiple clients

4. **Clarify**: User requirements from spec
   - Resolve any [NEEDS CLARIFICATION] markers (none present in spec)
   - Confirm batching mode defaults and acceptable ranges
   - Validate retry configuration defaults

---

## Phase 1: Design & Contracts

### Data Model

**Entities**:

```typescript
// ClientLogEntry (from spec)
interface ClientLogEntry {
  id: string; // UUID v4
  timestamp: number; // Unix timestamp in ms
  level: LogLevel; // 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string; // Primary log message
  context?: LogContext; // Key-value metadata
  source: 'console' | 'api' | 'error'; // Origin of log entry
}

// BatchingConfig (from spec)
interface BatchingConfig {
  mode: 'time' | 'count' | 'immediate';
  timeIntervalMs: number; // Default: 3000 (3 seconds)
  countThreshold: number; // Default: 10
}

// RetryConfig (from spec)
interface RetryConfig {
  enabled: boolean; // Default: true
  maxRetries: number; // Default: 3
  initialDelayMs: number; // Default: 1000 (1 second)
  maxDelayMs: number; // Default: 30000 (30 seconds)
  backoffMultiplier: number; // Default: 2
}

// TransportConfig (from spec)
interface TransportConfig {
  endpoint: string; // Default: '/api/logger'
  batch: BatchingConfig;
  retry: RetryConfig;
}
```

**State Transitions**:

```
Client Log Generation → Buffer Add → [Batching Mode] → Send → [Retry Logic] → Success/Failure
```

### API Contracts

#### POST /api/logger (Browser Logs)

**Request Schema**:

```typescript
{
  logs: ClientLogEntry[];
}
```

**Response Schema**:

```typescript
{
  success: boolean;
  count: number; // Number of logs written
}
```

**Error Responses**:

- `400 Bad Request`: Invalid payload (not an array or empty)
- `500 Internal Error`: File system write failure
- `503 Service Unavailable`: Retry after max attempts

**Log File Format** (per entry, JSON lines):

```json
{
  "@timestamp": "2026-01-17T10:30:00.000Z",
  "level": "INFO",
  "message": "User action",
  "id": "uuid",
  "source": "console",
  "timestamp": 1737138600000
}
```

---

## Phase 2: Implementation Tasks

### Task List

#### Task 1: Add TypeScript Types

**File**: `src/types.ts`
**Effort**: Low (30 minutes)
**Description**: Add new interfaces for client-to-server functionality

**Subtasks**:

1. Add `BatchingConfig` interface with mode, timeIntervalMs, countThreshold fields
2. Add `RetryConfig` interface with enabled, maxRetries, initialDelayMs, maxDelayMs, backoffMultiplier fields
3. Add `TransportConfig` interface with endpoint, batch, retry fields
4. Add `ClientLogEntry` interface extending existing `BrowserLogEntry` with `source` field
5. Export all new interfaces

**Success Criteria**:

- All interfaces defined with proper TypeScript types
- Default values specified in interface comments
- Interfaces are exported from src/types.ts

---

#### Task 2: Extend Configuration

**File**: `src/config.ts`
**Effort**: Low (30 minutes)
**Description**: Add environment variables and default values for batching and retry

**Subtasks**:

1. Add to DEFAULT_CONFIG:
   - batchingMode: 'time' | 'count' | 'immediate' = 'time'
   - batchingTimeMs: number = 3000
   - batchingCount: number = 10
   - retryEnabled: boolean = true
   - retryMaxRetries: number = 3
   - retryInitialDelayMs: number = 1000
   - retryMaxDelayMs: number = 30000
   - retryBackoffMultiplier: number = 2
   - transportEndpoint: string = '/api/logger'

2. Add to getConfig() function:
   - Read env vars: LOGGER_BATCH_MODE, LOGGER_BATCH_TIME_MS, LOGGER_BATCH_COUNT
   - Read env vars: LOGGER_RETRY_ENABLED, LOGGER_RETRY_MAX_RETRIES
   - Read env var: LOGGER_TRANSPORT_ENDPOINT

3. Add helper functions:
   - parseBatchingMode() for 'time' | 'count' | 'immediate'
   - parseBoolean() for retry flags (reuse existing)
   - parseNumber() for retry counts

**Success Criteria**:

- All env vars read with proper defaults
- Invalid env vars fall back to defaults with console warning
- Configuration functions return proper TypeScript types

---

#### Task 3: Implement Client Transport

**File**: `src/client-transport.ts`
**Effort**: High (1 hour)
**Description**: Core logic for buffering, batching, retry, and sending logs to server

**Subtasks**:

1. Create `ClientTransport` class with:
   - Private buffer array (ClientLogEntry[])
   - Private timer reference (for time-based batching)
   - Private sending flag (prevent concurrent sends)
   - Private config property (TransportConfig)

2. Implement constructor:
   - Accept partial TransportConfig options
   - Merge with default config
   - Initialize buffer as empty array
   - Start batch timer based on mode

3. Implement send(entry) method:
   - Push entry to buffer
   - Check batching mode (time/count/immediate)
   - Trigger flush based on mode rules

4. Implement flush() method:
   - Check if buffer empty or already sending
   - Copy buffer to local variable
   - Clear buffer
   - Call sendWithRetry()

5. Implement sendWithRetry(batch, attempt) method:
   - If retry disabled: call doSend() directly
   - If retry enabled: wrap in try/catch
   - On failure: check attempt count vs maxRetries
   - Calculate backoff delay: initialDelayMs \* (backoffMultiplier ^ (attempt-1))
   - Cap delay at maxDelayMs
   - Recursively retry until max attempts or success

6. Implement doSend(batch) method:
   - Use fetch API to POST to endpoint
   - Send logs as JSON: { logs: batch }
   - Check response.ok
   - Throw error on non-ok responses

7. Implement calculateBackoff(attempt) helper:
   - Exponential backoff formula
   - Apply max delay cap

8. Implement startBatchTimer() helper:
   - Use setTimeout based on timeIntervalMs
   - Store timer reference for cleanup

9. Implement destroy() method:
   - Clear batch timer
   - Final flush to send pending logs

**Success Criteria**:

- Batching works correctly for all 3 modes
- Retry logic follows exponential backoff pattern
- Network failures don't cause data loss (logs buffered)
- Unit tests cover all retry paths (success, failure, max retries)

---

#### Task 4: Create API Route Handler

**File**: `src/api/route.ts`
**Effort**: Medium (30 minutes)
**Description**: Next.js API route to receive and persist browser logs

**Subtasks**:

1. Import Next.js types:
   - `NextRequest` for request handling
   - `NextResponse` for response building
   - `fs/promises` for file operations

2. Implement POST handler:
   - Parse request body: { logs: ClientLogEntry[] }
   - Validate: logs is array and not empty (return 400 on failure)
   - Get log directory from env: LOG_DIR or default './\_logs'
   - Generate filename: browser.YYYY-MM-DD.log

3. Create log directory if needed:
   - Use fs.mkdir with recursive: true
   - Handle existing directory gracefully

4. Format and write logs:
   - Add @timestamp field (ISO 8601 from Unix timestamp)
   - Add source: 'browser' field to each entry
   - Write one JSON per line (append mode)
   - Join entries with '\n' + trailing '\n'

5. Error handling:
   - Wrap in try/catch
   - Log errors to server console
   - Return 500 Internal Error on failure
   - Return 200 OK with { success: true, count: N }

**Success Criteria**:

- POST /api/logger accepts log arrays
- Logs written to \_logs/browser.YYYY-MM-DD.log
- Invalid payloads return 400 status
- Write errors return 500 status
- File format matches server logs (JSON per line)

---

#### Task 5: React Integration

**File**: `src/react.tsx`
**Effort**: Medium (30 minutes)
**Description**: React ErrorBoundary and hooks for automatic error logging

**Subtasks**:

1. Create LoggerErrorBoundary component:
   - Extends React.Component
   - Implements componentDidCatch(error, info)
   - Calls logger.error() with error details
   - Renders fallback UI (props.fallback)

2. Create useLogger() hook:
   - Return logger singleton
   - No parameters needed (simple convenience)

3. Create LoggerProvider component:
   - Calls useEffect() to setup interceptors on mount
   - Returns children
   - Calls useEffect() cleanup: flush transport on unmount

**Success Criteria**:

- LoggerErrorBoundary catches rendering errors
- Errors are logged and sent to server
- Fallback UI can be customized
- useLogger() hook provides simple access
- LoggerProvider ensures cleanup on unmount

---

#### Task 6: Console and Error Interceptors

**File**: `src/interceptors.ts`
**Effort**: Low (30 minutes)
**Description**: Auto-capture console.log and global errors

**Subtasks**:

1. Intercept console.log:
   - Store original console.log reference
   - Create wrapper that:
     - Calls original console.log()
     - Extracts message and args
     - Calls logger.info() with extracted data

2. Intercept console.error, console.warn:
   - Similar pattern to console.log
   - Use logger.error() / logger.warn()

3. Capture window.onerror:
   - Add event listener for global JavaScript errors
   - Log error message, URL, line, column, stack
   - Return false to allow default error handling

4. Capture unhandledrejection (optional):
   - Add event listener for unhandled Promise rejections
   - Log reason with logger.error()

**Success Criteria**:

- All console methods logged and sent to server
- window.onerror captures JavaScript errors
- Unhandled rejections logged
- Original console behavior preserved

---

#### Task 7: Next.js Plugin

**File**: `src/next-plugin.ts`
**Effort**: Medium (1 hour)
**Description**: Automatic setup of API route and configuration

**Subtasks**:

1. Define LoggerPluginOptions interface:
   - apiRoute: boolean (default true)
   - apiRoutePath: string (default 'api/logger')
   - reactProvider: boolean (default true)
   - logDir, batchingMode, batchingTimeMs, batchingCount
   - retryEnabled, retryMaxRetries

2. Implement withLogger(options) function:
   - Return NextConfigFn that wraps user's config
   - Validate options and set defaults
   - Return function that Next.js accepts

3. Configure Next.js via returned function:
   - Add env vars to Next.js.env:
     - LOGGER_BATCH_MODE
     - LOGGER_BATCH_TIME_MS
     - LOGGER_BATCH_COUNT
     - LOGGER_RETRY_ENABLED
     - LOGGER_RETRY_MAX_RETRIES
     - LOG_DIR
   - Extend nextConfig.webpack (if function, call after)

4. Copy API route via webpack:
   - Use config.plugins.push()
   - Apply in server build only (isServer check)
   - Copy src/api/route.ts to .next/server/api/logger/route.ts
   - Ensure directory exists with fs-extra.ensureDirSync()

**Success Criteria**:

- Plugin works with default options (no config required)
- All options are injected as public env vars
- API route copied to .next/server on build
- Plugin doesn't break existing webpack config

---

#### Task 8: Integrate Client Transport into Browser Logger

**File**: `src/browser.ts`
**Effort**: Low (30 minutes)
**Description**: Connect browser logger to client transport

**Subtasks**:

1. Import ClientTransport from './client-transport'
2. Add private transport instance variable (singleton pattern)
3. Create getTransport() helper function:
   - Lazy initialization on first call
   - Return existing instance if already created

4. Modify log() method:
   - After persistEntry() call to localStorage
   - Call getTransport().send(entry) if browser environment

5. Implement flush() method on BrowserLoggerImpl:
   - Change from console.log stub to: getTransport()?.flush()
   - Add await keyword

**Success Criteria**:

- Browser logs are sent to transport after localStorage
- Transport is lazy-initialized (no overhead if unused)
- Existing functionality (console, localStorage) preserved

---

#### Task 9: Add Tests

**Files**: `src/test/client-transport.test.ts`, `src/test/api-route.test.ts`
**Effort**: High (1 hour)
**Description**: Unit and integration tests for new functionality

**Subtasks**:

1. Client transport tests:
   - Test batching modes (time, count, immediate)
   - Test retry logic (success, failure, max retries)
   - Test backoff calculation
   - Test concurrent flush prevention

2. API route tests:
   - Mock NextRequest/NextResponse
   - Test valid log batch (returns 200)
   - Test invalid payload (returns 400)
   - Test file write failures (returns 500)
   - Test log directory creation

3. Integration tests (mock fetch):
   - End-to-end: browser logger → transport → API → file
   - Test offline scenario (retry until timeout)
   - Test network failure recovery

**Success Criteria**:

- All tests pass with npm run test
- Coverage report shows >80% for new code
- No existing tests broken

---

#### Task 10: Update Documentation

**Files**: `README.md`, `GUIDES.md`, `AGENTS.md`
**Effort**: High (1 hour)
**Description**: User and AI assistant guides

**Subtasks**:

1. Update README.md:
   - Add "🚀 New in v1.2: Client-to-Server Logging" section
   - Document Next.js plugin setup (1-line config)
   - Add configuration table for env vars
   - Add React ErrorBoundary usage example
   - Update API reference table with new exports

2. Create GUIDES.md:
   - Quick setup guide (install, configure, use)
   - Configuration options (batching, retry, transport)
   - Troubleshooting section
   - Advanced configuration examples

3. Create AGENTS.md:
   - Quick reference card for AI assistants
   - Key files table (browser.ts, client-transport.ts, api/route.ts, react.tsx, next-plugin.ts)
   - Adding new features guide
   - Testing guide
   - Building and release process

4. Update CHANGELOG.md:
   - Add v1.2.0 release entry
   - Document new features:
     - Client-to-server log sync
     - Next.js plugin for automatic setup
     - Batching modes (time, count, immediate)
     - Retry with exponential backoff
     - React Error Boundary integration
     - Console interceptors
   - List breaking changes (none, fully additive)

**Success Criteria**:

- README has clear Next.js setup section
- GUIDES.md covers all user workflows
- AGENTS.md provides comprehensive context
- CHANGELOG documents v1.2.0 changes

---

#### Task 11: Update Package Configuration

**File**: `package.json`
**Effort**: Low (30 minutes)
**Description**: Bump version and add exports

**Subtasks**:

1. Bump version: "1.1.1" → "1.2.0"
2. Add next-plugin export:
   ```json
   "exports": {
     "./next-plugin": {
       "types": "./dist/next-plugin.d.ts",
       "import": "./dist/next-plugin.mjs",
       "require": "./dist/next-plugin.js"
     }
   }
   ```
3. Update keywords array:
   - Add "nextjs", "react", "batching", "retry"

**Success Criteria**:

- Version follows semantic versioning (minor version bump)
- New export is properly configured with types
- Keywords are relevant and searchable

---

## Execution Order

1. ✅ Task 1: Types
2. ✅ Task 2: Configuration
3. ✅ Task 3: Client Transport
4. ✅ Task 8: Integrate Transport into Browser Logger (can run in parallel)
5. ✅ Task 4: API Route (depends on Types)
6. ✅ Task 5: React Integration
7. ✅ Task 6: Interceptors
8. ✅ Task 9: Tests (depends on Tasks 1-8)
9. ✅ Task 7: Next.js Plugin
10. ✅ Task 10: Documentation
11. ✅ Task 11: Package Config (final step)

---

## Risk Assessment

| Risk                                | Impact | Mitigation                                                 |
| ----------------------------------- | ------ | ---------------------------------------------------------- |
| API route conflicts                 | Medium | Users can manually copy route and set apiRoute: false      |
| localStorage quota issues           | Low    | Graceful degradation with console warning                  |
| Network failures causing log loss   | Low    | Retry + localStorage fallback prevents data loss           |
| Breaking changes to existing logger | Low    | All changes are additive; existing functionality preserved |
| Next.js version compatibility       | Medium | Test on Next.js 13+; support for 12 in future              |
| Webpack config conflicts            | Low    | Proper wrapping of existing webpack config                 |

---

## Total Estimated Effort

| Phase                         | Estimated Time | Running Total  |
| ----------------------------- | -------------- | -------------- |
| Phase 0: Outline & Research   | 0.5 hours      | 0.5 hours      |
| Phase 1: Design & Contracts   | 0.5 hours      | 1.0 hours      |
| Phase 2: Implementation Tasks | 5.0 hours      | 6.0 hours      |
| **Total**                     |                | **~6.5 hours** |

---

## Notes

- All implementations preserve existing functionality (no breaking changes)
- Next.js plugin is opt-in - existing behavior unchanged if plugin not used
- Default configuration optimized for development use (3-second batching)
- Production deployment can use longer batching intervals for reduced network overhead
- React Error Boundary is optional - not required for core functionality
