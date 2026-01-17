# Data Model: Client-to-Server Logging

**Feature**: 001-browser-log-sync
**Date**: 2026-01-17

---

## Entities

### ClientLogEntry

Represents a log entry generated in the browser and sent to the server.

**Fields**:
| Name | Type | Required | Description |
| ----- | ------ | --------- | ----------- |
| id | string (UUID v4) | Yes | Unique identifier for each log entry |
| timestamp | number | Yes | Unix timestamp in milliseconds |
| level | LogLevel | Yes | Log severity: 'debug' | 'info' | 'warn' | 'error' | 'fatal' |
| message | string | Yes | Primary log message |
| context | LogContext (object) | No | Arbitrary key-value metadata |
| source | string | Yes | Origin of log: 'console' | 'api' | 'error' |

**Validation Rules**:

- `id` must be valid UUID v4 format
- `timestamp` must be positive number (Unix epoch)
- `level` must be one of: debug, info, warn, error, fatal
- `message` must be non-empty string
- `source` must be one of: console, api, error

**State Transitions**:

```
Created (client) → Buffered (client) → Sent (server) → Persisted (file)
```

---

### BatchingConfig

Configuration for batching behavior on the client side.

**Fields**:
| Name | Type | Default | Description |
| ----- | ------ | -------- | ----------- |
| mode | enum | 'time' | Batching mode: 'time' | 'count' | 'immediate' |
| timeIntervalMs | number | 3000 | Time in milliseconds between batched sends (time mode) |
| countThreshold | number | 10 | Number of entries to trigger batch (count mode) |

**Validation Rules**:

- `mode` must be one of: time, count, immediate
- `timeIntervalMs` must be positive number (≥100ms)
- `countThreshold` must be positive number (≥1)

---

### RetryConfig

Configuration for retry behavior when batched logs fail to send.

**Fields**:
| Name | Type | Default | Description |
| ----- | ------ | -------- | ----------- |
| enabled | boolean | true | Whether retry is enabled |
| maxRetries | number | 3 | Maximum number of retry attempts |
| initialDelayMs | number | 1000 | Delay before first retry (in ms) |
| maxDelayMs | number | 30000 | Maximum delay between retries (in ms) |
| backoffMultiplier | number | 2 | Exponential backoff multiplier |

**Validation Rules**:

- `maxRetries` must be positive number (≥0, 0 = no retry)
- `initialDelayMs` must be positive number (≥100ms)
- `maxDelayMs` must be positive number (≥initialDelayMs)
- `backoffMultiplier` must be positive number (≥1)

---

### TransportConfig

Combined configuration for client-to-server transport.

**Fields**:
| Name | Type | Default | Description |
| ----- | ------ | -------- | ----------- |
| endpoint | string | '/api/logger' | Relative path to API route |
| batch | BatchingConfig | - | Batching configuration |
| retry | RetryConfig | - | Retry configuration |

**Validation Rules**:

- `endpoint` must be non-empty string
- Must include valid `batch` and `retry` configs

---

## Relationships

```
ClientLogEntry (1..N)
    ↓ (buffered in)
ClientTransport (singleton)
    ↓ (batched by)
    POST /api/logger
        ↓ (validated by)
        API Route
            ↓ (formatted as JSON array)
            _logs/browser.YYYY-MM-DD.log
```

**Indexing**: No relationships defined - logs are append-only, no queries or updates.

---

## Validation

### ClientLogEntry Validation

```typescript
function validateClientLogEntry(entry: ClientLogEntry): boolean {
  // Validate UUID format (v4)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(entry.id)) return false;

  // Validate timestamp
  if (entry.timestamp <= 0) return false;
  if (entry.timestamp > Date.now() + 60000) return false; // Future by >1 minute

  // Validate level
  const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
  if (!validLevels.includes(entry.level)) return false;

  // Validate message
  if (typeof entry.message !== 'string' || entry.message.length === 0) return false;

  // Validate source
  const validSources = ['console', 'api', 'error'];
  if (!validSources.includes(entry.source)) return false;

  return true;
}
```

### BatchingConfig Validation

```typescript
function validateBatchingConfig(config: BatchingConfig): boolean {
  // Validate mode
  const validModes = ['time', 'count', 'immediate'];
  if (!validModes.includes(config.mode)) return false;

  // Validate timeIntervalMs
  if (config.mode === 'time' && config.timeIntervalMs < 100) return false;

  // Validate countThreshold
  if (config.mode === 'count' && config.countThreshold < 1) return false;

  return true;
}
```

### RetryConfig Validation

```typescript
function validateRetryConfig(config: RetryConfig): boolean {
  // Validate enabled
  if (typeof config.enabled !== 'boolean') return false;

  // Validate maxRetries
  if (config.maxRetries < 0) return false;

  // Validate initialDelayMs
  if (config.initialDelayMs < 100) return false;

  // Validate maxDelayMs
  if (config.maxDelayMs < config.initialDelayMs) return false;

  // Validate backoffMultiplier
  if (config.backoffMultiplier < 1) return false;

  return true;
}
```

---

## Storage Requirements

### File Naming Convention

```
_logs/
├── browser.YYYY-MM-DD.log  # Browser logs from client transport
├── combined.YYYY-MM-DD.log  # Server logs (existing)
├── api.YYYY-MM-DD.log        # API logs (existing)
└── error.YYYY-MM-DD.log       # Error logs (existing)
```

### File Format

Each log entry is written as a separate JSON line:

```json
{
  "@timestamp": "2026-01-17T10:30:00.000Z",
  "level": "INFO",
  "message": "User clicked button",
  "source": "console",
  "context": { "buttonId": "submit" },
  "id": "550e8400-e29b-41d4-a716-446655419",
  "timestamp": 1737138600000
}
```

**Format Rules**:

- One JSON object per line (not array)
- Trailing newline after each entry
- ISO 8601 timestamp from Unix `timestamp` field
- `@timestamp` prefix for compatibility with existing logs
- `source` field distinguishes browser logs from server logs

### File Rotation

Reuses existing winston-daily-rotate-file configuration:

- Maximum file size: 10MB (configurable)
- Maximum file retention: 14 days (configurable)
- Date pattern: YYYY-MM-DD

---

## Performance Considerations

### Client-Side Performance

| Metric                 | Target                               | Notes                          |
| ---------------------- | ------------------------------------ | ------------------------------ |
| Log overhead per entry | <0.1ms                               | Client logger minimal overhead |
| Buffer memory usage    | ~10KB (100 entries @ 100 bytes each) | Acceptable for modern browsers |
| Batching latency       | ≤configured interval (3s default)    | Acceptable for debugging       |
| Network request size   | ~5-10KB (100 entries batched)        | Minimal JSON overhead          |

### Server-Side Performance

| Metric                    | Target            | Notes                                     |
| ------------------------- | ----------------- | ----------------------------------------- |
| API response time         | <100ms            | Simple JSON parse + file append           |
| File write throughput     | >1000 entries/sec | Sequential appends are fast               |
| Concurrent write handling | Required          | Multiple browsers may send simultaneously |

---

## Security Considerations

### Data Sanitization

- **Not required for MVP** (as specified in spec, filtering delayed to future)
- Input validation required (type checking, size limits)
- Prevent injection attacks (validate JSON structure)

### API Rate Limiting

- Not implemented in MVP (add in future if needed)
- Consider per-IP limits if abuse detected
- Log warning on throttled requests

---

## Error Handling

### Client-Side Errors

| Error Scenario              | Handling                                            |
| --------------------------- | --------------------------------------------------- |
| localStorage quota exceeded | Warn to console, continue network sends             |
| Network fetch failure       | Retry with exponential backoff, buffer retained     |
| Max retries exceeded        | Stop retrying, log error, buffer retained (max 100) |
| Invalid API response        | Log error, retry if 5xx server error, stop if 4xx   |

### Server-Side Errors

| Error Scenario             | Handling                                         |
| -------------------------- | ------------------------------------------------ |
| Invalid request body       | Return 400 Bad Request with error message        |
| File system write failure  | Return 500 Internal Error, log to server console |
| Log directory not writable | Return 500 Internal Error, log error details     |

---

## Testing Strategy

### Unit Testing

- **ClientTransport**: Mock fetch, test batching logic, test retry backoff
- **API Route**: Mock NextRequest/NextResponse, test file operations
- **Validation Functions**: Test all valid/invalid inputs

### Integration Testing

- **End-to-end**: Generate log in browser → flush → API → verify in file
- **Offline scenario**: Mock fetch to fail, verify retry behavior
- **Network recovery**: Fail then succeed fetch, verify logs arrive after recovery

### Performance Testing

- **Throughput**: Simulate 1000+ entries/minute with multiple clients
- **Latency**: Measure batching delay under load
- **Memory**: Monitor buffer size with high-volume logging

---

## Migration Strategy

### Version Migration

No breaking changes - fully additive feature.

### Data Migration

No migration needed - feature is new functionality with separate log files.

---

## Notes

- Browser and server logs are stored in separate files for easier filtering
- Log entries are immutable once written (no updates, only appends)
- Buffer is in-memory only (not persisted to localStorage) - localStorage is fallback only
- Retry state is ephemeral (not persisted between sessions)
