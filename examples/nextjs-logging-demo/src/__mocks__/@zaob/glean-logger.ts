// Mock for @zaob/glean-logger
// Used in tests via vitest.config.ts alias
import { vi } from 'vitest';

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: () => mockLogger,
  with: () => mockLogger,
};

export function logger() {
  return mockLogger;
}

export const perf = {
  timeAsync: async (fn: () => Promise<unknown>) => {
    const start = Date.now();
    const result = await fn();
    return { result, duration: Date.now() - start };
  },
};

export function measure(label: string, fn: () => Promise<unknown>) {
  return perf.timeAsync(fn);
}

export const performance = {
  now: () => Date.now(),
};

export default {
  logger,
  perf,
  measure,
  performance,
};
