export declare const LEARNING_MODULES: readonly ["资料分析", "数量关系", "言语理解", "判断推理", "常识判断", "申论写作", "面试技巧", "时政热点", "法律基础", "经济管理"];
export type LearningModule = typeof LEARNING_MODULES[number];
export declare const DIFFICULTY_LEVELS: readonly ["easy", "medium", "hard"];
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];
export declare const EMOTION_KEYWORDS: readonly ["焦虑", "压力", "紧张", "挫败", "迷茫", "疲惫", "兴奋", "积极", "自信", "期待"];
export type EmotionKeyword = typeof EMOTION_KEYWORDS[number];
export declare const TASK_PRIORITIES: readonly ["low", "medium", "high", "urgent"];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export declare const TASK_STATUSES: readonly ["todo", "in_progress", "completed", "cancelled"];
export type TaskStatus = typeof TASK_STATUSES[number];
export declare const USER_INTENTS: readonly ["create_task", "update_task", "delete_task", "list_tasks", "search_knowledge", "study_material", "exam_simulation", "progress_tracking", "emotional_support", "general_inquiry"];
export type UserIntent = typeof USER_INTENTS[number];
export declare const LOG_LEVELS: readonly ["DEBUG", "INFO", "WARN", "ERROR"];
export type LogLevel = typeof LOG_LEVELS[number];
export declare const DEFAULT_CONFIG: {
    readonly rag: {
        readonly topK: 3;
        readonly minScore: 0.5;
        readonly maxResults: 10;
        readonly chunkSize: 1000;
        readonly chunkOverlap: 200;
    };
    readonly task: {
        readonly defaultPriority: TaskPriority;
        readonly defaultStatus: TaskStatus;
        readonly maxTasksPerUser: 100;
        readonly taskRetentionDays: 30;
    };
    readonly study: {
        readonly dailyGoalMinutes: 60;
        readonly defaultDifficulty: DifficultyLevel;
        readonly reviewIntervalDays: 7;
        readonly streakThreshold: 3;
    };
    readonly agent: {
        readonly model: "claude-3-sonnet-20240229";
        readonly temperature: 0.7;
        readonly maxTokens: 2000;
        readonly ragEnabled: true;
        readonly mcpEnabled: true;
    };
    readonly api: {
        readonly timeout: 30000;
        readonly retryAttempts: 3;
        readonly retryDelay: 1000;
    };
    readonly logging: {
        readonly maxLogs: 1000;
        readonly logLevel: LogLevel;
        readonly enableConsole: true;
        readonly enableFile: false;
    };
};
export declare const ENV_VAR_NAMES: {
    readonly ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY";
    readonly OPENAI_API_KEY: "OPENAI_API_KEY";
    readonly BAIDIAN_API_KEY: "BAIDIAN_API_KEY";
    readonly FEISHU_APP_ID: "FEISHU_APP_ID";
    readonly FEISHU_APP_SECRET: "FEISHU_APP_SECRET";
    readonly DATABASE_URL: "DATABASE_URL";
    readonly REDIS_URL: "REDIS_URL";
    readonly LOG_LEVEL: "LOG_LEVEL";
    readonly NODE_ENV: "NODE_ENV";
    readonly PORT: "PORT";
};
export declare const API_ENDPOINTS: {
    readonly RAG: "/api/rag";
    readonly TASKS: "/api/tasks";
    readonly USERS: "/api/users";
    readonly STUDY: "/api/study";
    readonly EXAM: "/api/exam";
    readonly FEEDBACK: "/api/feedback";
    readonly HEALTH: "/api/health";
};
export declare const SUPPORTED_FILE_FORMATS: readonly [".pdf", ".doc", ".docx", ".txt", ".md", ".xlsx", ".pptx"];
export declare const MAX_FILE_SIZE: number;
export declare const VALIDATION_RULES: {
    readonly EMAIL: RegExp;
    readonly PHONE: RegExp;
    readonly PASSWORD: RegExp;
    readonly USERNAME: RegExp;
    readonly TASK_TITLE: RegExp;
    readonly TASK_DESCRIPTION: RegExp;
};
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR";
    readonly AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR";
    readonly NOT_FOUND_ERROR: "NOT_FOUND_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly TIMEOUT_ERROR: "TIMEOUT_ERROR";
    readonly RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR";
    readonly EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR";
};
export declare const HTTP_STATUS_CODES: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly BAD_GATEWAY: 502;
    readonly SERVICE_UNAVAILABLE: 503;
    readonly GATEWAY_TIMEOUT: 504;
};
export declare const CACHE_KEYS: {
    readonly USER_PREFERENCES: "user_preferences:{userId}";
    readonly STUDY_PROGRESS: "study_progress:{userId}:{moduleId}";
    readonly RAG_CACHE: "rag_cache:{query}";
    readonly TASK_CACHE: "task_cache:{taskId}";
    readonly EXAM_RESULTS: "exam_results:{userId}";
    readonly API_RATE_LIMIT: "api_rate_limit:{userId}:{endpoint}";
};
export declare const RATE_LIMITS: {
    readonly API_DEFAULT: {
        readonly windowMs: number;
        readonly max: 100;
    };
    readonly RAG_DEFAULT: {
        readonly windowMs: number;
        readonly max: 10;
    };
    readonly TASK_DEFAULT: {
        readonly windowMs: number;
        readonly max: 5;
    };
};
export declare const SECURITY_CONFIG: {
    readonly JWT_SECRET: string;
    readonly JWT_EXPIRES_IN: "7d";
    readonly BCRYPT_ROUNDS: 12;
    readonly SESSION_SECRET: string;
    readonly CORS_ORIGIN: string;
};
export declare const DATABASE_CONFIG: {
    readonly MAX_CONNECTIONS: 10;
    readonly MIN_CONNECTIONS: 2;
    readonly CONNECTION_TIMEOUT: 30000;
    readonly IDLE_TIMEOUT: 60000;
    readonly MAX_LIFETIME: 1800000;
};
export declare const REDIS_CONFIG: {
    readonly HOST: string;
    readonly PORT: number;
    readonly PASSWORD: string;
    readonly DB: number;
};
