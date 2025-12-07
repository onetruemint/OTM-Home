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
  outputFormat?: 'text' | 'json';
  maskSensitiveData?: boolean;
  logstash?: {
    host: string;
    port: number;
  };
}

export interface TimerResult {
  duration: number;
  metadata?: LogMetadata;
}

// Sensitive data patterns to mask
const SENSITIVE_PATTERNS = [
  { pattern: /(password|passwd|pwd)["']?\s*[:=]\s*["']?([^"',\s}]+)/gi, replacement: '$1: [REDACTED]' },
  { pattern: /(token|api_key|apikey|secret|auth)["']?\s*[:=]\s*["']?([^"',\s}]+)/gi, replacement: '$1: [REDACTED]' },
  { pattern: /(bearer\s+)([a-zA-Z0-9\-._~+/]+=*)/gi, replacement: '$1[REDACTED]' },
  { pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replacement: '[EMAIL_REDACTED]' },
];

export class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private enableColors: boolean;
  private outputFormat: 'text' | 'json';
  private maskSensitiveData: boolean;
  private logstashConfig?: { host: string; port: number };
  private logstashClient?: any;
  private context: LogMetadata = {};

  constructor(config: LoggerConfig = {}) {
    this.serviceName = config.serviceName || "app";
    this.minLevel =
      config.minLevel ??
      (process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG);
    this.enableColors = config.enableColors ?? process.env.NODE_ENV !== "production";
    this.outputFormat = config.outputFormat ?? (process.env.NODE_ENV === "production" ? 'json' : 'text');
    this.maskSensitiveData = config.maskSensitiveData ?? true;
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

  /**
   * Create a timer for measuring operation duration
   * @param operation Name of the operation being timed
   * @returns A function to stop the timer and log the result
   */
  startTimer(operation: string): () => TimerResult {
    const startTime = Date.now();
    return (): TimerResult => {
      const duration = Date.now() - startTime;
      return { duration };
    };
  }

  /**
   * Time an async operation and automatically log the result
   * @param operation Name of the operation
   * @param fn Async function to execute
   * @param meta Additional metadata
   */
  async timeAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    meta?: LogMetadata
  ): Promise<T> {
    const timer = this.startTimer(operation);
    try {
      const result = await fn();
      const { duration } = timer();
      this.info(`${operation} completed`, {
        duration_ms: duration,
        ...meta
      });
      return result;
    } catch (error) {
      const { duration } = timer();
      this.error(`${operation} failed`, error as Error, {
        duration_ms: duration,
        ...meta
      });
      throw error;
    }
  }

  /**
   * Create a child logger with additional context (e.g., requestId, correlationId)
   */
  child(context: LogMetadata): Logger {
    const childLogger = new Logger({
      serviceName: this.serviceName,
      minLevel: this.minLevel,
      enableColors: this.enableColors,
      outputFormat: this.outputFormat,
      maskSensitiveData: this.maskSensitiveData,
      logstash: this.logstashConfig,
    });
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  /**
   * Mask sensitive data in strings
   */
  private maskSensitive(value: string): string {
    if (!this.maskSensitiveData) {
      return value;
    }

    let masked = value;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
      masked = masked.replace(pattern, replacement);
    }
    return masked;
  }

  /**
   * Recursively mask sensitive data in objects
   */
  private maskSensitiveInObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.maskSensitive(obj);
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveInObject(item));
    }

    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('password') || lowerKey.includes('secret') ||
          lowerKey.includes('token') || lowerKey.includes('api_key') ||
          lowerKey.includes('apikey') || lowerKey.includes('auth')) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = this.maskSensitiveInObject(value);
      }
    }
    return masked;
  }

  private log(level: LogLevel, message: string, meta?: LogMetadata): void {
    if (level < this.minLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    // Mask sensitive data in message and metadata
    const maskedMessage = this.maskSensitive(message);
    const maskedMeta = meta ? this.maskSensitiveInObject(meta) : {};

    const logData = {
      timestamp,
      level: levelName,
      service: this.serviceName,
      message: maskedMessage,
      ...this.context,
      ...maskedMeta,
    };

    // Send to Logstash if configured
    this.sendToLogstash(logData);

    // Output to console based on format
    if (this.outputFormat === 'json') {
      const jsonOutput = JSON.stringify(logData);
      switch (level) {
        case LogLevel.ERROR:
          console.error(jsonOutput);
          break;
        case LogLevel.WARN:
          console.warn(jsonOutput);
          break;
        default:
          console.log(jsonOutput);
      }
    } else {
      // Text format
      const coloredLevel = this.enableColors
        ? this.colorize(levelName, level)
        : levelName;

      let output = `[${coloredLevel}] ${timestamp} [${this.serviceName}] ${maskedMessage}`;

      // Add metadata to output if present
      if (Object.keys(maskedMeta).length > 0) {
        output += ` ${JSON.stringify(maskedMeta)}`;
      }

      switch (level) {
        case LogLevel.ERROR:
          console.error(output);
          break;
        case LogLevel.WARN:
          console.warn(output);
          break;
        default:
          console.log(output);
      }
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

/**
 * Generate a unique request ID for correlation tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a unique correlation ID for distributed tracing
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
