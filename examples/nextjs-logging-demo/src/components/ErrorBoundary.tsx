// Error Boundary component for catching React errors

'use client';

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { browserLogger } from '@/lib/browser-logger';
import { isBrowserExceptionsEnabled } from '@/lib/config';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function DefaultErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Something went wrong!</h2>
      <p style={{ color: '#dc2626', margin: '1rem 0' }}>{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  if (!isBrowserExceptionsEnabled()) {
    return <>{children}</>;
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={DefaultErrorFallback}
      onError={(error, errorInfo) => {
        browserLogger.logException(error, {
          componentStack: errorInfo.componentStack,
          type: 'react-error-boundary',
        });
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
