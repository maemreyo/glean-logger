import { NextRequest, NextResponse } from 'next/server';
import { measure } from '@zaob/glean-logger';

// Simple server-side logger using child() from @zaob/glean-logger
// In production, this would use Winston with file rotation
const createServerLogger = (service: string) => {
  return {
    info: (message: string, metadata?: Record<string, unknown>) => {
      console.log(`[${service}] INFO: ${message}`, metadata ? JSON.stringify(metadata) : '');
    },
    error: (message: string, metadata?: Record<string, unknown>) => {
      console.error(`[${service}] ERROR: ${message}`, metadata ? JSON.stringify(metadata) : '');
    },
    warn: (message: string, metadata?: Record<string, unknown>) => {
      console.warn(`[${service}] WARN: ${message}`, metadata ? JSON.stringify(metadata) : '');
    },
  };
};

const apiLog = createServerLogger('api/hello');

export async function GET(request: NextRequest) {
  apiLog.info('API route called', { path: '/api/hello' });

  const { result, duration } = await measure('hello-api', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { message: 'Hello from API!', timestamp: Date.now() };
  });

  apiLog.info('API response', { duration: `${duration.toFixed(2)}ms` });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  apiLog.info('POST request received', { data: JSON.stringify(body) });

  return NextResponse.json({
    received: true,
    data: body,
    timestamp: Date.now(),
  });
}
