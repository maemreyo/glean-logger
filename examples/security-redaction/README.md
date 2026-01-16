# Security Redaction Example

Demonstrates automatic sensitive data detection and redaction with `@zaob/glean-logger`.

## Features

- Automatic password/secret redaction
- Token and API key detection
- Credit card number masking
- PII detection (SSN, etc.)
- Cookie and header protection
- Custom redaction patterns

## Usage

```bash
# Install dependencies
npm install

# Run the demo
npm start
```

## What Gets Redacted

### Passwords & Secrets

```typescript
log.info('User login', {
  email: 'user@example.com', // ✅ Kept
  password: 'secret123', // ❌ Redacted
});
// Output: {"email":"user@example.com","password":"[REDACTED]"}
```

### Tokens & API Keys

```typescript
log.info('API request', {
  authorization: 'Bearer xxx', // ❌ Redacted
  apiKey: 'sk-xxx', // ❌ Redacted
});
// Output: {"authorization":"[REDACTED]","apiKey":"[REDACTED]"}
```

### Credit Cards

```typescript
log.info('Payment', {
  creditCard: '4111-1111-1111-1111', // ❌ Redacted
});
// Output: {"creditCard":"[REDACTED]"}
```

### PII

```typescript
log.info('User profile', {
  ssn: '123-45-6789', // ❌ Redacted
});
// Output: {"ssn":"[REDACTED]"}
```

### Cookies

```typescript
log.info('Request', {
  cookie: 'session=abc123', // ❌ Redacted
});
// Output: {"cookie":"[REDACTED]"}
```

## Redaction Patterns

| Pattern      | Examples                                 |
| ------------ | ---------------------------------------- |
| Passwords    | `password`, `pwd`, `passwd`, `secret`    |
| Tokens       | `token`, `access_token`, `refresh_token` |
| API Keys     | `api_key`, `apikey`, `secret_key`        |
| Credit Cards | 13-19 digit patterns with Luhn check     |
| SSN          | `XXX-XX-XXXX` pattern                    |
| Cookies      | `cookie`, `set-cookie` headers           |

## Environment Variables

```env
REDACT_SENSITIVE=true  # Enable redaction (default: true)
```

## Custom Redaction

```typescript
// Custom patterns are detected automatically
// Fields containing: password, secret, token, key, auth
```

## See Also

- [Full Documentation](../../README.md)
- [Security Guide](../../README.md#-security)
- [API Reference](../../README.md#-api-reference)
