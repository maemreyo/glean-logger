/**
 * Express API Example with Full HTTP Logging
 *
 * This example demonstrates:
 * - Server logging with Winston
 * - Request/response middleware
 * - Child loggers for different modules
 * - loggedFetch for external API calls
 * - Performance tracking
 * - Error handling with logging
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { logger, child, loggedFetch, measure } from '@zaob/glean-logger';

// Create main logger
const log = logger({ name: 'express-api' });
const apiLog = child({ service: 'express-api', version: '1.0.0' });

// Express app setup
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    apiLog.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
});

// Routes
app.get('/', (req: Request, res: Response) => {
  log.info('Root endpoint accessed');
  res.json({
    message: 'Express API with Glean Logger',
    version: '1.0.0',
    endpoints: ['/users', '/users/:id', '/products'],
  });
});

app.get('/users/:id', (req: Request, res: Response) => {
  const userId = req.params.id;
  log.info('Fetching user', { userId });

  const user = {
    id: parseInt(userId),
    name: 'John Doe',
    email: 'john@example.com',
  };

  res.json(user);
});

app.post('/users', async (req: Request, res: Response) => {
  const { name, email } = req.body;

  const { result, duration } = await measure('create-user', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: Date.now(), name, email };
  });

  apiLog.info('User created', { userId: result.id, duration: `${duration}ms` });
  res.status(201).json(result);
});

app.get('/products', async (req: Request, res: Response) => {
  log.info('Fetching products');

  const products = [
    { id: 1, name: 'Widget', price: 19.99 },
    { id: 2, name: 'Gadget', price: 49.99 },
    { id: 3, name: 'Gizmo', price: 9.99 },
  ];

  res.json({ products, count: products.length });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  log.info('Health check requested');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  log.warn('Route not found', { method: req.method, path: req.path });
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server with timing
async function startServer() {
  const { result, duration } = await measure('server-start', async () => {
    return new Promise<void>(resolve => {
      app.listen(PORT, () => {
        resolve();
      });
    });
  });

  log.info(`Server started in ${duration}ms`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('Try these endpoints:');
  console.log('  GET  /');
  console.log('  GET  /users/1');
  console.log('  POST /users');
  console.log('  GET  /products');
  console.log('  GET  /health');
}

startServer().catch(error => {
  log.fatal('Failed to start server', { error: error.message });
  process.exit(1);
});

// Demonstrating loggedFetch (commented out for demo)
/*
const fetch = loggedFetch({ enabled: true, redactHeaders: true });
const testExternalApi = async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
    const data = await response.json();
    apiLog.info('External API called', { userId: data.id, name: data.name });
  } catch (error) {
    log.error('External API error', { error: error instanceof Error ? error.message : String(error) });
  }
};
testExternalApi();
*/
