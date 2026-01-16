import { NextRequest, NextResponse } from 'next/server';
import { measure, logger } from '@zaob/glean-logger';
import { serverLogger } from '@/lib/server-logger';

const log = logger({ name: 'api-logs' });

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Log the incoming request using glean-logger
  log.info('Incoming logs request', { requestId, type: 'request' });

  try {
    const body = await request.json();
    const { logs } = body as {
      logs: Array<{
        id: string;
        timestamp: string;
        level: string;
        type: string;
        message: string;
        metadata?: Record<string, unknown>;
      }>;
    };

    // Use measure() to track processing time
    const { result: processedCount, duration } = await measure('process-browser-logs', async () => {
      let count = 0;
      for (const logEntry of logs) {
        const logData = {
          browserId: logEntry.id,
          browserTimestamp: logEntry.timestamp,
          browserType: logEntry.type,
          ...logEntry.metadata,
        };

        switch (logEntry.level) {
          case 'debug':
            serverLogger.debug(logEntry.message, logData);
            break;
          case 'info':
            serverLogger.info(logEntry.message, logData);
            break;
          case 'warn':
            serverLogger.warn(logEntry.message, logData);
            break;
          case 'error':
            serverLogger.error(logEntry.message, logData);
            break;
        }
        count++;
      }
      return count;
    });

    const totalDuration = Date.now() - startTime;
    log.info('Processed browser logs', {
      requestId,
      processedCount,
      measureDuration: `${duration}ms`,
      totalDuration: `${totalDuration}ms`,
      type: 'response',
    });

    return NextResponse.json({ success: true, received: processedCount });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    log.error('Failed to process logs', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      duration: `${totalDuration}ms`,
      type: 'error',
    });

    return NextResponse.json({ success: false, error: 'Failed to process logs' }, { status: 500 });
  }
}
