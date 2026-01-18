import { NextRequest, NextResponse } from 'next/server';
import { measure, logger, normalizeBrowserLogEntry, serializeError } from '@zaob/glean-logger';
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
        timestamp: number;
        level: string;
        source: 'console' | 'api' | 'error';
        message: string;
        context?: Record<string, unknown>;
      }>;
    };

    // Use measure() to track processing time
    const { result: processedCount, duration } = await measure('process-browser-logs', async () => {
      let count = 0;
      for (const logEntry of logs) {
        // Normalize the entry to clean structure
        const normalized = normalizeBrowserLogEntry({
          id: logEntry.id,
          timestamp: logEntry.timestamp,
          level: logEntry.level,
          message: logEntry.message,
          context: logEntry.context,
          source: logEntry.source,
        });

        // Create clean log data for server logger
        const logData: Record<string, unknown> = {
          browserId: logEntry.id,
          browserTimestamp: logEntry.timestamp,
          browserSource: logEntry.source,
        };

        // Add normalized context (already cleaned of internal fields)
        if (normalized.context) {
          Object.assign(logData, normalized.context);
        }

        // Add error info if present
        if (normalized.error) {
          logData.error = normalized.error;
        }

        switch (logEntry.level) {
          case 'debug':
            serverLogger.debug(normalized.message, logData);
            break;
          case 'info':
            serverLogger.info(normalized.message, logData);
            break;
          case 'warn':
            serverLogger.warn(normalized.message, logData);
            break;
          case 'error':
          case 'fatal':
            serverLogger.error(normalized.message, logData);
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
      error: serializeError(error),
      duration: `${totalDuration}ms`,
      type: 'error',
    });

    return NextResponse.json({ success: false, error: 'Failed to process logs' }, { status: 500 });
  }
}
