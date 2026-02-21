# Moodle Integration Requirements

This project now includes a formal Moodle integration layer that covers:

1. Sync scheduling/frequency configuration
2. Rate-limit handling strategy
3. Data mapping layer

## 1) Sync Scheduling/Frequency

### Database models
- `IntegrationSyncConfig`
  - per-target scheduling config (`enabled`, `frequencyMinutes`, `lastRunAt`, `nextRunAt`)
- `IntegrationSyncRun`
  - run history and outcomes (`RUNNING`, `SUCCESS`, `FAILED`, `SKIPPED`)

### Targets
- `COURSE_CATALOG`
- `USER_DIRECTORY`
- `ENROLLMENTS`

### Admin UI
- `/dashboard/admin/integration`
  - manage each target independently
  - enable/disable scheduled sync per target
  - set frequency per target
  - run target sync now
  - inspect recent runs by target

### Scheduled API trigger
- `POST /api/integration/moodle/sync`
- Auth: `x-sync-secret` header or `Authorization: Bearer <secret>`
- Secret env: `MOODLE_SYNC_CRON_SECRET`

Use your scheduler (cron/GitHub Actions/hosted scheduler) to call the endpoint regularly.

## 2) Rate-Limit Handling Strategy

Centralized Moodle client: `lib/moodle/client.ts`

Features:
- Unified webservice request API (`moodleWebserviceGet`, `moodleWebservicePost`)
- Handles HTTP `429` and Moodle rate-limit error payloads
- Exponential backoff + jitter
- Supports `Retry-After` header when provided

Tunable env vars:
- `MOODLE_RATE_LIMIT_MAX_RETRIES` (default `3`)
- `MOODLE_RATE_LIMIT_BASE_DELAY_MS` (default `600`)
- `MOODLE_RATE_LIMIT_MAX_DELAY_MS` (default `8000`)

## 3) Data Mapping Layer

Mappings centralized in `lib/moodle/mappers.ts`.

Current mappers:
- `mapMoodleCourseRow`
- `mapMoodleCategoryRow`
- `extractCoursePrice`
- `mapMoodleUserRow`

## Additional sync storage

`UserCourseEnrollment` keeps local enrollment snapshots:
- relationship between local `User` and `CourseCatalog`
- active/inactive enrollment state
- Moodle user/course IDs
- last access + sync timestamps

## Key implementation files
- `lib/moodle/client.ts`
- `lib/moodle/mappers.ts`
- `lib/moodle/integration-config.ts`
- `lib/moodle/sync-course-catalog.ts`
- `lib/moodle/sync-user-directory.ts`
- `lib/moodle/sync-enrollments.ts`
- `lib/moodle/sync-scheduler.ts`
- `app/api/integration/moodle/sync/route.ts`
- `app/dashboard/admin/integration/page.tsx`
- `app/dashboard/admin/integration/IntegrationSettingsClient.tsx`
- `app/actions/integration.ts`
