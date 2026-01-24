export interface ErrorDetails {
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
  retryable?: boolean;
}

export class CivilAgentError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    context?: Record<string, any>,
    retryable: boolean = false
  ) {
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

  public toJSON(): ErrorDetails {
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

export class MCPToolError extends CivilAgentError {
  constructor(
    message: string,
    context?: Record<string, any>,
    retryable: boolean = false
  ) {
    super('MCP_TOOL_ERROR', message, context, retryable);
    this.name = 'MCPToolError';
  }
}

export class RAGRetrievalError extends CivilAgentError {
  constructor(
    message: string,
    context?: Record<string, any>,
    retryable: boolean = true
  ) {
    super('RAG_RETRIEVAL_ERROR', message, context, retryable);
    this.name = 'RAGRetrievalError';
  }
}

export class AgentExecutionError extends CivilAgentError {
  constructor(
    message: string,
    context?: Record<string, any>,
    retryable: boolean = false
  ) {
    super('AGENT_EXECUTION_ERROR', message, context, retryable);
    this.name = 'AgentExecutionError';
  }
}

export class ConfigurationError extends CivilAgentError {
  constructor(
    message: string,
    context?: Record<string, any>,
    retryable: boolean = false
  ) {
    super('CONFIGURATION_ERROR', message, context, retryable);
    this.name = 'ConfigurationError';
  }
}

export class ValidationError extends CivilAgentError {
  constructor(
    message: string,
    context?: Record<string, any>,
    retryable: boolean = false
  ) {
    super('VALIDATION_ERROR', message, context, retryable);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends CivilAgentError {
  constructor(
    message: string,
    context?: Record<string, any>,
    retryable: boolean = true
  ) {
    super('NETWORK_ERROR', message, context, retryable);
    this.name = 'NetworkError';
  }
}

export function isCivilAgentError(error: unknown): error is CivilAgentError {
  return error instanceof CivilAgentError;
}

export function getErrorDetails(error: unknown): ErrorDetails {
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

export function createErrorFromResponse(response: {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}): CivilAgentError {
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

export function handleErrors<T extends ErrorConstructor>(
  errorClass: T,
  contextMessage: string
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const errorDetails = getErrorDetails(error);
        
        const wrappedError = new errorClass(
          `${contextMessage}: ${errorDetails.message}`,
          errorDetails.context,
          errorDetails.retryable
        );
        
        wrappedError.stack = errorDetails.stack;
        
        throw wrappedError;
      }
    };

    return descriptor;
  };
}

type ErrorConstructor = new (message: string, context?: Record<string, any>, retryable?: boolean) => CivilAgentError;

export function logError(error: unknown, context?: string): void {
  const errorDetails = getErrorDetails(error);
  
  const logger = require('./logger').logger;
  logger.error(
    errorDetails.message,
    error instanceof Error ? error : undefined,
    { code: errorDetails.code, context, ...errorDetails.context },
    context
  );
}

export function shouldRetry(error: unknown): boolean {
  const errorDetails = getErrorDetails(error);
  return errorDetails.retryable || false;
}

export function getRetryDelay(error: unknown, attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  
  if (shouldRetry(error)) {
    return delay;
  }
  
  return 0;
}