"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkError = exports.ValidationError = exports.ConfigurationError = exports.AgentExecutionError = exports.RAGRetrievalError = exports.MCPToolError = exports.CivilAgentError = void 0;
exports.isCivilAgentError = isCivilAgentError;
exports.getErrorDetails = getErrorDetails;
exports.createErrorFromResponse = createErrorFromResponse;
exports.handleErrors = handleErrors;
exports.logError = logError;
exports.shouldRetry = shouldRetry;
exports.getRetryDelay = getRetryDelay;
class CivilAgentError extends Error {
    constructor(code, message, context, retryable = false) {
        super(message);
        this.name = 'CivilAgentError';
        this.code = code;
        this.context = context;
        this.retryable = retryable;
        this.timestamp = new Date();
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CivilAgentError);
        }
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            stack: this.stack,
            context: this.context,
            timestamp: this.timestamp,
            retryable: this.retryable,
        };
    }
}
exports.CivilAgentError = CivilAgentError;
class MCPToolError extends CivilAgentError {
    constructor(message, context, retryable = false) {
        super('MCP_TOOL_ERROR', message, context, retryable);
        this.name = 'MCPToolError';
    }
}
exports.MCPToolError = MCPToolError;
class RAGRetrievalError extends CivilAgentError {
    constructor(message, context, retryable = true) {
        super('RAG_RETRIEVAL_ERROR', message, context, retryable);
        this.name = 'RAGRetrievalError';
    }
}
exports.RAGRetrievalError = RAGRetrievalError;
class AgentExecutionError extends CivilAgentError {
    constructor(message, context, retryable = false) {
        super('AGENT_EXECUTION_ERROR', message, context, retryable);
        this.name = 'AgentExecutionError';
    }
}
exports.AgentExecutionError = AgentExecutionError;
class ConfigurationError extends CivilAgentError {
    constructor(message, context, retryable = false) {
        super('CONFIGURATION_ERROR', message, context, retryable);
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class ValidationError extends CivilAgentError {
    constructor(message, context, retryable = false) {
        super('VALIDATION_ERROR', message, context, retryable);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NetworkError extends CivilAgentError {
    constructor(message, context, retryable = true) {
        super('NETWORK_ERROR', message, context, retryable);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
function isCivilAgentError(error) {
    return error instanceof CivilAgentError;
}
function getErrorDetails(error) {
    if (isCivilAgentError(error)) {
        return error.toJSON();
    }
    if (error instanceof Error) {
        return {
            code: 'UNKNOWN_ERROR',
            message: error.message,
            stack: error.stack,
            timestamp: new Date(),
            retryable: false,
        };
    }
    return {
        code: 'UNKNOWN_ERROR',
        message: String(error),
        timestamp: new Date(),
        retryable: false,
    };
}
function createErrorFromResponse(response) {
    const code = response.code || 'API_ERROR';
    const message = response.error;
    const context = response.details;
    switch (code) {
        case 'MCP_TOOL_ERROR':
            return new MCPToolError(message, context);
        case 'RAG_RETRIEVAL_ERROR':
            return new RAGRetrievalError(message, context);
        case 'AGENT_EXECUTION_ERROR':
            return new AgentExecutionError(message, context);
        case 'CONFIGURATION_ERROR':
            return new ConfigurationError(message, context);
        case 'VALIDATION_ERROR':
            return new ValidationError(message, context);
        case 'NETWORK_ERROR':
            return new NetworkError(message, context);
        default:
            return new CivilAgentError(code, message, context);
    }
}
function handleErrors(errorClass, contextMessage) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            try {
                return await originalMethod.apply(this, args);
            }
            catch (error) {
                const errorDetails = getErrorDetails(error);
                const wrappedError = new errorClass(`${contextMessage}: ${errorDetails.message}`, errorDetails.context, errorDetails.retryable);
                wrappedError.stack = errorDetails.stack;
                throw wrappedError;
            }
        };
        return descriptor;
    };
}
function logError(error, context) {
    const errorDetails = getErrorDetails(error);
    const logger = require('./logger').logger;
    logger.error(errorDetails.message, error instanceof Error ? error : undefined, { code: errorDetails.code, context, ...errorDetails.context }, context);
}
function shouldRetry(error) {
    const errorDetails = getErrorDetails(error);
    return errorDetails.retryable || false;
}
function getRetryDelay(error, attempt) {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    if (shouldRetry(error)) {
        return delay;
    }
    return 0;
}
