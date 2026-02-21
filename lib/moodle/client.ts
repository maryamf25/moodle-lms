import { BASE_URL } from './api';

interface MoodleErrorShape {
  exception?: string;
  errorcode?: string;
  message?: string;
}

interface MoodleRequestOptions {
  method?: 'GET' | 'POST';
  token: string;
  wsfunction: string;
  params?: URLSearchParams;
  cache?: RequestCache;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function getRateLimitConfig() {
  return {
    maxRetries: Number(process.env.MOODLE_RATE_LIMIT_MAX_RETRIES || '3'),
    baseDelayMs: Number(process.env.MOODLE_RATE_LIMIT_BASE_DELAY_MS || '600'),
    maxDelayMs: Number(process.env.MOODLE_RATE_LIMIT_MAX_DELAY_MS || '8000'),
  };
}

function parseMoodleError(payload: unknown): MoodleErrorShape | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  const exception = typeof data.exception === 'string' ? data.exception : undefined;
  const errorcode = typeof data.errorcode === 'string' ? data.errorcode : undefined;
  const message = typeof data.message === 'string' ? data.message : undefined;
  if (!exception && !errorcode && !message) return null;
  return { exception, errorcode, message };
}

function isRateLimitError(responseStatus: number, payload: unknown): boolean {
  if (responseStatus === 429) return true;
  const moodleError = parseMoodleError(payload);
  const errorText = `${moodleError?.errorcode ?? ''} ${moodleError?.exception ?? ''} ${moodleError?.message ?? ''}`
    .toLowerCase();
  return errorText.includes('ratelimit') || errorText.includes('too many requests');
}

function parseRetryAfterMs(retryAfterHeader: string | null | undefined): number | null {
  if (!retryAfterHeader) return null;
  const numeric = Number(retryAfterHeader);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric * 1000;
  }

  const dateMs = Date.parse(retryAfterHeader);
  if (Number.isFinite(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 0;
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMoodleUrl(path: string): string {
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_MOODLE_URL is not configured');
  }
  return `${BASE_URL}${path}`;
}

function buildPayload(token: string, wsfunction: string, params?: URLSearchParams): URLSearchParams {
  const payload = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: 'json',
  });

  if (params) {
    params.forEach((value, key) => payload.append(key, value));
  }

  return payload;
}

export async function moodleWebserviceRequest<T = unknown>(options: MoodleRequestOptions): Promise<T> {
  const method = options.method ?? 'GET';
  const { maxRetries, baseDelayMs, maxDelayMs } = getRateLimitConfig();

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    const payload = buildPayload(options.token, options.wsfunction, options.params);
    const path = '/webservice/rest/server.php';

    try {
      const response = await fetch(
        method === 'GET' ? `${buildMoodleUrl(path)}?${payload.toString()}` : buildMoodleUrl(path),
        {
          method,
          cache: options.cache,
          headers:
            method === 'POST'
              ? {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  ...(options.headers ?? {}),
                }
              : options.headers,
          body: method === 'POST' ? payload.toString() : undefined,
          signal: options.signal,
        },
      );

      let responseData: unknown = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      const moodleError = parseMoodleError(responseData);
      const rateLimited = isRateLimitError(response.status, responseData);
      if (rateLimited && attempt < maxRetries) {
        const retryAfter = parseRetryAfterMs(response.headers.get('retry-after'));
        const jitter = Math.floor(Math.random() * 200);
        const backoff = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt)) + jitter;
        await sleep(retryAfter ?? backoff);
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Moodle request failed (${options.wsfunction}) with status ${response.status}`);
      }

      if (moodleError?.exception || moodleError?.errorcode) {
        throw new Error(moodleError.message || `Moodle returned an error in ${options.wsfunction}`);
      }

      return responseData as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= maxRetries) {
        throw lastError;
      }
      const jitter = Math.floor(Math.random() * 200);
      const backoff = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt)) + jitter;
      await sleep(backoff);
      attempt += 1;
    }
  }

  throw lastError || new Error(`Moodle request failed (${options.wsfunction})`);
}

export async function moodleWebserviceGet<T = unknown>(token: string, wsfunction: string, params?: URLSearchParams): Promise<T> {
  return moodleWebserviceRequest<T>({
    method: 'GET',
    token,
    wsfunction,
    params,
  });
}

export async function moodleWebservicePost<T = unknown>(token: string, wsfunction: string, params?: URLSearchParams): Promise<T> {
  return moodleWebserviceRequest<T>({
    method: 'POST',
    token,
    wsfunction,
    params,
    cache: 'no-store',
  });
}
