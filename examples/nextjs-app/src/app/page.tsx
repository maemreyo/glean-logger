'use client';

import { useState } from 'react';
import { clientLog } from '@/lib/logger-client';

interface LogEntry {
  id: number;
  level: string;
  message: string;
  timestamp: string;
}

export default function HomePage() {
  const [logs, _setLogs] = useState<LogEntry[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [clickCount, setClickCount] = useState(0);

  clientLog.info('Home page mounted', { path: '/' });

  const handleClick = () => {
    const count = clickCount + 1;
    setClickCount(count);
    clientLog.info('Button clicked', {
      buttonId: 'demo-button',
      clickNumber: count,
    });
  };

  const logDebug = () => {
    clientLog.debug('Debug message logged', { data: { value: 42 } });
  };

  const logWarn = () => {
    clientLog.warn('Warning message logged', { warning: 'This is a demo warning' });
  };

  const logError = () => {
    clientLog.error('Error message logged', { error: 'Demo error' });
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Next.js 15 with Glean Logger</h1>
      <p>This example demonstrates client-side logging with @zaob/glean-logger.</p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <h3>Client-Side Logging Demo</h3>
        <p>Click the buttons below to generate logs:</p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            onClick={handleClick}
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
            Log Info (Clicks: {clickCount})
          </button>
          <button
            onClick={logDebug}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Log Debug
          </button>
          <button
            onClick={logWarn}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f5a623',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Log Warn
          </button>
          <button
            onClick={logError}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Log Error
          </button>
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <h4>Browser Console Logs</h4>
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
            Open DevTools (F12) → Console to see the logs with styling and metadata.
          </p>

          {logs.length > 0 && (
            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              {logs.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    padding: '0.5rem',
                    marginBottom: '0.5rem',
                    borderRadius: '4px',
                    backgroundColor:
                      entry.level === 'error'
                        ? '#fee'
                        : entry.level === 'warn'
                          ? '#ffd'
                          : entry.level === 'info'
                            ? '#eef'
                            : '#fff',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong>[{entry.level.toUpperCase()}]</strong> {entry.message}
                  <small
                    style={{
                      display: 'block',
                      color: '#666',
                      fontSize: '0.75rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <h3>Features</h3>
        <ul>
          <li>✅ Browser-safe console logging</li>
          <li>✅ Log levels: debug, info, warn, error</li>
          <li>✅ Automatic localStorage persistence</li>
          <li>✅ Metadata support</li>
          <li>✅ Styled console output</li>
        </ul>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
          <strong>Note:</strong> Check browser console (F12) for styled log output. Logs are also
          stored in localStorage for persistence.
        </p>
      </div>
    </div>
  );
}
