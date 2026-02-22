/**
 * API Response Handler
 * Standardizes API responses with consistent error and success formats
 */

import { NextResponse } from 'next/server';
import { AppError, ErrorCode, ActionResult } from './types';
import { createAppError, getUserFriendlyMessage } from './errors';

export function apiSuccess<T>(
  data: T,
  options: {
    statusCode?: number;
    message?: string;
  } = {}
): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      data,
      message: options.message || 'Success',
    },
    { status: options.statusCode || 200 }
  );
}

export function apiError(
  error: AppError | Error | ErrorCode | unknown,
  options: {
    exposeSensitiveInfo?: boolean;
  } = {}
): NextResponse {
  let appError: AppError;

  if (error instanceof AppError || (typeof error === 'object' && error !== null && 'code' in error)) {
    appError = error as AppError;
  } else if (error instanceof Error) {
    const code = (error as any).code as ErrorCode | undefined;
    appError = createAppError(code || ErrorCode.INTERNAL_ERROR, {
      originalError: error,
    });
  } else if (typeof error === 'string') {
    appError = createAppError(ErrorCode.INTERNAL_ERROR, {
      customMessage: error,
    });
  } else {
    appError = createAppError(ErrorCode.INTERNAL_ERROR);
  }

  const responseBody: any = {
    ok: false,
    error: {
      code: appError.code,
      message: appError.userMessage,
    },
  };

  // Only expose technical details in development or if explicitly requested
  if (options.exposeSensitiveInfo && process.env.NODE_ENV === 'development') {
    responseBody.error.technical = appError.message;
    if (appError.originalError) {
      responseBody.error.originalError = appError.originalError.message;
    }
  }

  console.error('[API Error]', {
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    userMessage: appError.userMessage,
    context: appError.context,
  });

  return NextResponse.json(responseBody, {
    status: appError.statusCode,
  });
}

export function serverActionSuccess<T>(data: T, message?: string): ActionResult<T> {
  return {
    ok: true,
    data,
  };
}

export function serverActionError(
  error: Error | ErrorCode | string,
  options: {
    code?: ErrorCode;
  } = {}
): ActionResult {
  let code = options.code || ErrorCode.INTERNAL_ERROR;

  if (typeof error === 'string') {
    code = (error as any) as ErrorCode || code;
  }

  const appError = createAppError(code, {
    originalError: error instanceof Error ? error : undefined,
  });

  console.error('[Server Action Error]', {
    code: appError.code,
    message: appError.message,
  });

  return {
    ok: false,
    error: {
      code: appError.code,
      message: appError.userMessage,
    },
  };
}

/**
 * Wrap an API handler with error handling
 */
export function withApiErrorHandler(
  handler: (request: Request) => Promise<NextResponse>
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      const appError =
        error instanceof AppError || (typeof error === 'object' && error !== null && 'code' in error)
          ? (error as AppError)
          : createAppError(ErrorCode.INTERNAL_ERROR, {
              originalError: error instanceof Error ? error : undefined,
            });

      return apiError(appError);
    }
  };
}

/**
 * Wrap a server action with error handling
 */
export function withServerActionErrorHandler(
  handler: (...args: any[]) => Promise<ActionResult>
): (...args: any[]) => Promise<ActionResult> {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return serverActionError(error instanceof Error ? error : String(error));
    }
  };
}
