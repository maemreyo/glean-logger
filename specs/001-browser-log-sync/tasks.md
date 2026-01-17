# Implementation Tasks: Client-to-Server Logging with Next.js Plugin

**Feature Branch**: `001-browser-log-sync`
**Feature Spec**: [spec.md](./spec.md)
**Implementation Plan**: [plan.md](./plan.md)
**Created**: 2026-01-17

---

## Task Overview

| Phase       | Tasks     | Estimated Time |
| ----------- | --------- | -------------- |
| Setup       | T001-T002 | 30 minutes     |
| Core        | T003-T008 | 3 hours        |
| Integration | T009-T010 | 1.5 hours      |
| Polish      | T011      | 1 hour         |
| **Total**   |           | **~6 hours**   |

---

## Phase 1: Setup

### T001: Add TypeScript Types

**File**: `src/types.ts`
**Priority**: P1 (Foundation - all other tasks depend on types)
**Effort**: 30 minutes

**Description**: Add new interfaces for client-to-server functionality.

**Subtasks**:

- [ ] Add `BatchingConfig` interface
- [ ] Add `RetryConfig` interface
- [ ] Add `TransportConfig` interface
- [ ] Add `ClientLogEntry` interface
- [ ] Export all new interfaces

**Success Criteria**:

- All interfaces defined with proper TypeScript types
- Default values specified in interface comments
- Interfaces are exported from src/types.ts

**Dependencies**: None

---

### T002: Extend Configuration

**File**: `src/config.ts`
**Priority**: P1
**Effort**: 30 minutes

**Description**: Add environment variables and default values for batching and retry.

**Subtasks**:

- [ ] Add batching config to DEFAULT_CONFIG
- [ ] Add retry config to DEFAULT_CONFIG
- [ ] Add transport endpoint to DEFAULT_CONFIG
- [ ] Add env var parsing to getConfig()
- [ ] Add helper functions for parsing

**Success Criteria**:

- All env vars read with proper defaults
- Invalid env vars fall back to defaults with console warning
- Configuration functions return proper TypeScript types

**Dependencies**: T001 (types)

---

## Phase 2: Core

### T003: Implement Client Transport

**File**: `src/client-transport.ts`
**Priority**: P1 (Core feature - most important)
**Effort**: 1 hour

**Description**: Core logic for buffering, batching, retry, and sending logs to server.

**Subtasks**:

- [ ] Create ClientTransport class with buffer, timer, sending flag, config
- [ ] Implement constructor with lazy initialization
- [ ] Implement send(entry) method
- [ ] Implement flush() method
- [ ] Implement sendWithRetry() with exponential backoff
- [ ] Implement doSend() using fetch API
- [ ] Implement calculateBackoff() helper
- [ ] Implement startBatchTimer() helper
- [ ] Implement destroy() method

**Success Criteria**:

- Batching works correctly for all 3 modes (time/count/immediate)
- Retry logic follows exponential backoff pattern
- Network failures don't cause data loss (logs buffered)
- Unit tests cover all retry paths

**Dependencies**: T001 (types), T002 (config)

---

### T004: Integrate Transport into Browser Logger

**File**: `src/browser.ts`
**Priority**: P1
**Effort**: 30 minutes

**Description**: Connect browser logger to client transport.

**Subtasks**:

- [ ] Import ClientTransport from './client-transport'
- [ ] Add private transport instance variable (singleton)
- [ ] Create getTransport() helper with lazy initialization
- [ ] Modify log() method to call transport.send()
- [ ] Update flush() method to use transport.flush()

**Success Criteria**:

- Browser logs are sent to transport after localStorage
- Transport is lazy-initialized (no overhead if unused)
- Existing functionality (console, localStorage) preserved

**Dependencies**: T003 (client transport)

---

### T005: Create API Route Handler

**File**: `src/api/route.ts`
**Priority**: P1
**Effort**: 30 minutes

**Description**: Next.js API route to receive and persist browser logs.

**Subtasks**:

- [ ] Import Next.js types (NextRequest, NextResponse)
- [ ] Import fs/promises for file operations
- [ ] Implement POST handler with request validation
- [ ] Implement log directory creation
- [ ] Implement log file formatting and writing
- [ ] Add error handling (400, 500 responses)

**Success Criteria**:

- POST /api/logger accepts log arrays
- Logs written to \_logs/browser.YYYY-MM-DD.log
- Invalid payloads return 400 status
- Write errors return 500 status

**Dependencies**: T001 (types)

---

### T006: React Integration

**File**: `src/react.tsx`
**Priority**: P2
**Effort**: 30 minutes

**Description**: React ErrorBoundary and hooks for automatic error logging.

**Subtasks**:

- [ ] Create LoggerErrorBoundary component with componentDidCatch
- [ ] Create useLogger() hook
- [ ] Create LoggerProvider component

**Success Criteria**:

- LoggerErrorBoundary catches rendering errors
- Errors are logged and sent to server
- Fallback UI can be customized
- useLogger() hook provides simple access

**Dependencies**: T003 (client transport)

---

### T007: Console and Error Interceptors

**File**: `src/interceptors.ts`
**Priority**: P2
**Effort**: 30 minutes

**Description**: Auto-capture console.log and global errors.

**Subtasks**:

- [ ] Intercept console.log with wrapper
- [ ] Intercept console.error with wrapper
- [ ] Intercept console.warn with wrapper
- [ ] Capture window.onerror events
- [ ] Capture unhandledrejection events

**Success Criteria**:

- All console methods logged and sent to server
- window.onerror captures JavaScript errors
- Original console behavior preserved

**Dependencies**: T003 (client transport)

---

### T008: Next.js Plugin

**File**: `src/next-plugin.ts`
**Priority**: P1
**Effort**: 1 hour

**Description**: Automatic setup of API route and configuration.

**Subtasks**:

- [ ] Define LoggerPluginOptions interface
- [ ] Implement withLogger(options) function
- [ ] Add env vars injection to Next.js.env
- [ ] Implement webpack plugin for route copying
- [ ] Add server-only build check

**Success Criteria**:

- Plugin works with default options (no config required)
- All options injected as public env vars
- API route copied to .next/server on build
- Plugin doesn't break existing webpack config

**Dependencies**: T002 (config), T005 (API route)

---

## Phase 3: Integration

### T009: Add Tests

**Files**: `src/test/client-transport.test.ts`, `src/test/api-route.test.ts`
**Priority**: P1
**Effort**: 1 hour

**Description**: Unit and integration tests for new functionality.

**Subtasks**:

- [ ] Write client transport tests (batching, retry, backoff)
- [ ] Write API route tests (validation, file write, errors)
- [ ] Write integration tests (end-to-end flow)
- [ ] Verify existing tests still pass

**Success Criteria**:

- All tests pass with npm run test
- Coverage report shows >80% for new code
- No existing tests broken

**Dependencies**: T003 (client transport), T005 (API route)

---

### T010: Update Package Configuration

**File**: `package.json`
**Priority**: P2
**Effort**: 30 minutes

**Description**: Bump version and add exports.

**Subtasks**:

- [ ] Bump version from "1.1.1" to "1.2.0"
- [ ] Add next-plugin export to package.json
- [ ] Update keywords array

**Success Criteria**:

- Version follows semantic versioning
- New export properly configured with types
- Keywords are relevant and searchable

**Dependencies**: None

---

## Phase 4: Polish

### T011: Update Documentation

**Files**: `README.md`, `GUIDES.md`, `AGENTS.md`, `CHANGELOG.md`
**Priority**: P2
**Effort**: 1 hour

**Description**: User and AI assistant guides.

**Subtasks**:

- [ ] Update README.md with new features section
- [ ] Create GUIDES.md with setup and configuration
- [ ] Create AGENTS.md with quick reference
- [ ] Update CHANGELOG.md with v1.2.0 entry

**Success Criteria**:

- README has clear Next.js setup section
- GUIDES.md covers all user workflows
- AGENTS.md provides comprehensive context
- CHANGELOG documents v1.2.0 changes

**Dependencies**: All tasks completed

---

## Execution Order

```text
T001 (Types) ──┬──> T003 (Client Transport) ──┬──> T004 (Browser Integration)
T002 (Config) ─┘    │                          │
                    ├──> T005 (API Route) ───> T008 (Next.js Plugin)
                    │
                    ├──> T006 (React) ────────> T009 (Tests)
                    ├──> T007 (Interceptors) ─┘
                    │
                    └──> T010 (Package Config)
                              │
                              ▼
                    T011 (Documentation) [Final]
```

---

## Parallel Execution

Tasks marked with [P] can run in parallel:

- T001, T002 (Setup phase) - independent
- T006, T007 (after T003) - both depend on client transport
- T010, T011 (final phase) - can run after core tasks

---

## Status Summary

| Task | Status      | Phase       |
| ---- | ----------- | ----------- |
| T001 | [ ] Pending | Setup       |
| T002 | [ ] Pending | Setup       |
| T003 | [ ] Pending | Core        |
| T004 | [ ] Pending | Core        |
| T005 | [ ] Pending | Core        |
| T006 | [ ] Pending | Core        |
| T007 | [ ] Pending | Core        |
| T008 | [ ] Pending | Core        |
| T009 | [ ] Pending | Integration |
| T010 | [ ] Pending | Integration |
| T011 | [ ] Pending | Polish      |

**Total**: 11 tasks
