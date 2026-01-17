// @ts-nocheck
/**
 * MIT License
 *
 * Copyright (c) 2026 Zaob <zaob.ogn@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Next.js API Route for Browser Log Reception
 *
 * Feature: 001-browser-log-sync
 * Receives batched browser logs from the client transport and writes them to file.
 *
 * USAGE:
 * - This file is automatically copied to your project by the @zaob/glean-logger Next.js plugin
 * - Or manually copy to: src/app/api/logger/route.ts
 *
 * ENVIRONMENT VARIABLES:
 * - LOG_DIR: Directory for log files (default: ./_logs)
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { NextRequest } from 'next/server';

// Type definitions for the log entry
interface ClientLogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: 'console' | 'api' | 'error';
  context?: Record<string, unknown>;
}

interface LogWriteResponse {
  success: boolean;
  count: number;
}

/**
 * Validate that an object is a valid ClientLogEntry
 */
function isValidClientLogEntry(entry: unknown): entry is ClientLogEntry {
  if (!entry || typeof entry !== 'object') {
    return false;
  }

  const e = entry as Record<string, unknown>;

  // Required fields
  if (typeof e.id !== 'string' || e.id.length === 0) {
    return false;
  }
  if (typeof e.timestamp !== 'number' || e.timestamp <= 0) {
    return false;
  }
  if (
    typeof e.level !== 'string' ||
    !['debug', 'info', 'warn', 'error', 'fatal'].includes(e.level)
  ) {
    return false;
  }
  if (typeof e.message !== 'string' || e.message.length === 0) {
    return false;
  }
  if (typeof e.source !== 'string' || !['console', 'api', 'error'].includes(e.source)) {
    return false;
  }

  return true;
}

/**
 * Validate the request payload
 */
function validatePayload(body: unknown): {
  valid: boolean;
  logs?: ClientLogEntry[];
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const payload = body as { logs?: unknown };

  if (!Array.isArray(payload.logs)) {
    return { valid: false, error: "Invalid payload: 'logs' must be an array" };
  }

  if (payload.logs.length === 0) {
    return { valid: false, error: "Invalid payload: 'logs' array is empty" };
  }

  const logs: ClientLogEntry[] = [];
  for (let i = 0; i < payload.logs.length; i++) {
    const entry = payload.logs[i];
    if (!isValidClientLogEntry(entry)) {
      return { valid: false, error: `Invalid log entry at index ${i}` };
    }
    logs.push(entry);
  }

  return { valid: true, logs };
}

/**
 * Format a log entry for file output
 */
function formatLogEntry(entry: ClientLogEntry): string {
  const formatted = {
    '@timestamp': new Date(entry.timestamp).toISOString(),
    level: entry.level.toUpperCase(),
    message: entry.message,
    id: entry.id,
    source: entry.source,
    timestamp: entry.timestamp,
    context: entry.context,
  };

  return JSON.stringify(formatted);
}

/**
 * POST handler for receiving browser logs
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate payload
    const validation = validatePayload(body);
    if (!validation.valid) {
      return Response.json({ success: false, count: 0 }, { status: 400 });
    }

    const logs = validation.logs!;

    // Get log directory from environment
    const logDir = process.env['LOG_DIR'] || './_logs';

    // Generate filename with current date
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const filename = path.join(logDir, `browser.${dateStr}.log`);

    // Ensure log directory exists
    await fs.mkdir(logDir, { recursive: true });

    // Format and write logs (one JSON per line)
    const logLines = logs.map(formatLogEntry).join('\n') + '\n';
    await fs.appendFile(filename, logLines, 'utf8');

    // Return success response
    return Response.json({
      success: true,
      count: logs.length,
    });
  } catch (error) {
    // Log error to server console
    console.error('[Logger API] Error processing logs:', error);

    // Return error response
    return Response.json({ success: false, count: 0 }, { status: 500 });
  }
}

/**
 * Disable body parsing for this route (we handle it manually)
 */
export const config = {
  api: {
    bodyParser: false,
  },
};
