import { QueryClient, QueryCache } from '@tanstack/react-query';
import { isBrowserQueriesEnabled } from './config';

export function createLoggingQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (data, query) => {
        if (isBrowserQueriesEnabled()) {
          // Use logger directly without hooks for module-level usage
          const { logger } = require('@zaob/glean-logger/react');
          if (logger && typeof logger.info === 'function') {
            logger.info('Query succeeded', {
              queryKey: query.queryKey,
              dataKeys:
                typeof data === 'object' && data !== null
                  ? Object.keys(data as Record<string, unknown>).slice(0, 5)
                  : undefined,
            });
          }
        }
      },
      onError: (error, query) => {
        if (isBrowserQueriesEnabled()) {
          const { logger } = require('@zaob/glean-logger/react');
          if (logger && typeof logger.error === 'function') {
            logger.error('Query failed', {
              queryKey: query.queryKey,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5 * 60 * 1000,
      },
    },
  });
}

// Initialize query client for module-level usage
export const queryClient = createLoggingQueryClient();
