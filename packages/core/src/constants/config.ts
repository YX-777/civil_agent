export const LEARNING_MODULES = [
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
] as const;

export type LearningModule = typeof LEARNING_MODULES[number];

export const DIFFICULTY_LEVELS = [
  'easy',
  'medium',
  'hard',
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

export const EMOTION_KEYWORDS = [
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
] as const;

export type EmotionKeyword = typeof EMOTION_KEYWORDS[number];

export const TASK_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;

export type TaskPriority = typeof TASK_PRIORITIES[number];

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type TaskStatus = typeof TASK_STATUSES[number];

export const USER_INTENTS = [
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
] as const;

export type UserIntent = typeof USER_INTENTS[number];

export const LOG_LEVELS = [
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR',
] as const;

export type LogLevel = typeof LOG_LEVELS[number];

export const DEFAULT_CONFIG = {
  rag: {
    topK: 3,
    minScore: 0.5,
    maxResults: 10,
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  task: {
    defaultPriority: 'medium' as TaskPriority,
    defaultStatus: 'todo' as TaskStatus,
    maxTasksPerUser: 100,
    taskRetentionDays: 30,
  },
  study: {
    dailyGoalMinutes: 60,
    defaultDifficulty: 'medium' as DifficultyLevel,
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
    logLevel: 'INFO' as LogLevel,
    enableConsole: true,
    enableFile: false,
  },
} as const;

export const ENV_VAR_NAMES = {
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
} as const;

export const API_ENDPOINTS = {
  RAG: '/api/rag',
  TASKS: '/api/tasks',
  USERS: '/api/users',
  STUDY: '/api/study',
  EXAM: '/api/exam',
  FEEDBACK: '/api/feedback',
  HEALTH: '/api/health',
} as const;

export const SUPPORTED_FILE_FORMATS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.xlsx',
  '.pptx',
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  TASK_TITLE: /^.{1,100}$/,
  TASK_DESCRIPTION: /^.{0,500}$/,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export const HTTP_STATUS_CODES = {
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
} as const;

export const CACHE_KEYS = {
  USER_PREFERENCES: 'user_preferences:{userId}',
  STUDY_PROGRESS: 'study_progress:{userId}:{moduleId}',
  RAG_CACHE: 'rag_cache:{query}',
  TASK_CACHE: 'task_cache:{taskId}',
  EXAM_RESULTS: 'exam_results:{userId}',
  API_RATE_LIMIT: 'api_rate_limit:{userId}:{endpoint}',
} as const;

export const RATE_LIMITS = {
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
} as const;

export const SECURITY_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: '7d',
  BCRYPT_ROUNDS: 12,
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;

export const DATABASE_CONFIG = {
  MAX_CONNECTIONS: 10,
  MIN_CONNECTIONS: 2,
  CONNECTION_TIMEOUT: 30000,
  IDLE_TIMEOUT: 60000,
  MAX_LIFETIME: 1800000, // 30 minutes
} as const;

export const REDIS_CONFIG = {
  HOST: process.env.REDIS_HOST || 'localhost',
  PORT: parseInt(process.env.REDIS_PORT || '6379'),
  PASSWORD: process.env.REDIS_PASSWORD || '',
  DB: parseInt(process.env.REDIS_DB || '0'),
} as const;