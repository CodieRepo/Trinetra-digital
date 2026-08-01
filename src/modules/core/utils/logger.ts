export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

export class Logger {
  private static formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogPayload {
    return {
      message,
      level,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
      ...(error && { error: { name: error.name, message: error.message, stack: error.stack } })
    };
  }

  public static info(message: string, context?: Record<string, unknown>): void {
    console.log(JSON.stringify(this.formatLog('info', message, context)));
  }

  public static warn(message: string, context?: Record<string, unknown>): void {
    console.warn(JSON.stringify(this.formatLog('warn', message, context)));
  }

  public static error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(JSON.stringify(this.formatLog('error', message, context, error)));
  }

  public static debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify(this.formatLog('debug', message, context)));
    }
  }
}
