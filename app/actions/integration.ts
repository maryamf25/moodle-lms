'use server';

import { revalidatePath } from 'next/cache';
import { IntegrationSyncTarget } from '@prisma/client';
import { requireAppAuth } from '@/lib/auth/server-session';
import { getAllSyncDashboards, upsertSyncConfig } from '@/lib/moodle/integration-config';
import { runMoodleSyncs } from '@/lib/moodle/sync-scheduler';

export async function getIntegrationSyncSettingsAction() {
  await requireAppAuth('admin');
  return getAllSyncDashboards();
}

export async function saveIntegrationSyncSettingsAction(input: {
  target: IntegrationSyncTarget;
  enabled: boolean;
  frequencyMinutes: number;
}) {
  await requireAppAuth('admin');

  const frequencyMinutes = Number(input.frequencyMinutes);
  if (!Number.isFinite(frequencyMinutes) || frequencyMinutes < 5) {
    return { ok: false, message: 'Frequency must be at least 5 minutes' };
  }

  await upsertSyncConfig({
    target: input.target,
    enabled: input.enabled,
    frequencyMinutes,
  });

  revalidatePath('/dashboard/admin/integration');
  return { ok: true, message: `${input.target} settings updated` };
}

export async function runIntegrationSyncNowAction(target: IntegrationSyncTarget) {
  await requireAppAuth('admin');

  const results = await runMoodleSyncs({ force: true, targets: [target] });
  const match = results.find((result) => result.target === target);

  revalidatePath('/dashboard/admin/integration');
  if (!match) {
    return { ok: false, message: `No sync result for ${target}` };
  }

  if (match.status === 'FAILED') {
    return { ok: false, message: match.error || `Sync ${target} failed` };
  }

  return {
    ok: true,
    message:
      match.status === 'SKIPPED'
        ? `${target} skipped based on frequency policy`
        : `${target} synced successfully (${match.syncedCount ?? 0} items)`,
  };
}
