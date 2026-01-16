// openapi-fetch client with request/response logging middleware

import createClient from 'openapi-fetch';
import { browserLogger } from './browser-logger';
import { isBrowserRequestsEnabled } from './config';

interface LoggingData {
  _loggingStartTime?: number;
  _loggingRequestId?: string;
}

export function createLoggingClient(baseUrl: string) {
  const client = createClient({ baseUrl });

  // Add request/response logging middleware
  client.use({
    async onRequest({ request }) {
      if (!isBrowserRequestsEnabled()) return request;

      const startTime = Date.now();
      const requestId = crypto.randomUUID();

      // Store start time on request for response handler
      (request as Request & LoggingData)._loggingStartTime = startTime;
      (request as Request & LoggingData)._loggingRequestId = requestId;

      browserLogger.logRequest(
        {
          method: request.method,
          url: request.url,
          body: request.body ? await parseBody(request.body) : undefined,
        },
        undefined
      );

      return request;
    },

    async onResponse({ request, response }) {
      if (!isBrowserRequestsEnabled()) return response;

      const loggingData = request as Request & LoggingData;
      const startTime = loggingData._loggingStartTime || Date.now();
      void loggingData._loggingRequestId; // Mark as used

      const duration = Date.now() - startTime;
      void duration; // Mark as used for future logging

      browserLogger.logRequest(
        {
          method: request.method,
          url: request.url,
          body: request.body ? await parseBody(request.body) : undefined,
        },
        {
          status: response.status,
          body: response.body ? await parseBody(response.body) : undefined,
        }
      );

      return response;
    },
  });

  return client;
}

async function parseBody(body: unknown): Promise<unknown> {
  if (body instanceof FormData) {
    const entries: Record<string, string> = {};
    for (const [key, value] of body.entries()) {
      entries[key] = value instanceof File ? `File(${value.name})` : String(value);
    }
    return entries;
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

// Mock API types for demo
export type paths = {
  '/api/users': {
    get: {
      responses: {
        200: { data: { id: number; name: string; email: string }[] };
      };
    };
  };
  '/api/users/{id}': {
    get: {
      responses: {
        200: { data: { id: number; name: string; email: string } };
        404: { error: string };
      };
    };
  };
};

// Export client instance
export const apiClient = createLoggingClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
);
