'use client';

import { useState } from 'react';
import { clientLog } from '@/lib/logger-client';

export default function HomePage() {
  const [logs, setLogs] = useState<any[]>([]);

  clientLog.info('Home page mounted');

  const handleClick = () => {
    clientLog.info('Button clicked', {
      buttonId: 'demo-button',
      timestamp: Date.now(),
    });
  };

  const showStoredLogs = () => {
    setLogs(clientLog.getLogs());
  };

  const clearStoredLogs = () => {
    clientLog.clearLogs();
    setLogs([]);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Next.js 15 with Glean Logger</h1>
      <p>This example demonstrates client and server logging.</p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <h3>Client-Side Logging Demo</h3>
        <p>Click the button below to generate logs:</p>

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
            marginBottom: '1rem',
          }}
        >
          Log Click Event
        </button>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <h4>Stored Logs (localStorage)</h4>
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={showStoredLogs}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                marginRight: '0.5rem',
              }}
            >
              Show Logs
            </button>
            <button
              onClick={clearStoredLogs}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Clear Logs
            </button>
          </div>

          {logs.length > 0 && (
            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto' as const,
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              {logs.map((entry: any, index: number) => (
                <div
                  key={entry.id || index}
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
                  <strong>[{entry.level?.toUpperCase()}]</strong> {entry.message}
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
          <li>✅ Browser-safe logging with localStorage</li>
          <li>✅ Server-side Winston logging</li>
          <li>✅ Auto environment detection</li>
          <li>✅ Log level filtering</li>
          <li>✅ Contextual metadata</li>
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
          <strong>Note:</strong> Open browser console to see logs in real-time. Server logs appear
          in the terminal where you run <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}
