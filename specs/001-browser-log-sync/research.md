# Phase 0: Research & Clarifications

**Feature**: Client-to-Server Logging with Next.js Plugin
**Status**: Complete
**Date**: 2026-01-17

---

## Research Tasks

### 1. Browser Batching Patterns and Best Practices

**Decision**: Use hybrid approach with configurable modes

**Rationale**:

- Time-based batching reduces network overhead for high-volume logging (common in production)
- Count-based batching ensures immediate send for critical batch sizes
- Immediate mode provides real-time logging for debugging
- Defaulting to 'time' with 3-second interval balances performance with reasonable latency

**Alternatives Considered**:
| Strategy | Pros | Cons | Decision |
| --------- | ----- | ------ | --------- |
| Always immediate (no batching) | Lowest latency, real-time logs | High network overhead, poor performance at scale | Not chosen |
| Always batch (no time/count options) | Best performance | Too complex for users, inflexible defaults | Not chosen |
| Web Worker batching | True async, no UI blocking | Increased complexity, requires worker file | Not chosen |
| Beacon API (navigator.sendBeacon) | Fire-and-forget, works on page unload | Limited browser support, no retry logic | Not chosen |
| Selected: Configurable hybrid | Best balance, flexible | Slightly more complex | ✅ Chosen |

**Best Practices Applied**:

- Maximum buffer size: 100 entries (localStorage quota safety)
- Flush on page visibility change (beforeunload event)
- Exponential backoff for retry (1s → 2s → 4s, max 30s)
- Client-side timestamp (Unix ms) converted to ISO 8601 on server
- Separate log files: `browser.YYYY-MM-DD.log` (distinct from server logs)

---

### 2. Next.js Plugin Architecture

**Decision**: Use Webpack plugin to inject configuration and copy API route

**Rationale**:

- Next.js plugins use webpack config modification (standard pattern)
- API route copied to `.next/server/` (build-time only, not source code)
- Environment variables injected via `nextConfig.env` (public to client-side code)
- Plugin returns a function wrapper (allows composition with other plugins)

**Alternatives Considered**:
| Strategy | Pros | Cons | Decision |
| --------- | ----- | ------ | --------- |
| Middleware-based API route | Runs on every request, easy to understand | Increased latency, complex error handling | Not chosen |
| Custom server for all projects | Centralized logging service | Dev experience penalty (requires external service), version sync issues | Not chosen |
| Runtime route registration | Dynamic, no build dependency | Requires Next.js 13+ specific APIs | Not chosen |
| Selected: Webpack plugin + build-time route copy | Build-time optimization, standard Next.js pattern, good DX | ✅ Chosen |

**Best Practices Applied**:

- Plugin function returns `NextConfigFn` (allows wrapping existing config)
- `isServer` check prevents route copying to client bundle
- Use `fs-extra` for safe directory creation
- Log "[glean-logger] API route copied" to build output

---

### 3. Storage Patterns for Browser Logs on Server

**Decision**: Use existing winston-daily-rotate-file pattern

**Rationale**:

- Reuse existing infrastructure (winston, daily-rotate-file)
- Consistent log format across server and browser logs
- Separate log files avoid mixed streams (browser.YYYY-MM-DD.log vs api.YYYY-MM-DD.log)
- No new dependencies (winston already a peerDependency)

**Alternatives Considered**:
| Strategy | Pros | Cons | Decision |
| --------- | ----- | ------ | --------- |
| Write directly to same file as server logs | Single log file | Mixed sources hard to distinguish | Not chosen |
| Database storage | Queryable, scalable | External dependency, complexity | Not chosen |
| Log aggregation service | Centralized, powerful | External service cost, dev experience penalty | Not chosen |
| Selected: Separate browser.YYYY-MM-DD.log | Clean separation, minimal changes | ✅ Chosen |

**Best Practices Applied**:

- Use same directory: `_logs/` (read from LOG_DIR env var)
- Same rotation config: daily by date
- Same file format: JSON per line (matches server logs)
- Add `source: 'browser'` field for filtering

---

### 4. React Error Boundary Patterns

**Decision**: Use class component with componentDidCatch lifecycle

**Rationale**:

- Standard React pattern for error boundaries
- Allows fallback UI customization via props
- Can be opt-in (wrap root component or use manual error handling)
- Works with both class and function components

**Alternatives Considered**:
| Strategy | Pros | Cons | Decision |
| --------- | ----- | ------ | --------- |
| useError hook (React 16+) | Functional, simpler | Limited to errors, misses lifecycle errors | Not chosen |
| Global error handler (window.onerror) | Catches all errors | No React context, hard to test | Not chosen |
| Error boundary + Error logger library | Drop-in replacement | External dependency, larger bundle | Not chosen |
| Selected: Custom class component | Full control, minimal deps, opt-in | ✅ Chosen |

**Best Practices Applied**:

- Call logger.error() in componentDidCatch
- Pass componentStack from info parameter
- Render props.fallback UI (requires React.ReactNode type)
- No blocking of React's error handling (return false)

---

### 5. Console and Error Interceptor Patterns

**Decision**: Wrap native browser APIs with automatic logging

**Rationale**:

- Captures all existing code that uses console.log
- No code changes required by developers
- Preserves original behavior (still outputs to console)
- Adds network transport automatically

**Best Practices Applied**:

- Store original references in variables
- Call original function first, then logger
- Extract message (first arg) and context (remaining args)
- Use window.onerror for JavaScript errors not caught by React
- Use unhandledrejection for Promise errors

---

## Clarifications

**No clarifications needed** - All requirements from spec were clear and unambiguous.

---

## Dependencies Identified

### Existing Dependencies

- **winston**: Peer dependency, used for server logging
- **winston-daily-rotate-file**: Peer dependency, file rotation
- **next**: Runtime peer dependency (optional, for plugin only)
- **react**: Peer dependency (for React ErrorBoundary)

### New Dependencies (None)

- All functionality uses built-in browser APIs (fetch, localStorage, setTimeout, event listeners)
- No new runtime dependencies required for core functionality

---

## Technical Decisions

### Decision 1: TypeScript Configuration Type

**Choice**: All new options added to package.json exports

**Rationale**: TypeScript type definitions allow IDE autocomplete and compile-time checking

### Decision 2: Single Source for Client Transport

**Choice**: Create src/client-transport.ts (not inline in browser.ts)

**Rationale**: Separation of concerns, easier testing, can be reused by other integrations

### Decision 3: API Route in src/ (not dist/)

**Choice**: Source file at src/api/route.ts, included in dist/ build

**Rationale**:

- Users can customize the route (copy and modify source)
- Source is type-checked and linted
- Build output includes compiled version for users who don't customize

---

## Implementation Notes

### Batch Timer Implementation

- Use `setTimeout` for time-based batching
- Store timer reference in class property for cleanup
- Clear previous timer when starting new one

### Retry State Machine

```
Initial → Send → Success (done)
Initial → Send → Fail → Wait 1s → Retry → Success (done)
Initial → Send → Fail → Wait 1s → Retry → Fail → Wait 2s → Retry → Fail → Done (max retries)
```

### Page Unload Handling

- Add `beforeunload` event listener in transport constructor
- Call flush() on beforeunload
- Remove event listener in destroy() method

### Next.js Webpack Plugin

- Use `config.plugins.push()` for webpack configuration
- Apply plugin only on server builds (`isServer === true`)
- Check if plugin exists in config.plugins array (avoid duplicates)

### Log Format Consistency

- Browser logs: `{ "@timestamp": "ISO", "level": "INFO", "message": "...", "source": "browser" }`
- Server logs: `{ "@timestamp": "ISO", "level": "INFO", "message": "...", "module": "..." }`
- Common fields: @timestamp, level, message
- Distinguishing fields: source (browser), module (server)

---

## Risks Mitigated

| Risk                                        | Impact | Mitigation Strategy                                           |
| ------------------------------------------- | ------ | ------------------------------------------------------------- |
| API route conflicts with user's route       | Medium | Users can set apiRoute: false in plugin and copy manually     |
| localStorage quota exceeded                 | Low    | Graceful degradation to console-only, no app crashes          |
| Network failures causing log loss           | Low    | Retry + localStorage fallback (max 100 entries)               |
| Breaking changes to existing browser logger | Low    | All changes are additive, new transport is opt-in             |
| Next.js version compatibility               | Medium | Test on Next.js 13+; support for 12 requires Pages Router API |
