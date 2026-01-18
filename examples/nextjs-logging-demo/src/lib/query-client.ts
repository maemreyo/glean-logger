import { QueryClient, QueryCache } from '@tanstack/react-query';
import { useLogger } from '@zaob/glean-logger/react';
import { isBrowserQueriesEnabled } from './config';

/**
 * Custom hook for React Query logging
 * Calls useLogger() at top level to comply with React Rules of Hooks
 */
function useQueryLogger() {
  const logger = useLogger();

  return {
    onSuccess: (data: unknown, query: { queryKey: readonly unknown[] }) => {
      logger.info('Query succeeded', {
        queryKey: query.queryKey,
        dataKeys:
          typeof data === 'object' && data !== null
            ? Object.keys(data as Record<string, unknown>).slice(0, 5)
            : undefined,
      });
    },
    onError: (error: unknown, query: { queryKey: readonly unknown[] }) => {
      logger.error('Query failed', {
        queryKey: query.queryKey,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  };
}

export function createLoggingQueryClient() {
  const queryLogger = useQueryLogger();

  return new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (data, query) => {
        if (isBrowserQueriesEnabled()) {
          queryLogger.onSuccess(data, query);
        }
      },
      onError: (error, query) => {
        if (isBrowserQueriesEnabled()) {
          queryLogger.onError(error, query);
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
