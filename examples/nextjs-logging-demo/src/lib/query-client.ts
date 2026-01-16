import { QueryClient, QueryCache } from '@tanstack/react-query';
import { browserLogger } from './browser-logger';
import { isBrowserQueriesEnabled } from './config';

export function createLoggingQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (data, query) => {
        if (isBrowserQueriesEnabled()) {
          browserLogger.info('Query succeeded', {
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
          browserLogger.error('Query failed', {
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
