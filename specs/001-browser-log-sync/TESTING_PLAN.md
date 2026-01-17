# Testing Plan: Feature 001 - Browser Log Sync

**Feature Branch**: `001-browser-log-sync`
**Created**: 2026-01-17
**Status**: Draft - For Review

---

## 1. Overview

This document outlines the comprehensive testing strategy for the browser log sync feature, ensuring reliability, correctness, and performance across all components.

### Goals

- Achieve **95%+ test coverage** for critical paths
- Ensure **zero regression** in existing functionality
- Validate **end-to-end** browser-to-server logging workflow
- Test **error handling** and retry logic thoroughly
- Verify **React integration** and error boundary behavior

---

## 2. Testing Pyramid

```
                    ┌─────────────────┐
                    │   E2E Tests     │  ← 5% (Critical User Journeys)
                    │   (Playwright)  │
                    └─────────────────┘
                      ┌─────────────────┐
                      │  Integration    │  ← 25% (API & Component Tests)
                      │     Tests       │
                      └─────────────────┘
                    ┌─────────────────────┐
                    │     Unit Tests      │  ← 70% (Core Logic)
                    │   (Vitest/Jest)     │
                    └─────────────────────┘
```

---

## 3. Test Suite Structure

### 3.1 Unit Tests (`src/test/*.test.ts`)

#### A. Client Transport Tests (`client-transport.test.ts`) ✅ EXISTING

**Coverage**: Core batching, retry, and transport logic

| Test Case | Description | Status |
|-----------|-------------|--------|
| `constructor with defaults` | Verify default config | ✅ |
| `constructor with custom options` | Verify config merging | ✅ |
| `send buffers entries` | Buffer management | ✅ |
| `send adds multiple entries` | Buffer growth | ✅ |
| `flush immediate mode` | Immediate batching | ✅ |
| `flush sends to server` | Server communication | ✅ |
| `flush empty buffer` | No-op handling | ✅ |
| `retry on failure` | Retry logic | ✅ |
| `no retry when disabled` | Retry toggle | ✅ |
| `count-based batching` | Count threshold flush | ✅ |
| `time-based batching` | Timer-based flush | ✅ |
| `destroy clears buffer` | Cleanup | ✅ |
| `getClientTransport singleton` | Singleton pattern | ✅ |
| `getBufferSize` | Debug API | ✅ |
| `getConfig` | Config access | ✅ |
| `isSending` | State check | ✅ |

#### B. Config Tests (`config.test.ts`) - TODO

**Coverage**: Configuration parsing and defaults

```typescript
describe('config.ts', () => {
  describe('getTransportConfig', () => {
    it('should return default config when no env vars', () => {
      // Test defaults
    });
    
    it('should override with LOGGER_BATCH_MODE env var', () => {
      // Test env var parsing
    });
    
    it('should parse batching thresholds correctly', () => {
      // Test threshold validation
    });
  });
  
  describe('parseBatchingMode', () => {
    it('should accept valid modes: time, count, immediate', () => {
      // Test valid inputs
    });
    
    it('should throw on invalid mode', () => {
      // Test error handling
    });
  });
});
```

#### C. Interceptor Tests (`interceptors.test.ts`) - TODO

**Coverage**: Console and error interception

```typescript
describe('interceptors.ts', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });
  
  describe('installInterceptors', () => {
    it('should wrap console.log', () => {
      // Test console method wrapping
    });
    
    it('should add unhandledrejection listener', () => {
      // Test promise rejection handling
    });
    
    it('should add error listener', () => {
      // Test error event handling
    });
  });
  
  describe('uninstallInterceptors', () => {
    it('should restore original console methods', () => {
      // Test restoration
    });
    
    it('should remove event listeners', () => {
      // Test cleanup
    });
  });
  
  describe('areInterceptorsActive', () => {
    it('should return true when active', () => {
      // Test state tracking
    });
    
    it('should return false when inactive', () => {
      // Test state tracking
    });
  });
});
```

#### D. React Integration Tests (`react.test.tsx`) - TODO

**Coverage**: React context, hooks, and error boundary

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

describe('react.tsx', () => {
  describe('LoggerProvider', () => {
    it('should provide logger to children', () => {
      // Test context provision
    });
    
    it('should accept custom logger', () => {
      // Test custom logger injection
    });
  });
  
  describe('useLogger', () => {
    it('should return logger from context', () => {
      // Test hook functionality
    });
    
    it('should throw when used outside provider', () => {
      // Test error boundary
    });
  });
  
  describe('LoggerErrorBoundary', () => {
    it('should catch render errors', () => {
      // Test error catching
    });
    
    it('should call onError callback', () => {
      // Test callback invocation
    });
    
    it('should render fallback on error', () => {
      // Test fallback rendering
    });
    
    it('should recover on reset', () => {
      // Test recovery mechanism
    });
  });
  
  describe('Logger (combined)', () => {
    it('should wrap app with provider and error boundary', () => {
      // Test combined component
    });
  });
});
```

---

## 4. Integration Tests (`src/test/integration/*.test.ts`) - TODO

### 4.1 Browser-to-Server E2E Test

**File**: `src/test/integration/browser-to-server.test.ts`

```typescript
describe('Integration: Browser to Server Logging', () => {
  beforeAll(() => {
    // Start mock Next.js server with API route
  });
  
  afterAll(() => {
    // Stop mock server
  });
  
  it('should send logs from browser to server', async () => {
    // 1. Create transport with mock endpoint
    const transport = createClientTransport({
      endpoint: 'http://localhost:3001/api/logger',
    });
    
    // 2. Send log entry
    await transport.send({
      id: 'test-1',
      timestamp: Date.now(),
      level: 'info',
      message: 'Test log',
      source: 'console',
    });
    
    // 3. Flush to server
    await transport.flush();
    
    // 4. Verify server received log
    const logs = await getLogsFromServer();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test log');
  });
  
  it('should retry on server failure', async () => {
    // Test retry logic with server failures
  });
  
  it('should batch multiple logs together', async () => {
    // Test batching behavior
  });
});
```

### 4.2 Next.js Plugin Integration Test

**File**: `src/test/integration/nextjs-plugin.test.ts`

```typescript
describe('Integration: Next.js Plugin', () => {
  it('should copy API route template to project', () => {
    // Test file copying
  });
  
  it('should generate correct next.config.js', () => {
    // Test config generation
  });
  
  it('should set public environment variables', () => {
    // Test env var injection
  });
});
```

---

## 5. E2E Tests (Playwright) - TODO

### 5.1 Browser Console Capture Test

**File**: `e2e/browser-console.test.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Browser Console Logging', () => {
  test('should capture console.log and send to server', async ({ page }) => {
    // Navigate to test page
    await page.goto('/test-page');
    
    // Trigger console.log
    await page.evaluate(() => {
      console.log('Test message', { key: 'value' });
    });
    
    // Wait for batch flush
    await page.waitForTimeout(3500);
    
    // Verify log was sent to server
    const response = await page.waitForResponse('**/api/logger');
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
  });
  
  test('should capture unhandled promise rejection', async ({ page }) => {
    // Test promise rejection capture
  });
  
  test('should capture window.onerror', async ({ page }) => {
    // Test error event capture
  });
});
```

### 5.2 React Error Boundary Test

**File**: `e2e/react-error-boundary.test.ts`

```typescript
test.describe('React Error Boundary', () => {
  test('should catch render errors and display fallback', async ({ page }) => {
    // Navigate to page with error-throwing component
    await page.goto('/test/error-boundary');
    
    // Trigger error
    await page.click('#trigger-error');
    
    // Verify fallback is displayed
    await expect(page.locator('.error-fallback')).toBeVisible();
    
    // Verify error was logged to server
    await page.waitForResponse('**/api/logger');
  });
});
```

---

## 6. Performance Tests - TODO

### 6.1 Batching Performance

**File**: `src/test/performance/batching.test.ts`

```typescript
describe('Performance: Batching', () => {
  it('should handle 1000 logs without memory leak', async () => {
    const transport = createClientTransport({
      batch: { mode: 'count', countThreshold: 100 },
    });
    
    // Send 1000 logs
    for (let i = 0; i < 1000; i++) {
      await transport.send(createLogEntry(i));
    }
    
    // Verify buffer size is manageable
    expect(transport.getBufferSize()).toBeLessThan(200);
  });
  
  it('should flush within configured time interval', async () => {
    // Test timer accuracy
  });
});
```

---

## 7. Test Coverage Goals

| Component | Coverage Goal | Current | Status |
|-----------|---------------|---------|--------|
| `client-transport.ts` | 100% | 100% | ✅ |
| `config.ts` | 95% | 0% | 🔄 |
| `interceptors.ts` | 90% | 0% | 🔄 |
| `react.tsx` | 85% | 0% | 🔄 |
| `next-plugin.ts` | 80% | 0% | 🔄 |
| **Overall** | **95%** | **~30%** | 🔄 |

---

## 8. Testing Tools & Configuration

### 8.1 Framework Stack

| Purpose | Tool | Version |
|---------|------|---------|
| Unit/Integration Tests | Vitest | ^4.0.0 |
| E2E Tests | Playwright | ^1.57.0 |
| Assertions | Vitest built-in | - |
| Mocking | Vitest + MSW | - |
| Coverage | @vitest/coverage-v8 | ^4.0.0 |

### 8.2 Vitest Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/test/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/test/**',
        '**/*.d.ts',
        '**/index.ts',
      ],
    },
  },
});
```

### 8.3 Test Setup

**File**: `src/test/setup.ts`

```typescript
/// <reference types="vitest" />

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOGGER_ENABLED = 'true';
process.env.LOG_LEVEL = 'debug';

// Mock browser globals for Node.js environment
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
};

globalThis.window = mockWindow as unknown as Window & typeof globalThis;
globalThis.document = {
  getElementById: vi.fn(),
  querySelector: vi.fn(),
} as unknown as Document;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
```

---

## 9. CI/CD Pipeline Integration

### 9.1 GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - run: npm run typecheck
      
      - run: npm run lint:check
      
      - run: npm run test:ci
        env:
          CI: true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  e2e:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      
      - run: npm run test:e2e
      
      - name: Upload E2E artifacts
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-screenshots
          path: e2e/test-results/
```

### 9.2 Quality Gates

| Gate | Threshold | Action on Fail |
|------|-----------|----------------|
| TypeScript Compilation | 0 errors | Block merge |
| ESLint | 0 warnings | Block merge |
| Unit Test Coverage | ≥90% | Warning |
| E2E Tests | 100% pass | Block merge |
| Security Scan | 0 critical | Block merge |

---

## 10. Test Data Fixtures

### 10.1 Mock Log Entries

**File**: `src/test/fixtures/logs.ts`

```typescript
export const createMockLogEntry = (overrides: Partial<ClientLogEntry> = {}): ClientLogEntry => ({
  id: 'test-' + Math.random().toString(36).substr(2, 9),
  timestamp: Date.now(),
  level: 'info',
  message: 'Test log message',
  source: 'console',
  context: {},
  ...overrides,
});

export const mockLogEntries = Array.from({ length: 10 }, (_, i) =>
  createMockLogEntry({ id: `test-${i}`, message: `Log ${i}` })
);
```

### 10.2 Mock Response Factory

**File**: `src/test/fixtures/responses.ts`

```typescript
export const createMockResponse = (options: {
  ok?: boolean;
  status?: number;
  json?: Record<string, unknown>;
} = {}) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  statusText: options.status === 200 ? 'OK' : 'Error',
  json: vi.fn().mockResolvedValue(options.json ?? { success: true, count: 1 }),
  text: vi.fn().mockResolvedValue(''),
});
```

---

## 11. Known Limitations & Edge Cases

| Issue | Workaround | Priority |
|-------|------------|----------|
| Timer-based batching tests | Use `vi.advanceTimersByTime()` | Medium |
| React testing in Node.js | Use `@testing-library/react` | Medium |
| Network timing tests | Mock `setTimeout` and `fetch` | High |
| localStorage quota tests | Mock localStorage implementation | Low |

---

## 12. Execution Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:ci

# Run specific test file
npm test -- src/test/client-transport.test.ts

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

---

## 13. Review Checklist

Before implementing tests, verify:

- [ ] Test file follows naming convention: `*.test.ts` or `*.test.tsx`
- [ ] Tests are isolated (no shared state between tests)
- [ ] Mock external dependencies (fetch, localStorage, window)
- [ ] Tests are deterministic (no flaky tests)
- [ ] Each test has a clear purpose (ARRANGE, ACT, ASSERT)
- [ ] Error cases are tested as well as happy paths
- [ ] Coverage report is generated and reviewed
- [ ] Tests pass in CI before merge

---

## 14. References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/)
- [React Testing Guide](https://reactjs.org/docs/testing.html)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-17
**Next Review**: Before implementation begins
