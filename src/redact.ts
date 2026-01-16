/**
 * Data Redaction Module
 *
 * Feature: 011-api-logger
 * User Story 4: Sensitive Data Redaction
 *
 * Provides:
 * - Key-based redaction (field names)
 * - Value-based redaction (regex patterns)
 * - Extensible redaction configuration
 * - Support for PII, PCI, PHI patterns
 */

import type { RedactionPattern, LogContext } from './types';

/**
 * Default sensitive field names to redact by key
 */
export const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apikey',
  'authToken',
  'authorization',
  'cookie',
  'ssn',
  'socialSecurity',
  'creditCard',
  'cardNumber',
  'cvv',
  'cvc',
  'pin',
  'privateKey',
  'private_key',
]);

/**
 * High-sensitivity keys that should ALWAYS be redacted by key
 * regardless of redactValues setting (e.g., passwords, secrets)
 */
const HIGH_SENSITIVITY_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'privateKey',
  'private_key',
]);

/**
 * Default regex patterns for value-based redaction
 */
export const DEFAULT_PATTERNS: RedactionPattern[] = [
  {
    name: 'SSN',
    pattern: /..{3}[-.]?.{2}[-.]?.{4}./g,
    replacement: '***-**-****',
  },
  {
    name: 'CreditCard',
    pattern: /.(?:.{4}[-.]?){3}.{4}./g,
    replacement: '****-****-****-****',
  },
  {
    name: 'Email',
    pattern: /.[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Z|a-z]{2,}./g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    name: 'IPv4',
    pattern: /.(?:.{1,3}.){3}.{1,3}./g,
    replacement: '[IP_REDACTED]',
  },
  {
    name: 'BearerToken',
    pattern: /Bearer.+[a-zA-Z0-9_..]+/gi,
    replacement: 'Bearer [REDACTED]',
  },
  {
    name: 'APIKey',
    pattern: /.(sk|live|test|pk)_[a-zA-Z0-9]{20,}./gi,
    replacement: '[API_KEY_REDACTED]',
  },
  {
    name: 'JWT',
    pattern: /eyJ[a-zA-Z0-9_-]*.eyJ[a-zA-Z0-9_-]*.[a-zA-Z0-9_-]*/g,
    replacement: '[JWT_REDACTED]',
  },
];

/**
 * Check if a value matches any redaction pattern
 */
function valueMatchesPattern(value: unknown, patterns: RedactionPattern[]): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return patterns.some(pattern => pattern.pattern.test(value));
}

/**
 * Redact an object by key (field names)
 */
export function redactByKey(obj: unknown, keys?: Set<string>): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactByKey(item, keys));
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (keys?.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactByKey(value, keys);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Redact an object by value (regex patterns)
 */
export function redactByValue(obj: unknown, patterns: RedactionPattern[]): unknown {
  if (!obj) {
    return obj;
  }

  if (typeof obj === 'string') {
    let result = obj;

    for (const pattern of patterns) {
      result = result.replace(pattern.pattern, pattern.replacement);
    }

    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactByValue(item, patterns));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = redactByValue(value, patterns);
    }

    return result;
  }

  return obj;
}

/**
 * Redact an object by both key and value
 */
export function redact(
  obj: unknown,
  options?: {
    keys?: Set<string>;
    patterns?: RedactionPattern[];
    redactKeys?: boolean;
    redactValues?: boolean;
  }
): unknown {
  const keys = options?.keys ?? SENSITIVE_KEYS;
  const patterns = options?.patterns ?? DEFAULT_PATTERNS;
  const redactKeys = options?.redactKeys ?? true;
  const redactValues = options?.redactValues ?? true;

  if (!redactKeys && !redactValues) {
    return obj;
  }

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item, options));
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitiveKey = keys.has(key.toLowerCase());
    const isHighSensitivityKey = HIGH_SENSITIVITY_KEYS.has(key.toLowerCase());

    // High-sensitivity keys (password, secret, etc.): always redact by key if redactKeys=true
    // These fields should ALWAYS be hidden regardless of redactValues setting
    if (isHighSensitivityKey) {
      if (redactKeys) {
        result[key] = '[REDACTED]';
      } else if (
        redactValues &&
        typeof value === 'string' &&
        valueMatchesPattern(value, patterns)
      ) {
        result[key] = redactByValue(value, patterns);
      } else {
        result[key] = value;
      }
    }
    // Other sensitive keys:
    // - If redactValues is false: don't redact (preserve for auditing)
    // - If redactValues is true and value matches pattern: use value-based redaction
    // - If redactValues is true and value doesn't match pattern: use key-based redaction
    else if (isSensitiveKey) {
      if (!redactValues) {
        // redactValues is false - don't redact sensitive keys at all
        result[key] = value;
      } else if (typeof value === 'string' && valueMatchesPattern(value, patterns)) {
        // Value matches a pattern - use value-based redaction
        result[key] = redactByValue(value, patterns);
      } else if (redactKeys) {
        // Value doesn't match pattern or not a string - use key-based redaction
        result[key] = '[REDACTED]';
      } else {
        result[key] = value;
      }
    }
    // Non-sensitive keys: redact by value if redactValues=true
    else if (typeof value === 'string' && redactValues) {
      result[key] = redactByValue(value, patterns);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redact(value, options);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Create a custom redaction configuration
 */
export function createRedactionConfig(options?: {
  keys?: string[];
  patterns?: RedactionPattern[];
  redactKeys?: boolean;
  redactValues?: boolean;
}): {
  keys: Set<string>;
  patterns: RedactionPattern[];
  redactKeys: boolean;
  redactValues: boolean;
} {
  return {
    keys: new Set(options?.keys ?? Array.from(SENSITIVE_KEYS)),
    patterns: options?.patterns ?? [...DEFAULT_PATTERNS],
    redactKeys: options?.redactKeys ?? true,
    redactValues: options?.redactValues ?? true,
  };
}

/**
 * Add a custom redaction pattern
 */
export function addPattern(
  patterns: RedactionPattern[],
  pattern: RedactionPattern
): RedactionPattern[] {
  return [...patterns, pattern];
}

/**
 * Remove a redaction pattern by name
 */
export function removePattern(patterns: RedactionPattern[], name: string): RedactionPattern[] {
  return patterns.filter(p => p.name !== name);
}

/**
 * Redaction configuration object for re-export
 */
export const redactionConfig = {
  SENSITIVE_KEYS,
  DEFAULT_PATTERNS,
  redact,
  redactByKey,
  redactByValue,
  createRedactionConfig,
  addPattern,
  removePattern,
};

export default redactionConfig;
