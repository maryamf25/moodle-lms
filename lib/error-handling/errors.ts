/**
 * User-Friendly Error Messages
 * Maps technical errors to customer-understandable messages
 */

import { ErrorCode, AppError } from './types';

const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.BAD_REQUEST]: 'Your request was invalid. Please check the information you provided.',
  [ErrorCode.UNAUTHORIZED]: 'You are not logged in. Please sign in and try again.',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to access this resource.',
  [ErrorCode.NOT_FOUND]: 'The resource you are looking for does not exist.',
  [ErrorCode.VALIDATION_ERROR]: 'Please check the information you provided and try again.',
  [ErrorCode.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',

  [ErrorCode.INTERNAL_ERROR]: 'Something went wrong on our end. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Our service is temporarily unavailable. Please try again in a moment.',
  [ErrorCode.TIMEOUT]: 'The request took too long. Please try again.',
  [ErrorCode.DATABASE_ERROR]: 'Could not access the database. Please try again.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service is not responding. Please try again later.',

  [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds. Please check your payment method.',
  [ErrorCode.ENROLLMENT_FAILED]: 'Could not enroll you in the course. Please try again.',
  [ErrorCode.PAYMENT_FAILED]: 'Payment processing failed. Please check your card details and try again.',
  [ErrorCode.EMAIL_SEND_FAILED]: 'Could not send email. Please try again later.',
};

const TECHNICAL_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.BAD_REQUEST]: 'Invalid request parameters',
  [ErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ErrorCode.FORBIDDEN]: 'Access denied',
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.VALIDATION_ERROR]: 'Validation failed',
  [ErrorCode.RATE_LIMIT]: 'Rate limit exceeded',

  [ErrorCode.INTERNAL_ERROR]: 'Internal server error',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service unavailable',
  [ErrorCode.TIMEOUT]: 'Request timeout',
  [ErrorCode.DATABASE_ERROR]: 'Database error',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',

  [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds',
  [ErrorCode.ENROLLMENT_FAILED]: 'Enrollment failed',
  [ErrorCode.PAYMENT_FAILED]: 'Payment failed',
  [ErrorCode.EMAIL_SEND_FAILED]: 'Email send failed',
};

const RETRYABLE_ERRORS = new Set([
  ErrorCode.RATE_LIMIT,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.TIMEOUT,
  ErrorCode.EXTERNAL_SERVICE_ERROR,
  ErrorCode.EMAIL_SEND_FAILED,
]);

export function isRetryableError(code: ErrorCode): boolean {
  return RETRYABLE_ERRORS.has(code);
}

export function getUserFriendlyMessage(code: ErrorCode): string {
  return USER_FRIENDLY_MESSAGES[code] || USER_FRIENDLY_MESSAGES[ErrorCode.INTERNAL_ERROR];
}

export function getTechnicalMessage(code: ErrorCode): string {
  return TECHNICAL_MESSAGES[code];
}

export function createAppError(
  code: ErrorCode,
  options: {
    statusCode?: number;
    originalError?: Error;
    context?: Record<string, unknown>;
    customMessage?: string;
  } = {}
): AppError {
  const {
    statusCode,
    originalError,
    context,
    customMessage,
  } = options;

  return {
    code,
    message: customMessage || getTechnicalMessage(code),
    userMessage: getUserFriendlyMessage(code),
    statusCode: statusCode || getStatusCodeForError(code),
    isRetryable: isRetryableError(code),
    originalError,
    context,
  };
}

function getStatusCodeForError(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.BAD_REQUEST]: 400,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.VALIDATION_ERROR]: 422,
    [ErrorCode.RATE_LIMIT]: 429,

    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.TIMEOUT]: 504,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,

    [ErrorCode.INSUFFICIENT_FUNDS]: 402,
    [ErrorCode.ENROLLMENT_FAILED]: 400,
    [ErrorCode.PAYMENT_FAILED]: 402,
    [ErrorCode.EMAIL_SEND_FAILED]: 500,
  };

  return statusMap[code] || 500;
}

/**
 * Detect error type from unknown error object
 */
export function classifyError(error: unknown): ErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('abort')) {
      return ErrorCode.TIMEOUT;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCode.RATE_LIMIT;
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (message.includes('not found')) {
      return ErrorCode.NOT_FOUND;
    }
    if (message.includes('validation')) {
      return ErrorCode.VALIDATION_ERROR;
    }
    if (message.includes('database') || message.includes('prisma')) {
      return ErrorCode.DATABASE_ERROR;
    }
  }

  return ErrorCode.INTERNAL_ERROR;
}
