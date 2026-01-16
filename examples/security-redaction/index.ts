/**
 * Security & Redaction Demo
 *
 * This example demonstrates:
 * - Automatic sensitive data redaction
 * - Password and token redaction
 * - Credit card and PII detection
 * - Cookie and session redaction
 * - Safe vs. sensitive field handling
 */

import { logger, loggedFetch } from '@zaob/glean-logger';

const log = logger({ name: 'security-demo', level: 'info' });

console.log('=== Security & Redaction Demo ===\n');

// 1. Basic sensitive data redaction
console.log('--- 1. Sensitive Data Redaction ---\n');

log.info('User login attempt', {
  email: 'user@example.com', // ✅ Not redacted
  password: 'secret123', // ❌ REDACTED
  confirmPassword: 'secret123', // ❌ REDACTED
  username: 'john_doe', // ✅ Not redacted
});

console.log('Notice: password and confirmPassword are automatically redacted!\n');

// 2. Token and API key redaction
console.log('--- 2. Token & API Key Redaction ---\n');

log.info('API request', {
  endpoint: '/api/users',
  method: 'GET',
  authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // ❌ REDACTED
  apiKey: 'sk-proj-abc123...', // ❌ REDACTED
  xAuth: 'token-xyz-123', // ✅ Not redacted
  sessionId: 'sess_abc123', // ✅ Not redacted
});

console.log('Authorization headers and API keys are redacted!\n');

// 3. Payment information redaction
console.log('--- 3. Payment Information Redaction ---\n');

log.info('Payment processed', {
  amount: 99.99, // ✅ Not redacted
  currency: 'USD', // ✅ Not redacted
  cardNumber: '4111111111111111', // ❌ REDACTED
  cvv: '123', // ❌ REDACTED
  expiry: '12/25', // ✅ Not redacted
  cardHolder: 'John Doe', // ✅ Not redacted
});

console.log('Credit card numbers are automatically redacted!\n');

// 4. Personal identifiable information (PII)
console.log('--- 4. PII Redaction ---\n');

log.info('User profile updated', {
  userId: 12345,
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1-555-123-4567',
  address: '123 Main St',
  ssn: '123-45-6789', // ❌ REDACTED (matches SSN pattern)
  taxId: '987-65-4321', // ❌ REDACTED (matches SSN-like pattern)
});

console.log('SSN patterns are automatically redacted!\n');

// 5. Cookie and session redaction
console.log('--- 5. Cookie & Session Redaction ---\n');

log.info('HTTP request received', {
  method: 'POST',
  path: '/api/auth/login',
  cookie: 'session=abc123; refreshToken=xyz789', // ❌ REDACTED
  setCookie: 'session=abc123; Path=/', // ❌ REDACTED
  userAgent: 'Mozilla/5.0...', // ✅ Not redacted
  acceptLanguage: 'en-US,en', // ✅ Not redacted
});

console.log('Cookie headers are automatically redacted!\n');

// 6. Safe vs. sensitive field comparison
console.log('--- 6. Safe vs. Sensitive Comparison ---\n');

const safeData = {
  orderId: 1001,
  productName: 'Wireless Headphones',
  price: 149.99,
  quantity: 2,
  status: 'shipped',
};

log.info('Order created', safeData);
console.log('✅ All fields logged (no sensitive data)\n');

const sensitiveData = {
  orderId: 1002,
  productName: 'Laptop',
  password: 'mySecretPass123',
  secretKey: 'key-abc-123',
  token: 'jwt-token-here',
};

log.info('Order with sensitive data', sensitiveData);
console.log('❌ Passwords, secrets, and tokens redacted\n');

// 7. Mixed sensitivity levels
console.log('--- 7. Mixed Sensitivity Levels ---\n');

log.info('User authentication', {
  email: 'user@example.com', // ✅ Safe
  username: 'john_doe', // ✅ Safe
  loginAttempts: 3, // ✅ Safe
  lastLogin: new Date().toISOString(), // ✅ Safe
  password: 'supersecret123', // ❌ REDACTED
  mfaCode: '123456', // ✅ Safe (not in default list)
  sessionToken: 'sess-abc-123-xyz', // ❌ REDACTED (contains 'token')
  refreshToken: 'refresh-xyz-789', // ❌ REDACTED (contains 'token')
});

console.log('Fields containing "token" are also redacted!\n');

// 8. Error handling without exposing secrets
console.log('\n--- 8. Error Handling ---\n');

try {
  throw new Error('Database connection failed');
} catch (error) {
  log.error('Operation failed', {
    operation: 'connect_to_database',
    error: error instanceof Error ? error.message : String(error),
    connectionString: 'postgres://user:password@localhost/db', // ❌ Password redacted
    databaseName: 'production_db', // ✅ Safe
  });
}

console.log('\n=== Security & Redaction Demo Complete ===');
console.log('\nKey Takeaways:');
console.log('✅ Passwords, tokens, API keys automatically redacted');
console.log('✅ Credit card numbers detected and redacted');
console.log('✅ SSN patterns matched and redacted');
console.log('✅ Cookie headers protected');
console.log('✅ Safe data logged normally for debugging');
