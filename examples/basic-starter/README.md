# Basic Starter Example

A minimal example demonstrating core logging functionality with `@zaob/glean-logger`.

## Features

- Basic logger setup with different log levels
- Contextual metadata logging
- Performance timing with `measure()` and `Stopwatch`
- Works in both browser and Node.js environments

## Usage

```bash
# Install dependencies
npm install

# Run the example
npm start
```

## Expected Output

```
=== Basic Starter Example ===

{"level":"INFO","message":"Application started"}
{"level":"DEBUG","message":"Initializing configuration"}
...
=== Check the logs in: _logs/ directory ===
```

## Logs Location

Logs are written to the `_logs/` directory:

- `combined.2024-01-16.log` - All logs
- `api.2024-01-16.log` - API-related logs
- `error.2024-01-16.log` - Error logs only

## Key Concepts

### Log Levels

```typescript
log.debug('Detailed info', { data });
log.info('General info', { status });
log.warn('Warning', { warning });
log.error('Error', { error });
```

### Performance Timing

```typescript
// Async operations
const { result, duration } = await measure('task-name', async () => {
  return await someAsyncOperation();
});

// Sync operations
const timer = new performance.Stopwatch();
// ... do work
const elapsed = timer.elapsed();
```

## See Also

- [Full Documentation](../../README.md)
- [Express API Example](../express-api/)
- [Performance Demo](../performance-demo/)
