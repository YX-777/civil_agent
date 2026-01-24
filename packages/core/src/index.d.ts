import { DEFAULT_CONFIG } from './constants/config';
import { CivilAgentError } from './utils/error';
export * from './types';
export * from './utils/logger';
export * from './utils/error';
export * from './constants/prompts';
export * from './constants/config';
export { logger, LogLevel, LogEntry } from './utils/logger';
export { CivilAgentError, MCPToolError, RAGRetrievalError, AgentExecutionError, ConfigurationError, ValidationError, NetworkError, isCivilAgentError, getErrorDetails, createErrorFromResponse, handleErrors, logError, shouldRetry, getRetryDelay, } from './utils/error';
export { SYSTEM_PROMPTS, USER_PROMPTS, LANGGRAPH_PROMPTS, EXAM_PROMPTS, FEEDBACK_PROMPTS, MOTIVATION_PROMPTS, } from './constants/prompts';
export { LEARNING_MODULES, DIFFICULTY_LEVELS, EMOTION_KEYWORDS, TASK_PRIORITIES, TASK_STATUSES, USER_INTENTS, LOG_LEVELS, DEFAULT_CONFIG, ENV_VAR_NAMES, API_ENDPOINTS, SUPPORTED_FILE_FORMATS, MAX_FILE_SIZE, VALIDATION_RULES, ERROR_CODES, HTTP_STATUS_CODES, CACHE_KEYS, RATE_LIMITS, SECURITY_CONFIG, DATABASE_CONFIG, REDIS_CONFIG, } from './constants/config';
export declare const CORE_VERSION = "1.0.0";
export declare const CORE_DESCRIPTION = "Core library providing TypeScript type definitions, logging utilities, error handling, prompt templates, and configuration constants for the civil service agent project.";
export declare function initializeCore(): void;
export declare function getCoreInfo(): {
    version: string;
    description: string;
    types: string[];
    utilities: string[];
    constants: string[];
};
export declare function validateEnvironment(): {
    isValid: boolean;
    missingVars: string[];
    warnings: string[];
};
export declare function createCoreConfig(overrides?: Partial<typeof DEFAULT_CONFIG>): {
    rag: {
        readonly topK: 3;
        readonly minScore: 0.5;
        readonly maxResults: 10;
        readonly chunkSize: 1000;
        readonly chunkOverlap: 200;
    };
    task: {
        readonly defaultPriority: import("./constants/config").TaskPriority;
        readonly defaultStatus: import("./constants/config").TaskStatus;
        readonly maxTasksPerUser: 100;
        readonly taskRetentionDays: 30;
    };
    study: {
        readonly dailyGoalMinutes: 60;
        readonly defaultDifficulty: import("./constants/config").DifficultyLevel;
        readonly reviewIntervalDays: 7;
        readonly streakThreshold: 3;
    };
    agent: {
        readonly model: "claude-3-sonnet-20240229";
        readonly temperature: 0.7;
        readonly maxTokens: 2000;
        readonly ragEnabled: true;
        readonly mcpEnabled: true;
    };
    api: {
        readonly timeout: 30000;
        readonly retryAttempts: 3;
        readonly retryDelay: 1000;
    };
    logging: {
        readonly maxLogs: 1000;
        readonly logLevel: import("./constants/config").LogLevel;
        readonly enableConsole: true;
        readonly enableFile: false;
    };
};
export declare function createError(code: string, message: string, context?: Record<string, any>, retryable?: boolean): CivilAgentError;
export declare function formatPrompt(template: string, variables: Record<string, any>): string;
export declare function sanitizeInput(input: string): string;
export declare function validateEmail(email: string): boolean;
export declare function validatePhone(phone: string): boolean;
export declare function validatePassword(password: string): boolean;
export declare function validateUsername(username: string): boolean;
export declare function generateId(): string;
export declare function formatDate(date: Date): string;
export declare function parseDate(dateString: string): Date;
export declare function calculateTimeAgo(date: Date): string;
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
