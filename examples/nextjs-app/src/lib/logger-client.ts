'use client';

interface LogEntry {
  id: number;
  level: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class ClientLogger {
  private logs: LogEntry[] = [];
  private id = 0;

  private log(level: string, message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      id: ++this.id,
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.logs.unshift(entry);

    // Console output with styling
    const styles: Record<string, string> = {
      info: 'color: #0070f3',
      debug: 'color: #666',
      warn: 'color: #f5a623',
      error: 'color: #dc2626',
    };

    console.log(
      `%c[${level.toUpperCase()}] ${message}`,
      styles[level] || 'color: inherit',
      metadata || ''
    );
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>) {
    this.log('error', message, metadata);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

export const clientLog = new ClientLogger();
