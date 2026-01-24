export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  context?: string;
}

export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  public debug(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log(LogLevel.DEBUG, message, metadata, context);
  }

  public info(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log(LogLevel.INFO, message, metadata, context);
  }

  public warn(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log(LogLevel.WARN, message, metadata, context);
  }

  public error(message: string, error?: Error | string, metadata?: Record<string, any>, context?: string): void {
    const errorMetadata = error instanceof Error ? {
      error: error.message,
      stack: error.stack,
      ...metadata
    } : metadata;
    
    this.log(LogLevel.ERROR, message, errorMetadata, context);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, context?: string): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata,
      context,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const metadataStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';

    const logMessage = `[${timestamp}] ${levelName} ${contextStr}: ${entry.message}${metadataStr}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  public getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public setMaxLogs(max: number): void {
    this.maxLogs = max;
    if (this.logs.length > max) {
      this.logs = this.logs.slice(-max);
    }
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public exportLogsByLevel(level: LogLevel): string {
    const filteredLogs = this.logs.filter(log => log.level >= level);
    return JSON.stringify(filteredLogs, null, 2);
  }
}

export const logger = Logger.getInstance();

export function initializeLogger(): void {
  const logLevelEnv = process.env.LOG_LEVEL;
  if (logLevelEnv) {
    const level = LogLevel[logLevelEnv.toUpperCase() as keyof typeof LogLevel];
    if (level !== undefined) {
      logger.setLevel(level);
    }
  }
}

initializeLogger();