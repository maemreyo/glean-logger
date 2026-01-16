// Main demo page
'use client';

import { UserList, UserFetcher, ManualLogDemo } from '@/components/DemoComponents';
import { browserLogger } from '@/lib/browser-logger';
import { getLoggingConfig } from '@/lib/config';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [config, setConfig] = useState<ReturnType<typeof getLoggingConfig> | null>(null);

  useEffect(() => {
    setConfig(getLoggingConfig());
  }, []);

  const handleFetchApi = async () => {
    try {
      const response = await fetch('/api/demo');
      const data = await response.json();
      browserLogger.info('API Demo Response', { data });
    } catch (error) {
      browserLogger.error('API Demo Error', { error: String(error) });
    }
  };

  if (!config) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <header
        style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}
      >
        <h1 style={{ margin: 0 }}>Next.js Logging Demo</h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Comprehensive logging with @zaob/glean-logger
        </p>
      </header>

      {/* Configuration Status */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Configuration Status</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <strong>Master Switch:</strong>
            <span style={{ color: config.enabled ? '#16a34a' : '#dc2626', marginLeft: '0.5rem' }}>
              {config.enabled ? '✅ ON' : '❌ OFF'}
            </span>
          </div>
          <div>
            <strong>Browser Exceptions:</strong>
            <span
              style={{
                color: config.browserExceptions ? '#16a34a' : '#dc2626',
                marginLeft: '0.5rem',
              }}
            >
              {config.browserExceptions ? '✅' : '❌'}
            </span>
          </div>
          <div>
            <strong>Browser Requests:</strong>
            <span
              style={{
                color: config.browserRequests ? '#16a34a' : '#dc2626',
                marginLeft: '0.5rem',
              }}
            >
              {config.browserRequests ? '✅' : '❌'}
            </span>
          </div>
          <div>
            <strong>Browser Queries:</strong>
            <span
              style={{ color: config.browserQueries ? '#16a34a' : '#dc2626', marginLeft: '0.5rem' }}
            >
              {config.browserQueries ? '✅' : '❌'}
            </span>
          </div>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem', marginBottom: 0 }}>
          To enable logging: Copy <code>.env.example</code> to <code>.env.local</code> and set{' '}
          <code>DEBUG_MODE=true</code>
        </p>
      </section>

      {/* API Demo */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ marginTop: 0 }}>API Request Logging</h3>
        <p>Click the button to make an API call that will be logged on both client and server.</p>
        <button
          onClick={handleFetchApi}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Fetch Demo API
        </button>
      </section>

      {/* React Query Demo */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <UserList />
        <UserFetcher />
      </section>

      {/* Manual Logging Demo */}
      <section
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <ManualLogDemo />
      </section>

      {/* Instructions */}
      <section style={{ padding: '1.5rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>How to View Logs</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <strong>Browser Console:</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>
              Open DevTools (F12) → Console to see client-side logs
            </p>
          </div>
          <div>
            <strong>Server Terminal:</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>
              Check where <code>npm run dev</code> is running for server logs
            </p>
          </div>
          <div>
            <strong>Log Files:</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>
              Check <code>_logs/</code> directory for persisted log files
            </p>
          </div>
        </div>
      </section>

      <footer
        style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #eee',
          color: '#666',
          fontSize: '0.875rem',
        }}
      >
        <p style={{ margin: 0 }}>
          This example demonstrates comprehensive logging with @zaob/glean-logger. Enable via{' '}
          <code>.env.local</code> to see logging in action.
        </p>
      </footer>
    </div>
  );
}
