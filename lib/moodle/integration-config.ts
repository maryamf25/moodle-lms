import { IntegrationSyncTarget } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

const DEFAULT_SYNC_FREQUENCY_MINUTES: Record<IntegrationSyncTarget, number> = {
  COURSE_CATALOG: Number(process.env.MOODLE_SYNC_COURSE_CATALOG_MINUTES || '60'),
  USER_DIRECTORY: Number(process.env.MOODLE_SYNC_USER_DIRECTORY_MINUTES || '120'),
  ENROLLMENTS: Number(process.env.MOODLE_SYNC_ENROLLMENTS_MINUTES || '30'),
};

export interface ResolvedSyncConfig {
  target: IntegrationSyncTarget;
  enabled: boolean;
  frequencyMinutes: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
}

function clampFrequency(minutes: number): number {
  if (!Number.isFinite(minutes)) return 60;
  const normalized = Math.floor(minutes);
  return Math.max(5, Math.min(24 * 60, normalized));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export async function getSyncConfig(target: IntegrationSyncTarget): Promise<ResolvedSyncConfig> {
  const config = await prisma.integrationSyncConfig.findUnique({
    where: { target },
  });

  const fallback = clampFrequency(DEFAULT_SYNC_FREQUENCY_MINUTES[target]);

  if (!config) {
    return {
      target,
      enabled: true,
      frequencyMinutes: fallback,
      lastRunAt: null,
      nextRunAt: null,
    };
  }

  return {
    target,
    enabled: config.enabled,
    frequencyMinutes: clampFrequency(config.frequencyMinutes),
    lastRunAt: config.lastRunAt,
    nextRunAt: config.nextRunAt,
  };
}

export async function upsertSyncConfig(input: {
  target: IntegrationSyncTarget;
  enabled: boolean;
  frequencyMinutes: number;
}) {
  const frequencyMinutes = clampFrequency(input.frequencyMinutes);

  return prisma.integrationSyncConfig.upsert({
    where: { target: input.target },
    create: {
      target: input.target,
      enabled: input.enabled,
      frequencyMinutes,
      nextRunAt: addMinutes(new Date(), frequencyMinutes),
    },
    update: {
      enabled: input.enabled,
      frequencyMinutes,
      nextRunAt: addMinutes(new Date(), frequencyMinutes),
    },
  });
}

export async function markSyncRunStarted(target: IntegrationSyncTarget) {
  const now = new Date();
  const config = await prisma.integrationSyncConfig.upsert({
    where: { target },
    create: {
      target,
      enabled: true,
      frequencyMinutes: clampFrequency(DEFAULT_SYNC_FREQUENCY_MINUTES[target]),
      nextRunAt: addMinutes(now, clampFrequency(DEFAULT_SYNC_FREQUENCY_MINUTES[target])),
    },
    update: {},
  });

  const run = await prisma.integrationSyncRun.create({
    data: {
      target,
      status: 'RUNNING',
      startedAt: now,
      configId: config.id,
    },
  });

  return { run, config };
}

export async function markSyncRunFinished(input: {
  runId: string;
  target: IntegrationSyncTarget;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  startedAt: Date;
  itemsSynced?: number;
  itemsFailed?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}) {
  const now = new Date();
  const config = await getSyncConfig(input.target);
  const nextRunAt = addMinutes(now, config.frequencyMinutes);

  await prisma.$transaction([
    prisma.integrationSyncRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        finishedAt: now,
        durationMs: now.getTime() - input.startedAt.getTime(),
        itemsSynced: input.itemsSynced,
        itemsFailed: input.itemsFailed,
        metadata: input.metadata,
        error: input.error,
      },
    }),
    prisma.integrationSyncConfig.upsert({
      where: { target: input.target },
      create: {
        target: input.target,
        enabled: true,
        frequencyMinutes: config.frequencyMinutes,
        lastRunAt: now,
        nextRunAt,
      },
      update: {
        lastRunAt: now,
        nextRunAt,
      },
    }),
  ]);
}

export async function shouldRunSync(target: IntegrationSyncTarget): Promise<boolean> {
  const config = await getSyncConfig(target);
  if (!config.enabled) return false;

  const now = Date.now();
  if (!config.nextRunAt) return true;

  return config.nextRunAt.getTime() <= now;
}

export async function getSyncDashboard(target: IntegrationSyncTarget) {
  const [config, recentRuns] = await Promise.all([
    getSyncConfig(target),
    prisma.integrationSyncRun.findMany({
      where: { target },
      take: 20,
      orderBy: { startedAt: 'desc' },
    }),
  ]);

  return { config, recentRuns };
}

export const SYNC_TARGETS: IntegrationSyncTarget[] = ['COURSE_CATALOG', 'USER_DIRECTORY', 'ENROLLMENTS'];

export async function getAllSyncDashboards() {
  const dashboards = await Promise.all(SYNC_TARGETS.map((target) => getSyncDashboard(target)));
  return dashboards.map((dashboard, index) => ({
    target: SYNC_TARGETS[index],
    ...dashboard,
  }));
}
