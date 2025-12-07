/**
 * Browser-compatible logger that mirrors the backend logger API
 * This provides consistent logging across frontend and backend
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogMetadata {
  [key: string]: any;
}

interface LoggerConfig {
  serviceName?: string;
  minLevel?: LogLevel;
}

class BrowserLogger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(config: LoggerConfig = {}) {
    this.serviceName = config.serviceName || "portal";
    this.minLevel = config.minLevel ?? (process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG);
  }

  debug(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error | LogMetadata, meta?: LogMetadata): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, {
        error: error.message,
        stack: error.stack,
        ...meta,
      });
    } else {
      this.log(LogLevel.ERROR, message, error);
    }
  }

  private log(level: LogLevel, message: string, meta?: LogMetadata): void {
    if (level < this.minLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const prefix = `[${levelName}] ${timestamp} [${this.serviceName}]`;

    const metaStr = meta && Object.keys(meta).length > 0 ? JSON.stringify(meta) : "";

    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, metaStr);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, metaStr);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, metaStr);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, message, metaStr);
        break;
    }
  }
}

export function createLogger(config?: LoggerConfig): BrowserLogger {
  return new BrowserLogger(config);
}
