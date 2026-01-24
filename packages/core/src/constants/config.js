"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_CONFIG = exports.DATABASE_CONFIG = exports.SECURITY_CONFIG = exports.RATE_LIMITS = exports.CACHE_KEYS = exports.HTTP_STATUS_CODES = exports.ERROR_CODES = exports.VALIDATION_RULES = exports.MAX_FILE_SIZE = exports.SUPPORTED_FILE_FORMATS = exports.API_ENDPOINTS = exports.ENV_VAR_NAMES = exports.DEFAULT_CONFIG = exports.LOG_LEVELS = exports.USER_INTENTS = exports.TASK_STATUSES = exports.TASK_PRIORITIES = exports.EMOTION_KEYWORDS = exports.DIFFICULTY_LEVELS = exports.LEARNING_MODULES = void 0;
exports.LEARNING_MODULES = [
    '资料分析',
    '数量关系',
    '言语理解',
    '判断推理',
    '常识判断',
    '申论写作',
    '面试技巧',
    '时政热点',
    '法律基础',
    '经济管理',
];
exports.DIFFICULTY_LEVELS = [
    'easy',
    'medium',
    'hard',
];
exports.EMOTION_KEYWORDS = [
    '焦虑',
    '压力',
    '紧张',
    '挫败',
    '迷茫',
    '疲惫',
    '兴奋',
    '积极',
    '自信',
    '期待',
];
exports.TASK_PRIORITIES = [
    'low',
    'medium',
    'high',
    'urgent',
];
exports.TASK_STATUSES = [
    'todo',
    'in_progress',
    'completed',
    'cancelled',
];
exports.USER_INTENTS = [
    'create_task',
    'update_task',
    'delete_task',
    'list_tasks',
    'search_knowledge',
    'study_material',
    'exam_simulation',
    'progress_tracking',
    'emotional_support',
    'general_inquiry',
];
exports.LOG_LEVELS = [
    'DEBUG',
    'INFO',
    'WARN',
    'ERROR',
];
exports.DEFAULT_CONFIG = {
    rag: {
        topK: 3,
        minScore: 0.5,
        maxResults: 10,
        chunkSize: 1000,
        chunkOverlap: 200,
    },
    task: {
        defaultPriority: 'medium',
        defaultStatus: 'todo',
        maxTasksPerUser: 100,
        taskRetentionDays: 30,
    },
    study: {
        dailyGoalMinutes: 60,
        defaultDifficulty: 'medium',
        reviewIntervalDays: 7,
        streakThreshold: 3,
    },
    agent: {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 2000,
        ragEnabled: true,
        mcpEnabled: true,
    },
    api: {
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
    },
    logging: {
        maxLogs: 1000,
        logLevel: 'INFO',
        enableConsole: true,
        enableFile: false,
    },
};
exports.ENV_VAR_NAMES = {
    ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
    OPENAI_API_KEY: 'OPENAI_API_KEY',
    BAIDIAN_API_KEY: 'BAIDIAN_API_KEY',
    FEISHU_APP_ID: 'FEISHU_APP_ID',
    FEISHU_APP_SECRET: 'FEISHU_APP_SECRET',
    DATABASE_URL: 'DATABASE_URL',
    REDIS_URL: 'REDIS_URL',
    LOG_LEVEL: 'LOG_LEVEL',
    NODE_ENV: 'NODE_ENV',
    PORT: 'PORT',
};
exports.API_ENDPOINTS = {
    RAG: '/api/rag',
    TASKS: '/api/tasks',
    USERS: '/api/users',
    STUDY: '/api/study',
    EXAM: '/api/exam',
    FEEDBACK: '/api/feedback',
    HEALTH: '/api/health',
};
exports.SUPPORTED_FILE_FORMATS = [
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.md',
    '.xlsx',
    '.pptx',
];
exports.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
exports.VALIDATION_RULES = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^1[3-9]\d{9}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
    TASK_TITLE: /^.{1,100}$/,
    TASK_DESCRIPTION: /^.{0,500}$/,
};
exports.ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};
exports.HTTP_STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
};
exports.CACHE_KEYS = {
    USER_PREFERENCES: 'user_preferences:{userId}',
    STUDY_PROGRESS: 'study_progress:{userId}:{moduleId}',
    RAG_CACHE: 'rag_cache:{query}',
    TASK_CACHE: 'task_cache:{taskId}',
    EXAM_RESULTS: 'exam_results:{userId}',
    API_RATE_LIMIT: 'api_rate_limit:{userId}:{endpoint}',
};
exports.RATE_LIMITS = {
    API_DEFAULT: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // requests per window
    },
    RAG_DEFAULT: {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // requests per window
    },
    TASK_DEFAULT: {
        windowMs: 60 * 1000, // 1 minute
        max: 5, // requests per window
    },
};
exports.SECURITY_CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    JWT_EXPIRES_IN: '7d',
    BCRYPT_ROUNDS: 12,
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
exports.DATABASE_CONFIG = {
    MAX_CONNECTIONS: 10,
    MIN_CONNECTIONS: 2,
    CONNECTION_TIMEOUT: 30000,
    IDLE_TIMEOUT: 60000,
    MAX_LIFETIME: 1800000, // 30 minutes
};
exports.REDIS_CONFIG = {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT || '6379'),
    PASSWORD: process.env.REDIS_PASSWORD || '',
    DB: parseInt(process.env.REDIS_DB || '0'),
};
