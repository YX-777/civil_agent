export interface ErrorDetails {
    code: string;
    message: string;
    stack?: string;
    context?: Record<string, any>;
    timestamp: Date;
    retryable?: boolean;
}
export declare class CivilAgentError extends Error {
    readonly code: string;
    readonly context?: Record<string, any>;
    readonly retryable: boolean;
    readonly timestamp: Date;
    constructor(code: string, message: string, context?: Record<string, any>, retryable?: boolean);
    toJSON(): ErrorDetails;
}
export declare class MCPToolError extends CivilAgentError {
    constructor(message: string, context?: Record<string, any>, retryable?: boolean);
}
export declare class RAGRetrievalError extends CivilAgentError {
    constructor(message: string, context?: Record<string, any>, retryable?: boolean);
}
export declare class AgentExecutionError extends CivilAgentError {
    constructor(message: string, context?: Record<string, any>, retryable?: boolean);
}
export declare class ConfigurationError extends CivilAgentError {
    constructor(message: string, context?: Record<string, any>, retryable?: boolean);
}
export declare class ValidationError extends CivilAgentError {
    constructor(message: string, context?: Record<string, any>, retryable?: boolean);
}
export declare class NetworkError extends CivilAgentError {
    constructor(message: string, context?: Record<string, any>, retryable?: boolean);
}
export declare function isCivilAgentError(error: unknown): error is CivilAgentError;
export declare function getErrorDetails(error: unknown): ErrorDetails;
export declare function createErrorFromResponse(response: {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, any>;
}): CivilAgentError;
export declare function handleErrors<T extends ErrorConstructor>(errorClass: T, contextMessage: string): MethodDecorator;
type ErrorConstructor = new (message: string, context?: Record<string, any>, retryable?: boolean) => CivilAgentError;
export declare function logError(error: unknown, context?: string): void;
export declare function shouldRetry(error: unknown): boolean;
export declare function getRetryDelay(error: unknown, attempt: number): number;
export {};
