# Express API Example

A complete Express.js server demonstrating HTTP request logging with `@zaob/glean-logger`.

## Features

- Request/response logging middleware
- Child loggers for different modules
- Performance tracking with `measure()`
- Contextual logging with metadata
- Winston-based file logging with rotation

## Usage

```bash
# Install dependencies
npm install

# Run the server
npm start
```

## Endpoints

| Method | Path         | Description    |
| ------ | ------------ | -------------- |
| GET    | `/`          | Root endpoint  |
| GET    | `/users/:id` | Get user by ID |
| POST   | `/users`     | Create user    |
| GET    | `/products`  | List products  |
| GET    | `/health`    | Health check   |

## Example Requests

```bash
# Health check
curl http://localhost:3000/health

# Get user
curl http://localhost:3000/users/1

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'
```

## Log Output

All logs are written to the `_logs/` directory with daily rotation:

```
_logs/
├── combined.2024-01-16.log
├── express-api.2024-01-16.log
└── error.2024-01-16.log
```

## Key Concepts

### Request Middleware

```typescript
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    apiLog.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});
```

### Child Loggers

```typescript
const apiLog = child({
  service: 'express-api',
  version: '1.0.0',
});

apiLog.info('Request received', { path: '/api/users' });
```

## See Also

- [Full Documentation](../../README.md)
- [Basic Starter](../basic-starter/)
- [Next.js App](../nextjs-app/)
