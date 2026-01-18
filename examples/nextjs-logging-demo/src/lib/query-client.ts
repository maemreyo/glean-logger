import { QueryClient, QueryCache } from '@tanstack/react-query';
import { isBrowserQueriesEnabled } from './config';
import { logger } from '@zaob/glean-logger/react';

export function createLoggingQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (data, query) => {
        if (isBrowserQueriesEnabled()) {
          logger.info('Query succeeded', {
            queryKey: query.queryKey,
            dataKeys:
              typeof data === 'object' && data !== null
                ? Object.keys(data as Record<string, unknown>).slice(0, 5)
                : undefined,
          });
        }
      },
      onError: (error, query) => {
        if (isBrowserQueriesEnabled()) {
          logger.error('Query failed', {
            queryKey: query.queryKey,
            error: error instanceof Error ? error.message : String(error),
          });
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

export const queryClient = createLoggingQueryClient();
