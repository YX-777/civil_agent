"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
exports.initializeLogger = initializeLogger;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.level = LogLevel.INFO;
        this.logs = [];
        this.maxLogs = 1000;
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLevel(level) {
        this.level = level;
    }
    getLevel() {
        return this.level;
    }
    debug(message, metadata, context) {
        this.log(LogLevel.DEBUG, message, metadata, context);
    }
    info(message, metadata, context) {
        this.log(LogLevel.INFO, message, metadata, context);
    }
    warn(message, metadata, context) {
        this.log(LogLevel.WARN, message, metadata, context);
    }
    error(message, error, metadata, context) {
        const errorMetadata = error instanceof Error ? {
            error: error.message,
            stack: error.stack,
            ...metadata
        } : metadata;
        this.log(LogLevel.ERROR, message, errorMetadata, context);
    }
    log(level, message, metadata, context) {
        if (level < this.level) {
            return;
        }
        const entry = {
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
    output(entry) {
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
    getLogs(level) {
        if (level) {
            return this.logs.filter(log => log.level >= level);
        }
        return [...this.logs];
    }
    clearLogs() {
        this.logs = [];
    }
    setMaxLogs(max) {
        this.maxLogs = max;
        if (this.logs.length > max) {
            this.logs = this.logs.slice(-max);
        }
    }
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
    exportLogsByLevel(level) {
        const filteredLogs = this.logs.filter(log => log.level >= level);
        return JSON.stringify(filteredLogs, null, 2);
    }
}
exports.Logger = Logger;
exports.logger = Logger.getInstance();
function initializeLogger() {
    const logLevelEnv = process.env.LOG_LEVEL;
    if (logLevelEnv) {
        const level = LogLevel[logLevelEnv.toUpperCase()];
        if (level !== undefined) {
            exports.logger.setLevel(level);
        }
    }
}
initializeLogger();
