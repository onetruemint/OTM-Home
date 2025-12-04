export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogMetadata {
  [key: string]: any;
}

export interface LoggerConfig {
  serviceName?: string;
  minLevel?: LogLevel;
  enableColors?: boolean;
  logstash?: {
    host: string;
    port: number;
  };
}

export class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private enableColors: boolean;
  private logstashConfig?: { host: string; port: number };
  private logstashClient?: any;
  private context: LogMetadata = {};

  constructor(config: LoggerConfig = {}) {
    this.serviceName = config.serviceName || "app";
    this.minLevel =
      config.minLevel ??
      (process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG);
    this.enableColors = config.enableColors ?? process.env.NODE_ENV !== "production";
    this.logstashConfig = config.logstash;

    if (this.logstashConfig) {
      this.initLogstash();
    }
  }

  private async initLogstash(): Promise<void> {
    if (!this.logstashConfig) return;

    try {
      const net = await import("net");
      this.logstashClient = net.createConnection(
        this.logstashConfig.port,
        this.logstashConfig.host
      );

      this.logstashClient.on("error", (err: Error) => {
        console.error("Logstash connection error:", err.message);
        this.logstashClient = undefined;
      });

      this.logstashClient.on("connect", () => {
        console.log(
          `Logger connected to Logstash at ${this.logstashConfig!.host}:${this.logstashConfig!.port}`
        );
      });
    } catch (err) {
      console.error("Failed to initialize Logstash client:", err);
    }
  }

  private sendToLogstash(logData: any): void {
    if (this.logstashClient && this.logstashClient.writable) {
      try {
        this.logstashClient.write(JSON.stringify(logData) + "\n");
      } catch (err) {
        console.error("Failed to send log to Logstash:", err);
      }
    }
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

  child(context: LogMetadata): Logger {
    const childLogger = new Logger({
      serviceName: this.serviceName,
      minLevel: this.minLevel,
      enableColors: this.enableColors,
      logstash: this.logstashConfig,
    });
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  private log(level: LogLevel, message: string, meta?: LogMetadata): void {
    if (level < this.minLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const coloredLevel = this.enableColors
      ? this.colorize(levelName, level)
      : levelName;

    const logData = {
      timestamp,
      level: levelName,
      service: this.serviceName,
      message,
      ...this.context,
      ...meta,
    };

    // Send to Logstash if configured
    this.sendToLogstash(logData);

    // Also output to console
    const output = `[${coloredLevel}] ${timestamp} [${this.serviceName}] ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(output, meta ? meta : "");
        break;
      case LogLevel.WARN:
        console.warn(output, meta ? meta : "");
        break;
      default:
        console.log(output, meta ? meta : "");
    }
  }

  private colorize(text: string, level: LogLevel): string {
    if (!this.enableColors) {
      return text;
    }

    const colors = {
      [LogLevel.DEBUG]: "\x1b[36m", // Cyan
      [LogLevel.INFO]: "\x1b[32m", // Green
      [LogLevel.WARN]: "\x1b[33m", // Yellow
      [LogLevel.ERROR]: "\x1b[31m", // Red
    };

    const reset = "\x1b[0m";
    return `${colors[level]}${text}${reset}`;
  }
}

export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}
