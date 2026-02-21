import { IntegrationSyncTarget } from '@prisma/client';
import {
  markSyncRunFinished,
  markSyncRunStarted,
  shouldRunSync,
} from '@/lib/moodle/integration-config';
import { syncCourseCatalogFromMoodle } from '@/lib/moodle/sync-course-catalog';
import { syncUserDirectoryFromMoodle } from '@/lib/moodle/sync-user-directory';
import { syncEnrollmentsFromMoodle } from '@/lib/moodle/sync-enrollments';

interface ScheduledSyncResult {
  target: IntegrationSyncTarget;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  syncedCount?: number;
  removedCount?: number;
  error?: string;
}

export async function runScheduledMoodleSyncs(): Promise<ScheduledSyncResult[]> {
  return runMoodleSyncs({ force: false });
}

export async function runMoodleSyncs(options: { force: boolean; targets?: IntegrationSyncTarget[] }): Promise<ScheduledSyncResult[]> {
  const targets: IntegrationSyncTarget[] = options.targets ?? ['COURSE_CATALOG', 'USER_DIRECTORY', 'ENROLLMENTS'];
  const results: ScheduledSyncResult[] = [];

  for (const target of targets) {
    const shouldRun = options.force ? true : await shouldRunSync(target);
    if (!shouldRun) {
      results.push({ target, status: 'SKIPPED' });
      continue;
    }

    const { run } = await markSyncRunStarted(target);
    const startedAt = run.startedAt;

    try {
      if (target === 'COURSE_CATALOG') {
        const sync = await syncCourseCatalogFromMoodle();
        await markSyncRunFinished({
          runId: run.id,
          target,
          status: 'SUCCESS',
          startedAt,
          itemsSynced: sync.syncedCount,
          itemsFailed: 0,
          metadata: {
            removedCount: sync.removedCount,
            categoryCount: sync.categoryCount,
          },
        });

        results.push({
          target,
          status: 'SUCCESS',
          syncedCount: sync.syncedCount,
          removedCount: sync.removedCount,
        });
        continue;
      }

      if (target === 'USER_DIRECTORY') {
        const sync = await syncUserDirectoryFromMoodle();
        await markSyncRunFinished({
          runId: run.id,
          target,
          status: 'SUCCESS',
          startedAt,
          itemsSynced: sync.syncedCount,
          itemsFailed: sync.skippedCount,
          metadata: {
            newCount: sync.newCount,
            updatedCount: sync.updatedCount,
            skippedCount: sync.skippedCount,
          },
        });
        results.push({
          target,
          status: 'SUCCESS',
          syncedCount: sync.syncedCount,
        });
        continue;
      }

      if (target === 'ENROLLMENTS') {
        const sync = await syncEnrollmentsFromMoodle();
        await markSyncRunFinished({
          runId: run.id,
          target,
          status: 'SUCCESS',
          startedAt,
          itemsSynced: sync.syncedCount,
          itemsFailed: 0,
          metadata: {
            courseCount: sync.courseCount,
            newCount: sync.newCount,
            updatedCount: sync.updatedCount,
            deactivatedCount: sync.deactivatedCount,
          },
        });
        results.push({
          target,
          status: 'SUCCESS',
          syncedCount: sync.syncedCount,
        });
        continue;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await markSyncRunFinished({
        runId: run.id,
        target,
        status: 'FAILED',
        startedAt,
        error: message,
      });
      results.push({ target, status: 'FAILED', error: message });
    }
  }

  return results;
}
