/**
 * JSON Schema definitions for log entries
 *
 * Defines the JSON schema for log entries compatible with
 * Datadog, CloudWatch, ELK, and other log aggregation services.
 */

/**
 * JSON Schema for a log entry
 * Compatible with Datadog, CloudWatch, ELK, and other aggregation services
 */
export const LOG_ENTRY_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://example.com/schemas/log-entry.json',
  title: 'Log Entry',
  description: 'A structured log entry for API logging',
  type: 'object',
  required: ['@timestamp', 'level', 'message'],
  properties: {
    '@timestamp': {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp when the log was created',
    },
    level: {
      type: 'string',
      enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'],
      description: 'Log severity level',
    },
    message: {
      type: 'string',
      minLength: 1,
      description: 'Primary log message',
    },
    context: {
      type: 'object',
      description: 'Additional metadata attached to the log entry',
      additionalProperties: true,
    },
    logger: {
      type: 'string',
      description: 'Logger name (e.g., api-logger, database)',
    },
    service: {
      type: 'string',
      description: 'Service name for filtering',
    },
    trace: {
      type: 'string',
      description: 'Request/trace ID for correlation',
    },
    error: {
      type: 'object',
      description: 'Error information if applicable',
      properties: {
        message: {
          type: 'string',
          description: 'Error message',
        },
        name: {
          type: 'string',
          description: 'Error name/type',
        },
        stack: {
          type: 'string',
          description: 'Stack trace',
        },
      },
    },
  },
  additionalProperties: true,
};

/**
 * JSON Schema for browser log entry (simplified for localStorage)
 */
export const BROWSER_LOG_ENTRY_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://example.com/schemas/browser-log-entry.json',
  title: 'Browser Log Entry',
  description: 'A simplified log entry for browser localStorage',
  type: 'object',
  required: ['id', 'timestamp', 'level', 'message'],
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier (UUID v4)',
    },
    timestamp: {
      type: 'number',
      description: 'Unix timestamp in milliseconds',
    },
    level: {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error', 'fatal'],
      description: 'Log severity level',
    },
    message: {
      type: 'string',
      minLength: 1,
      description: 'Primary log message',
    },
    context: {
      type: 'object',
      description: 'Additional metadata',
      additionalProperties: true,
    },
  },
};

/**
 * JSON Schema for API request context
 */
export const API_REQUEST_CONTEXT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://example.com/schemas/api-request-context.json',
  title: 'API Request Context',
  description: 'Context for API request logging',
  type: 'object',
  required: ['requestId', 'method', 'url', 'timestamp'],
  properties: {
    requestId: {
      type: 'string',
      format: 'uuid',
      description: 'Unique request identifier',
    },
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      description: 'HTTP method',
    },
    url: {
      type: 'string',
      format: 'uri',
      description: 'Request URL',
    },
    headers: {
      type: 'object',
      description: 'Request headers (redacted)',
      additionalProperties: {
        type: 'string',
      },
    },
    body: true,
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Request timestamp',
    },
  },
};

/**
 * JSON Schema for API response context
 */
export const API_RESPONSE_CONTEXT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://example.com/schemas/api-response-context.json',
  title: 'API Response Context',
  description: 'Context for API response logging',
  type: 'object',
  required: ['requestId', 'method', 'url', 'duration', 'timestamp'],
  properties: {
    requestId: {
      type: 'string',
      format: 'uuid',
      description: 'Links to the corresponding request',
    },
    method: {
      type: 'string',
      description: 'HTTP method from the request',
    },
    url: {
      type: 'string',
      description: 'URL from the request',
    },
    statusCode: {
      type: 'integer',
      minimum: 100,
      maximum: 599,
      description: 'HTTP status code',
    },
    duration: {
      type: 'number',
      minimum: 0,
      description: 'Request duration in milliseconds',
    },
    body: true,
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Response timestamp',
    },
  },
};

/**
 * Export schemas as a single object for validation
 */
export const SCHEMAS = {
  logEntry: LOG_ENTRY_SCHEMA,
  browserLogEntry: BROWSER_LOG_ENTRY_SCHEMA,
  apiRequestContext: API_REQUEST_CONTEXT_SCHEMA,
  apiResponseContext: API_RESPONSE_CONTEXT_SCHEMA,
};

/**
 * Validate a log entry against the schema
 */
export function validateLogEntry(entry: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry must be an object'] };
  }

  const e = entry as Record<string, unknown>;

  // Check required fields
  if (!e['@timestamp']) {
    errors.push('Missing required field: @timestamp');
  }
  if (!e.level) {
    errors.push('Missing required field: level');
  }
  if (!e.message || typeof e.message !== 'string') {
    errors.push('Missing required field: message (must be a string)');
  }

  // Validate level
  const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  if (e.level && !validLevels.includes(e.level as string)) {
    errors.push(`Invalid level: ${e.level}. Must be one of: ${validLevels.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
