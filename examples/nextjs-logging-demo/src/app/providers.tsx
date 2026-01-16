// Providers wrapper for React Query and global setup
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { setupGlobalErrorHandlers } from '@/lib/browser-logger';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </QueryClientProvider>
  );
}
