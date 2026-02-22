/**
 * Error Handling Types
 * Standardized error definitions for the application
 */

export enum ErrorCode {
  // Client Errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',

  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Business Logic Errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ENROLLMENT_FAILED = 'ENROLLMENT_FAILED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  statusCode: number;
  isRetryable: boolean;
  originalError?: Error;
  context?: Record<string, unknown>;
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
  };
}

export interface DeadLetterJob {
  id: string;
  jobType: string;
  payload: Record<string, unknown>;
  error: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
