/**
 * Generic Retry Mechanism
 * Handles retries with exponential backoff for transient failures
 */

import { ErrorCode } from './types';
import { classifyError } from './errors';

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterMs?: number;
  timeoutMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 200,
  timeoutMs: 30000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(
  attempt: number,
  {
    baseDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitterMs,
  }: Pick<Required<RetryOptions>, 'baseDelayMs' | 'maxDelayMs' | 'backoffMultiplier' | 'jitterMs'>
): number {
  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  const jitter = Math.floor(Math.random() * jitterMs);
  return cappedDelay + jitter;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  userOptions: RetryOptions = {}
): Promise<T> {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // Add timeout to the operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

      let result: T;
      try {
        result = await Promise.race([
          fn(),
          new Promise<T>((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error(`Operation timed out after ${options.timeoutMs}ms`));
            });
          }),
        ]);
      } finally {
        clearTimeout(timeoutId);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorCode = classifyError(lastError);

      // Check if error is retryable
      const isRetryable = [
        ErrorCode.RATE_LIMIT,
        ErrorCode.SERVICE_UNAVAILABLE,
        ErrorCode.TIMEOUT,
        ErrorCode.EXTERNAL_SERVICE_ERROR,
      ].includes(errorCode);

      if (!isRetryable || attempt >= options.maxRetries) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, options);
      if (options.onRetry) {
        options.onRetry(attempt + 1, lastError);
      }

      console.log(`[retry] Attempt ${attempt + 1}/${options.maxRetries} failed. Retrying in ${delay}ms...`, {
        error: lastError.message,
        errorCode,
      });

      await sleep(delay);
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

export async function retryableAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, options);
}
