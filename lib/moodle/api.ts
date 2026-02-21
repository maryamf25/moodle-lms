const rawBaseUrl = process.env.NEXT_PUBLIC_MOODLE_URL || '';

export const BASE_URL = rawBaseUrl.replace(/\/+$/, '');
export const SERVICE = process.env.NEXT_PUBLIC_MOODLE_SERVICE || 'moodle_mobile_app';

export const MOODLE_INTEGRATION_SETTINGS = {
  courseCatalogSyncMinutes: Number(process.env.MOODLE_SYNC_COURSE_CATALOG_MINUTES || '60'),
  userDirectorySyncMinutes: Number(process.env.MOODLE_SYNC_USER_DIRECTORY_MINUTES || '120'),
  enrollmentsSyncMinutes: Number(process.env.MOODLE_SYNC_ENROLLMENTS_MINUTES || '30'),
  rateLimitMaxRetries: Number(process.env.MOODLE_RATE_LIMIT_MAX_RETRIES || '3'),
  rateLimitBaseDelayMs: Number(process.env.MOODLE_RATE_LIMIT_BASE_DELAY_MS || '600'),
  rateLimitMaxDelayMs: Number(process.env.MOODLE_RATE_LIMIT_MAX_DELAY_MS || '8000'),
} as const;
