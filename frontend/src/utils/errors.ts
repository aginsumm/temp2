import { AxiosError } from 'axios';

export enum ErrorCode {
  SUCCESS = 0,
  UNKNOWN_ERROR = 1000,
  INVALID_REQUEST = 1001,
  VALIDATION_ERROR = 1002,
  RATE_LIMIT_EXCEEDED = 1003,

  AUTHENTICATION_FAILED = 2001,
  TOKEN_EXPIRED = 2002,
  PERMISSION_DENIED = 2003,
  ACCOUNT_DISABLED = 2004,

  RESOURCE_NOT_FOUND = 3001,
  RESOURCE_ALREADY_EXISTS = 3002,
  RESOURCE_LOCKED = 3003,

  DATABASE_ERROR = 4001,
  CACHE_ERROR = 4002,
  EXTERNAL_SERVICE_ERROR = 4003,

  LLM_SERVICE_ERROR = 5001,
  LLM_TIMEOUT = 5002,
  LLM_RATE_LIMIT = 5003,
  LLM_MODEL_NOT_AVAILABLE = 5004,

  KNOWLEDGE_GRAPH_ERROR = 6001,
  ENTITY_NOT_FOUND = 6002,
  RELATION_NOT_FOUND = 6003,
  GRAPH_QUERY_ERROR = 6004,

  NETWORK_ERROR = 7001,
  CONNECTION_TIMEOUT = 7002,
  SERVICE_UNAVAILABLE = 7003,

  FILE_UPLOAD_ERROR = 8001,
  FILE_TOO_LARGE = 8002,
  INVALID_FILE_FORMAT = 8003,
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  value?: unknown;
  type?: string;
}

export interface ApiErrorResponse {
  code: number;
  message: string;
  details?: ApiErrorDetail[];
  trace_id: string;
  timestamp?: string;
  cause?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details: ApiErrorDetail[];
  public readonly traceId: string;
  public readonly timestamp: string;
  public readonly cause?: string;
  public readonly isNetworkError: boolean;
  public readonly isRetryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      details?: ApiErrorDetail[];
      traceId?: string;
      timestamp?: string;
      cause?: string;
      isNetworkError?: boolean;
      isRetryable?: boolean;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = options?.details || [];
    this.traceId = options?.traceId || 'unknown';
    this.timestamp = options?.timestamp || new Date().toISOString();
    this.cause = options?.cause;
    this.isNetworkError = options?.isNetworkError || false;
    this.isRetryable = options?.isRetryable || false;
  }

  static fromApiError(response: ApiErrorResponse): AppError {
    const code = response.code as ErrorCode;
    const isRetryable = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.SERVICE_UNAVAILABLE,
    ].includes(code);

    return new AppError(code, response.message, {
      details: response.details,
      traceId: response.trace_id,
      timestamp: response.timestamp,
      cause: response.cause,
      isNetworkError: code >= 7000 && code < 8000,
      isRetryable,
    });
  }

  static fromAxiosError(error: AxiosError<ApiErrorResponse>): AppError {
    if (error.response) {
      const apiError = error.response.data;
      if (apiError && apiError.code !== undefined) {
        return AppError.fromApiError(apiError);
      }

      const status = error.response.status;
      let code = ErrorCode.UNKNOWN_ERROR;
      let message = 'Unknown error';

      switch (status) {
        case 400:
          code = ErrorCode.INVALID_REQUEST;
          message = 'Invalid request';
          break;
        case 401:
          code = ErrorCode.AUTHENTICATION_FAILED;
          message = 'Authentication failed';
          break;
        case 403:
          code = ErrorCode.PERMISSION_DENIED;
          message = 'Permission denied';
          break;
        case 404:
          code = ErrorCode.RESOURCE_NOT_FOUND;
          message = 'Resource not found';
          break;
        case 429:
          code = ErrorCode.RATE_LIMIT_EXCEEDED;
          message = 'Rate limit exceeded';
          break;
        case 500:
          code = ErrorCode.EXTERNAL_SERVICE_ERROR;
          message = 'Server error';
          break;
        case 502:
        case 503:
        case 504:
          code = ErrorCode.SERVICE_UNAVAILABLE;
          message = 'Service unavailable';
          break;
      }

      return new AppError(code, message, {
        isRetryable: status >= 500,
      });
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new AppError(ErrorCode.CONNECTION_TIMEOUT, 'Connection timeout', {
        isNetworkError: true,
        isRetryable: true,
      });
    }

    if (!window.navigator.onLine) {
      return new AppError(ErrorCode.NETWORK_ERROR, 'No internet connection', {
        isNetworkError: true,
        isRetryable: true,
      });
    }

    return new AppError(ErrorCode.NETWORK_ERROR, error.message || 'Network error', {
      isNetworkError: true,
      isRetryable: true,
    });
  }

  get isAuthError(): boolean {
    return this.code >= 2000 && this.code < 3000;
  }

  get isValidationError(): boolean {
    return this.code === ErrorCode.VALIDATION_ERROR;
  }

  get isNotFoundError(): boolean {
    return this.code === ErrorCode.RESOURCE_NOT_FOUND;
  }

  get isRateLimited(): boolean {
    return this.code === ErrorCode.RATE_LIMIT_EXCEEDED || this.code === ErrorCode.LLM_RATE_LIMIT;
  }

  get isLLMError(): boolean {
    return this.code >= 5000 && this.code < 6000;
  }

  get isGraphError(): boolean {
    return this.code >= 6000 && this.code < 7000;
  }

  getFieldError(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message;
  }

  toUserMessage(): string {
    if (this.isNetworkError) {
      return '网络连接失败，请检查网络后重试';
    }

    if (this.isRateLimited) {
      return '请求过于频繁，请稍后再试';
    }

    if (this.isAuthError) {
      if (this.code === ErrorCode.TOKEN_EXPIRED) {
        return '登录已过期，请重新登录';
      }
      return '认证失败，请重新登录';
    }

    if (this.isLLMError) {
      return 'AI服务暂时不可用，请稍后重试';
    }

    if (this.isGraphError) {
      return '知识图谱服务暂时不可用';
    }

    if (this.isNotFoundError) {
      return '请求的资源不存在';
    }

    return this.message || '操作失败，请重试';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleApiError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if ((error as AxiosError).isAxiosError) {
    return AppError.fromAxiosError(error as AxiosError<ApiErrorResponse>);
  }

  if (error instanceof Error) {
    return new AppError(ErrorCode.UNKNOWN_ERROR, error.message);
  }

  return new AppError(ErrorCode.UNKNOWN_ERROR, 'Unknown error');
}

export function getErrorMessage(error: unknown): string {
  const appError = handleApiError(error);
  return appError.toUserMessage();
}

export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: AppError) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T> {
  const {
    maxRetries,
    delayMs,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    shouldRetry = (error) => error.isRetryable,
  } = config;

  let lastError: AppError | null = null;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = handleApiError(error);

      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

export function getErrorSeverity(error: AppError): 'low' | 'medium' | 'high' | 'critical' {
  if (error.isAuthError) {
    return 'medium';
  }

  if (error.isNetworkError) {
    return 'medium';
  }

  if (error.isValidationError) {
    return 'low';
  }

  if (error.isLLMError || error.isGraphError) {
    return 'high';
  }

  if (error.code === ErrorCode.UNKNOWN_ERROR) {
    return 'critical';
  }

  return 'medium';
}
