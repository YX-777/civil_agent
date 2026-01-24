export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    metadata?: Record<string, any>;
    context?: string;
}
export declare class Logger {
    private static instance;
    private level;
    private logs;
    private maxLogs;
    private constructor();
    static getInstance(): Logger;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
    debug(message: string, metadata?: Record<string, any>, context?: string): void;
    info(message: string, metadata?: Record<string, any>, context?: string): void;
    warn(message: string, metadata?: Record<string, any>, context?: string): void;
    error(message: string, error?: Error | string, metadata?: Record<string, any>, context?: string): void;
    private log;
    private output;
    getLogs(level?: LogLevel): LogEntry[];
    clearLogs(): void;
    setMaxLogs(max: number): void;
    exportLogs(): string;
    exportLogsByLevel(level: LogLevel): string;
}
export declare const logger: Logger;
export declare function initializeLogger(): void;
