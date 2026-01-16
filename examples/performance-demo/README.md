# Performance Demo Example

A comprehensive benchmark suite demonstrating performance tracking with `@zaob/glean-logger`.

## Features

- Async operation timing with `measure()`
- Manual timing with `Stopwatch`
- Concurrent operation benchmarks
- Performance metrics aggregation
- Threshold-based alerting

## Usage

```bash
# Install dependencies
npm install

# Run benchmarks
npm start
```

## Benchmark Categories

### 1. Basic Async Measurement

```typescript
const { result, duration } = await measure('operation-name', async () => {
  return await asyncOperation();
});
console.log(`Completed in ${duration}ms`);
```

### 2. Manual Timing (Stopwatch)

```typescript
const timer = new performance.Stopwatch();
// ... perform operations
const elapsed = timer.elapsed();
console.log(`Elapsed: ${elapsed}ms`);
```

### 3. Concurrent Operations

```typescript
const results = await Promise.all([
  measure('op1', async () => operation1()),
  measure('op2', async () => operation2()),
]);
```

### 4. Metrics Aggregation

```typescript
const aggregator = new MetricsAggregator();
aggregator.record(duration1);
aggregator.record(duration2);
const stats = aggregator.getStats();
```

## Output Example

```
=== Performance Tracking Demo ===

--- 1. Basic Async Measurement ---
{"level":"INFO","message":"Operation completed"}
Result: {"data":"example","count":100}
Duration: 501.81ms

--- 2. Manual Timing (start/end) ---
...

--- Performance Statistics ---
Average: 250.5ms
Min: 100ms
Max: 500ms
P95: 475ms
```

## Key Functions

| Function                         | Description                       |
| -------------------------------- | --------------------------------- |
| `measure(label, fn)`             | Time async operations             |
| `performance.now()`              | Current timestamp in ms           |
| `performance.nowMicro()`         | Current timestamp in microseconds |
| `performance.formatDuration(ms)` | Format ms to human-readable       |
| `new Stopwatch()`                | Manual timing utility             |

## See Also

- [Full Documentation](../../README.md)
- [Basic Starter](../basic-starter/)
- [API Reference](../../README.md#-api-reference)
