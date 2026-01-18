'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { LoggerProvider } from '@zaob/glean-logger/react';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LoggerProvider>{children}</LoggerProvider>
    </QueryClientProvider>
  );
}
