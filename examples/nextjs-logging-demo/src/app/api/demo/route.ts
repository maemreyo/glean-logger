import { NextResponse } from 'next/server';
import { measure } from '@zaob/glean-logger';
import { logApiResponse, logServerEvent } from '@/lib/server-logger';

export async function GET() {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  logServerEvent('Demo API called', { requestId });

  try {
    const { result, duration } = await measure('demo-api-handler', async () => {
      // Simulate some processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const data = {
        message: 'Hello from logged API!',
        timestamp: new Date().toISOString(),
        requestId,
      };
      return data;
    });

    const totalDuration = Date.now() - startTime;
    logServerEvent('Demo API response', {
      requestId,
      measureDuration: `${duration}ms`,
      totalDuration: `${totalDuration}ms`,
    });

    // Log response with body content
    logApiResponse('GET', '/api/demo', requestId, 200, totalDuration, result);

    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logServerEvent('Demo API error', {
      requestId,
      error: String(error),
      duration: `${duration}ms`,
    });
    logApiResponse('GET', '/api/demo', requestId, 500, duration);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
