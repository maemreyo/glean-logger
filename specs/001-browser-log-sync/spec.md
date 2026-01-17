# Feature Specification: Client-to-Server Logging with Next.js Plugin

**Feature Branch**: `001-browser-log-sync`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "Extend @zaob/glean-logger to sync browser logs to server via REST API with batching, retry logic, React integration, and Next.js plugin for automatic setup"

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sync Browser Logs to Server (Priority: P1)

**Description**: A developer is building a Next.js application and needs to capture browser-side logs (console.log, errors) and persist them to the server's file system. Currently, browser logs only appear in the browser console and are lost if the page refreshes or the user navigates away. The developer wants these logs automatically sent to the server and written to files, similar to how server-side logs are handled.

**Why this priority**: This is the core feature request. It enables developers to have centralized logging across client and server, which is critical for debugging production issues where browser errors are common.

**Independent Test**: Can be fully tested by installing the package, adding the Next.js plugin, calling logger.info() in a browser component, and verifying that a log entry appears in the \_logs/browser.YYYY-MM-DD.log file on the server.

**Acceptance Scenarios**:

1. **Given** the developer has installed @zaob/glean-logger and configured the Next.js plugin, **When** a user action triggers logger.info('button clicked', { buttonId: 'submit' }), **Then** the log entry appears in the browser console, is persisted to localStorage, and is sent to the server via POST request within the configured batching interval.

2. **Given** the developer has enabled batching in 'time' mode with 3-second interval, **When** 5 log entries are generated over 5 seconds, **Then** all 5 entries are batched together and sent to the server in a single POST request after 3 seconds.

3. **Given** the developer has enabled batching in 'count' mode with threshold of 10, **When** the 10th log entry is generated, **Then** all 10 entries are immediately batched and sent to the server in a single POST request.

---

### User Story 2 - Automatic Next.js Setup (Priority: P1)

**Description**: Currently, to use client-to-server logging, developers must manually copy API route files from the package to their project (e.g., `cp node_modules/@zaob/glean-logger/dist/api/route.ts src/app/api/logger/route.ts`). This is error-prone, easy to forget, and provides poor developer experience. The developer wants to configure the logging system by adding a single line to their next.config.js file and have everything set up automatically.

**Why this priority**: This is critical for adoption. Manual setup increases friction and reduces the likelihood that developers will use the feature. Automatic setup makes the feature "just work" after installation.

**Independent Test**: Can be fully tested by creating a fresh Next.js project, installing the package, adding `withLogger()` to next.config.js with minimal configuration, and verifying that the API route exists and is accessible without any manual file copying.

**Acceptance Scenarios**:

1. **Given** the developer has added `const { withLogger } = require('@zaob/glean-logger/next-plugin')` and `module.exports = withLogger({})` to next.config.js, **When** the Next.js dev server starts, **Then** the `/api/logger` route is automatically available and ready to receive POST requests.

2. **Given** the developer has configured `logDir: './logs'` in the plugin options, **When** the Next.js dev server starts, **Then** the environment variable `LOG_DIR=./logs` is automatically set and used by the API route handler.

3. **Given** the developer has configured `batchingMode: 'time', batchingTimeMs: 5000, retryEnabled: true`, **When** the Next.js app builds, **Then** these configuration values are available as public environment variables to the client-side code.

---

### User Story 3 - Configure Batching Behavior (Priority: P2)

**Description**: Different applications have different needs for when to send logs to the server. Some need real-time logs for debugging (send immediately), some want to reduce network requests by batching (send every 3 seconds or every 10 logs). The developer wants to configure batching behavior through the plugin configuration.

**Why this priority**: Important for flexibility. Default batching works for most cases, but some scenarios (high-traffic apps, debugging critical errors) require different strategies. Configuration allows the feature to adapt to different use cases.

**Independent Test**: Can be fully tested by configuring different batching modes (time, count, immediate), generating log entries, and verifying the batching behavior matches the configuration using browser DevTools Network tab.

**Acceptance Scenarios**:

1. **Given** the developer has configured batchingMode: 'immediate', **When** a log entry is generated, **Then** it is sent to the server in a POST request immediately (no batching delay).

2. **Given** the developer has configured batchingMode: 'time', batchingTimeMs: 5000, **When** log entries are generated at t=0s, t=2s, and t=6s, **Then** entries at t=0s and t=2s are batched and sent at t=5s, and the entry at t=6s starts a new batch.

3. **Given** the developer has configured batchingMode: 'count', batchingCount: 5, **When** 3 log entries are generated, **Then** no POST request is sent; after 2 more entries are generated (total 5), **Then** all 5 entries are batched and sent immediately.

---

### User Story 4 - Retry Failed Requests (Priority: P2)

**Description**: Network requests to the server can fail due to network issues, server restarts, or temporary downtime. When batched logs fail to send, they should not be lost permanently. The system should retry with exponential backoff to handle temporary failures gracefully.

**Why this priority**: Important for reliability. Browser logs often contain critical error information that developers need to debug production issues. Losing logs due to temporary network failures defeats the purpose of client-to-server logging.

**Independent Test**: Can be fully tested by temporarily stopping the Next.js server, generating log entries, and verifying that the client retries with exponential backoff, and then successfully sends the logs when the server restarts.

**Acceptance Scenarios**:

1. **Given** retry is enabled with maxRetries: 3, initialDelayMs: 1000, backoffMultiplier: 2, **When** the first POST request fails, **Then** the system waits 1000ms (1s) and retries.

2. **Given** retry is enabled with maxRetries: 3, **When** the second retry also fails, **Then** the system waits 2000ms (2s) before the third retry.

3. **Given** retry is enabled with maxRetries: 3, **When** all 3 retry attempts fail, **Then** the system stops retrying, logs an error to console, and the batched logs are not persisted further (but remain in localStorage).

---

### User Story 5 - React Error Boundary Integration (Priority: P3)

**Description**: React applications can experience unhandled errors during rendering. The developer wants to automatically capture these errors and send them to the server, without having to manually add error handling to every component.

**Why this priority**: Improves error visibility but is not the primary value proposition. React Error Boundary integration adds convenience but is optional - developers can still use the logger manually if needed.

**Independent Test**: Can be fully tested by wrapping a component with the LoggerErrorBoundary, triggering an error within that component, and verifying that the error is logged and sent to the server.

**Acceptance Scenarios**:

1. **Given** the developer has imported LoggerErrorBoundary and wrapped their root component, **When** an unhandled error occurs during render, **Then** the error message and component stack are captured using logger.error() and sent to the server.

2. **Given** the developer has provided a fallback UI to the ErrorBoundary, **When** an error occurs, **Then** the fallback UI is displayed to the user while the error is logged.

3. **Given** the developer does not wrap their component with ErrorBoundary, **When** an error occurs, **Then** React's default error handling behavior is preserved (no breaking changes).

---

### Edge Cases

- What happens when the browser's localStorage is full or quota exceeded? System should gracefully fail and log a warning to console, but continue sending logs via network requests.
- What happens when the `/api/logger` endpoint returns a 4xx or 5xx error? Retry logic should treat these as failures and attempt retry based on configuration.
- What happens when the client is offline? Log entries should continue to accumulate in localStorage (up to max entries) and be sent when connectivity is restored.
- What happens when a Next.js app doesn't use the plugin? Manual setup should still be possible by copying the API route handler file directly to the project.
- What happens when batching is enabled but the page unloads before the batch is sent? The page's beforeunload event should trigger a final flush to send pending logs.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST capture all browser console.log calls and send them to the server.
- **FR-002**: System MUST capture window.onerror events (JavaScript errors) and send them to the server.
- **FR-003**: System MUST capture unhandled promise rejections and send them to the server.
- **FR-004**: System MUST provide a REST API endpoint (POST /api/logger) that receives an array of log entries.
- **FR-005**: System MUST write received log entries to the server's file system in \_logs/browser.YYYY-MM-DD.log format.
- **FR-006**: System MUST support three batching modes: 'time' (flush every N milliseconds), 'count' (flush after N entries), and 'immediate' (flush immediately).
- **FR-007**: System MUST have default batching mode of 'time' with 3-second interval and 10-entry count threshold.
- **FR-008**: System MUST support configurable batching intervals and thresholds via environment variables or plugin options.
- **FR-009**: System MUST retry failed POST requests with exponential backoff.
- **FR-010**: System MUST have default retry configuration of 3 max retries, 1s initial delay, 2x backoff multiplier, 30s max delay.
- **FR-011**: System MUST support configurable retry parameters via environment variables or plugin options.
- **FR-012**: System MUST provide a Next.js plugin (withLogger) that automatically sets up the API route and configuration.
- **FR-013**: System MUST allow developers to override the plugin's automatic API route setup and copy the file manually if needed.
- **FR-014**: System MUST provide a React ErrorBoundary component that captures rendering errors and logs them.
- **FR-015**: System MUST persist browser logs to localStorage as a fallback (if network fails or offline).
- **FR-016**: System MUST limit localStorage to a maximum number of entries (default 100) to avoid quota issues.
- **FR-017**: System MUST flush pending logs on page unload to avoid data loss.
- **FR-018**: System MUST provide full TypeScript types for all configuration options (batching, retry, transport).
- **FR-019**: System MUST not break existing browser logger functionality (console output, localStorage).

### Key Entities

- **ClientLogEntry**: Represents a log entry generated in the browser. Key attributes: id (UUID), timestamp (Unix ms), level (debug/info/warn/error/fatal), message (string), context (key-value metadata), source (console/api/error).
- **BatchingConfig**: Configuration for batching behavior. Key attributes: mode (time/count/immediate), timeIntervalMs (number, default 3000), countThreshold (number, default 10).
- **RetryConfig**: Configuration for retry behavior. Key attributes: enabled (boolean, default true), maxRetries (number, default 3), initialDelayMs (number, default 1000), maxDelayMs (number, default 30000), backoffMultiplier (number, default 2).
- **TransportConfig**: Combined configuration for client-to-server transport. Key attributes: endpoint (string, default '/api/logger'), batch (BatchingConfig), retry (RetryConfig).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Developers can complete the entire setup (install package, add 1 line to next.config.js, use logger) in under 5 minutes.
- **SC-002**: Browser logs appear in the server's \_logs folder within the configured batching interval (default 3 seconds) after generation.
- **SC-003**: System handles network failures with automatic retry, with 95% success rate for temporary outages (simulated).
- **SC-004**: Developers who prefer manual setup can copy the API route handler file in under 1 minute and have it working.
- **SC-005**: The Next.js plugin reduces setup steps from 5+ (install, create directory, copy file, configure env vars, import Provider) to 1 (add to next.config.js).
- **SC-006**: Configuration changes via plugin options are reflected without code modifications (no manual env variable editing).
- **SC-007**: React Error Boundary integration requires zero additional code beyond wrapping the root component.

---

## Assumptions

- The Next.js application uses the App Router (src/app directory structure), not Pages Router. Support for Pages Router will be added in a future iteration.
- The server has write permissions to the \_logs directory.
- The application runs in modern browsers that support fetch API and localStorage (ES6+).
- Developers using TypeScript will benefit from full type definitions; JavaScript users can still use the library.
- The primary use case is development and debugging, but the system is designed for production use with appropriate batching and retry settings.
