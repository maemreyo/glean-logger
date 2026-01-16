// Demo components showcasing logging features

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { browserLogger } from '@/lib/browser-logger';

// Demo user type
interface User {
  id: number;
  name: string;
  email: string;
}

// Simulated API call (replace with real API in production)
async function fetchUsers(): Promise<User[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com' },
  ];
}

async function fetchUser(id: number): Promise<User | null> {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (id === 999) {
    throw new Error('User not found');
  }
  return { id, name: 'Test User', email: 'test@example.com' };
}

export function UserList() {
  const query = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  if (query.isLoading) {
    return <div style={{ padding: '1rem' }}>Loading users...</div>;
  }

  if (query.isError) {
    return (
      <div style={{ padding: '1rem', color: '#dc2626' }}>
        Error loading users: {query.error?.message}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1rem' }}>User List (React Query)</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {query.data?.map(user => (
          <li
            key={user.id}
            style={{
              padding: '0.75rem',
              borderBottom: '1px solid #eee',
            }}
          >
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UserFetcher() {
  const [userId, setUserId] = useState(1);

  const query = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: userId > 0,
  });

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>Fetch User by ID</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="number"
          value={userId}
          onChange={e => setUserId(parseInt(e.target.value) || 1)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            width: '80px',
          }}
        />
        <button
          onClick={() => query.refetch()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Fetch
        </button>
      </div>

      {query.isLoading && <p>Loading...</p>}
      {query.isError && <p style={{ color: '#dc2626' }}>Error: {query.error?.message}</p>}
      {query.data && (
        <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <strong>User:</strong> {query.data.name} ({query.data.email})
        </div>
      )}
    </div>
  );
}

export function ManualLogDemo() {
  const handleInfo = () => {
    browserLogger.info('Manual info log', { userId: 123, action: 'click' });
  };

  const handleError = () => {
    browserLogger.error('Manual error log', { errorCode: 'TEST_ERROR', context: 'demo' });
  };

  const handleException = () => {
    try {
      throw new Error('This is a test exception');
    } catch (error) {
      browserLogger.logException(error as Error, { context: 'manual-exception-demo' });
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>Manual Logging Demo</h3>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleInfo}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Log Info
        </button>
        <button
          onClick={handleError}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f5a623',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Log Error
        </button>
        <button
          onClick={handleException}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Throw & Log Exception
        </button>
      </div>
    </div>
  );
}
