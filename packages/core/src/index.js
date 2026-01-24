"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORE_DESCRIPTION = exports.CORE_VERSION = exports.REDIS_CONFIG = exports.DATABASE_CONFIG = exports.SECURITY_CONFIG = exports.RATE_LIMITS = exports.CACHE_KEYS = exports.HTTP_STATUS_CODES = exports.ERROR_CODES = exports.VALIDATION_RULES = exports.MAX_FILE_SIZE = exports.SUPPORTED_FILE_FORMATS = exports.API_ENDPOINTS = exports.ENV_VAR_NAMES = exports.DEFAULT_CONFIG = exports.LOG_LEVELS = exports.USER_INTENTS = exports.TASK_STATUSES = exports.TASK_PRIORITIES = exports.EMOTION_KEYWORDS = exports.DIFFICULTY_LEVELS = exports.LEARNING_MODULES = exports.MOTIVATION_PROMPTS = exports.FEEDBACK_PROMPTS = exports.EXAM_PROMPTS = exports.LANGGRAPH_PROMPTS = exports.USER_PROMPTS = exports.SYSTEM_PROMPTS = exports.getRetryDelay = exports.shouldRetry = exports.logError = exports.handleErrors = exports.createErrorFromResponse = exports.getErrorDetails = exports.isCivilAgentError = exports.NetworkError = exports.ValidationError = exports.ConfigurationError = exports.AgentExecutionError = exports.RAGRetrievalError = exports.MCPToolError = exports.CivilAgentError = exports.LogLevel = exports.logger = void 0;
exports.initializeCore = initializeCore;
exports.getCoreInfo = getCoreInfo;
exports.validateEnvironment = validateEnvironment;
exports.createCoreConfig = createCoreConfig;
exports.createError = createError;
exports.formatPrompt = formatPrompt;
exports.sanitizeInput = sanitizeInput;
exports.validateEmail = validateEmail;
exports.validatePhone = validatePhone;
exports.validatePassword = validatePassword;
exports.validateUsername = validateUsername;
exports.generateId = generateId;
exports.formatDate = formatDate;
exports.parseDate = parseDate;
exports.calculateTimeAgo = calculateTimeAgo;
exports.debounce = debounce;
exports.throttle = throttle;
const config_1 = require("./constants/config");
const error_1 = require("./utils/error");
const logger_1 = require("./utils/logger");
__exportStar(require("./types"), exports);
__exportStar(require("./utils/logger"), exports);
__exportStar(require("./utils/error"), exports);
__exportStar(require("./constants/prompts"), exports);
__exportStar(require("./constants/config"), exports);
var logger_2 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_2.logger; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return logger_2.LogLevel; } });
var error_2 = require("./utils/error");
Object.defineProperty(exports, "CivilAgentError", { enumerable: true, get: function () { return error_2.CivilAgentError; } });
Object.defineProperty(exports, "MCPToolError", { enumerable: true, get: function () { return error_2.MCPToolError; } });
Object.defineProperty(exports, "RAGRetrievalError", { enumerable: true, get: function () { return error_2.RAGRetrievalError; } });
Object.defineProperty(exports, "AgentExecutionError", { enumerable: true, get: function () { return error_2.AgentExecutionError; } });
Object.defineProperty(exports, "ConfigurationError", { enumerable: true, get: function () { return error_2.ConfigurationError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return error_2.ValidationError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return error_2.NetworkError; } });
Object.defineProperty(exports, "isCivilAgentError", { enumerable: true, get: function () { return error_2.isCivilAgentError; } });
Object.defineProperty(exports, "getErrorDetails", { enumerable: true, get: function () { return error_2.getErrorDetails; } });
Object.defineProperty(exports, "createErrorFromResponse", { enumerable: true, get: function () { return error_2.createErrorFromResponse; } });
Object.defineProperty(exports, "handleErrors", { enumerable: true, get: function () { return error_2.handleErrors; } });
Object.defineProperty(exports, "logError", { enumerable: true, get: function () { return error_2.logError; } });
Object.defineProperty(exports, "shouldRetry", { enumerable: true, get: function () { return error_2.shouldRetry; } });
Object.defineProperty(exports, "getRetryDelay", { enumerable: true, get: function () { return error_2.getRetryDelay; } });
var prompts_1 = require("./constants/prompts");
Object.defineProperty(exports, "SYSTEM_PROMPTS", { enumerable: true, get: function () { return prompts_1.SYSTEM_PROMPTS; } });
Object.defineProperty(exports, "USER_PROMPTS", { enumerable: true, get: function () { return prompts_1.USER_PROMPTS; } });
Object.defineProperty(exports, "LANGGRAPH_PROMPTS", { enumerable: true, get: function () { return prompts_1.LANGGRAPH_PROMPTS; } });
Object.defineProperty(exports, "EXAM_PROMPTS", { enumerable: true, get: function () { return prompts_1.EXAM_PROMPTS; } });
Object.defineProperty(exports, "FEEDBACK_PROMPTS", { enumerable: true, get: function () { return prompts_1.FEEDBACK_PROMPTS; } });
Object.defineProperty(exports, "MOTIVATION_PROMPTS", { enumerable: true, get: function () { return prompts_1.MOTIVATION_PROMPTS; } });
var config_2 = require("./constants/config");
Object.defineProperty(exports, "LEARNING_MODULES", { enumerable: true, get: function () { return config_2.LEARNING_MODULES; } });
Object.defineProperty(exports, "DIFFICULTY_LEVELS", { enumerable: true, get: function () { return config_2.DIFFICULTY_LEVELS; } });
Object.defineProperty(exports, "EMOTION_KEYWORDS", { enumerable: true, get: function () { return config_2.EMOTION_KEYWORDS; } });
Object.defineProperty(exports, "TASK_PRIORITIES", { enumerable: true, get: function () { return config_2.TASK_PRIORITIES; } });
Object.defineProperty(exports, "TASK_STATUSES", { enumerable: true, get: function () { return config_2.TASK_STATUSES; } });
Object.defineProperty(exports, "USER_INTENTS", { enumerable: true, get: function () { return config_2.USER_INTENTS; } });
Object.defineProperty(exports, "LOG_LEVELS", { enumerable: true, get: function () { return config_2.LOG_LEVELS; } });
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_2.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "ENV_VAR_NAMES", { enumerable: true, get: function () { return config_2.ENV_VAR_NAMES; } });
Object.defineProperty(exports, "API_ENDPOINTS", { enumerable: true, get: function () { return config_2.API_ENDPOINTS; } });
Object.defineProperty(exports, "SUPPORTED_FILE_FORMATS", { enumerable: true, get: function () { return config_2.SUPPORTED_FILE_FORMATS; } });
Object.defineProperty(exports, "MAX_FILE_SIZE", { enumerable: true, get: function () { return config_2.MAX_FILE_SIZE; } });
Object.defineProperty(exports, "VALIDATION_RULES", { enumerable: true, get: function () { return config_2.VALIDATION_RULES; } });
Object.defineProperty(exports, "ERROR_CODES", { enumerable: true, get: function () { return config_2.ERROR_CODES; } });
Object.defineProperty(exports, "HTTP_STATUS_CODES", { enumerable: true, get: function () { return config_2.HTTP_STATUS_CODES; } });
Object.defineProperty(exports, "CACHE_KEYS", { enumerable: true, get: function () { return config_2.CACHE_KEYS; } });
Object.defineProperty(exports, "RATE_LIMITS", { enumerable: true, get: function () { return config_2.RATE_LIMITS; } });
Object.defineProperty(exports, "SECURITY_CONFIG", { enumerable: true, get: function () { return config_2.SECURITY_CONFIG; } });
Object.defineProperty(exports, "DATABASE_CONFIG", { enumerable: true, get: function () { return config_2.DATABASE_CONFIG; } });
Object.defineProperty(exports, "REDIS_CONFIG", { enumerable: true, get: function () { return config_2.REDIS_CONFIG; } });
exports.CORE_VERSION = '1.0.0';
exports.CORE_DESCRIPTION = 'Core library providing TypeScript type definitions, logging utilities, error handling, prompt templates, and configuration constants for the civil service agent project.';
function initializeCore() {
    logger_1.logger.info('Core library initialized', { version: exports.CORE_VERSION });
}
function getCoreInfo() {
    return {
        version: exports.CORE_VERSION,
        description: exports.CORE_DESCRIPTION,
        types: [
            'GraphStateType',
            'Message',
            'RAGResult',
            'FeishuTask',
            'User',
            'ApiResponse',
            'PaginationParams',
        ],
        utilities: [
            'logger',
            'LogLevel',
            'CivilAgentError',
            'handleErrors',
            'logError',
            'shouldRetry',
        ],
        constants: [
            'SYSTEM_PROMPTS',
            'USER_PROMPTS',
            'DEFAULT_CONFIG',
            'ENV_VAR_NAMES',
            'API_ENDPOINTS',
            'LEARNING_MODULES',
            'DIFFICULTY_LEVELS',
        ],
    };
}
function validateEnvironment() {
    const missingVars = [];
    const warnings = [];
    const requiredEnvVars = [
        config_1.ENV_VAR_NAMES.ANTHROPIC_API_KEY,
        config_1.ENV_VAR_NAMES.LOG_LEVEL,
        config_1.ENV_VAR_NAMES.NODE_ENV,
    ];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    if (!process.env[config_1.ENV_VAR_NAMES.DATABASE_URL]) {
        warnings.push('DATABASE_URL not set - some features may not work properly');
    }
    if (!process.env[config_1.ENV_VAR_NAMES.REDIS_URL]) {
        warnings.push('REDIS_URL not set - caching will be disabled');
    }
    return {
        isValid: missingVars.length === 0,
        missingVars,
        warnings,
    };
}
function createCoreConfig(overrides) {
    const config = { ...config_1.DEFAULT_CONFIG };
    if (overrides) {
        Object.assign(config, overrides);
    }
    return config;
}
function createError(code, message, context, retryable = false) {
    return new error_1.CivilAgentError(code, message, context, retryable);
}
function formatPrompt(template, variables) {
    let formatted = template;
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        formatted = formatted.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return formatted;
}
function sanitizeInput(input) {
    return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}
function validateEmail(email) {
    return config_1.VALIDATION_RULES.EMAIL.test(email);
}
function validatePhone(phone) {
    return config_1.VALIDATION_RULES.PHONE.test(phone);
}
function validatePassword(password) {
    return config_1.VALIDATION_RULES.PASSWORD.test(password);
}
function validateUsername(username) {
    return config_1.VALIDATION_RULES.USERNAME.test(username);
}
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
function formatDate(date) {
    return date.toISOString();
}
function parseDate(dateString) {
    return new Date(dateString);
}
function calculateTimeAgo(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1)
        return '刚刚';
    if (minutes < 60)
        return `${minutes}分钟前`;
    if (hours < 24)
        return `${hours}小时前`;
    if (days < 30)
        return `${days}天前`;
    return date.toLocaleDateString();
}
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
initializeCore();
