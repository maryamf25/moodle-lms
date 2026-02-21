import { requireAppAuth } from '@/lib/auth/server-session';
import { getIntegrationSyncSettingsAction } from '@/app/actions/integration';
import IntegrationSettingsClient from './IntegrationSettingsClient';

export default async function AdminIntegrationPage() {
  await requireAppAuth('admin');
  const dashboards = await getIntegrationSyncSettingsAction();

  return (
    <IntegrationSettingsClient
      dashboards={dashboards.map((item) => ({
        target: item.target,
        config: {
          enabled: item.config.enabled,
          frequencyMinutes: item.config.frequencyMinutes,
          lastRunAt: item.config.lastRunAt ? item.config.lastRunAt.toISOString() : null,
          nextRunAt: item.config.nextRunAt ? item.config.nextRunAt.toISOString() : null,
        },
        recentRuns: item.recentRuns.map((run) => ({
          id: run.id,
          status: run.status,
          startedAt: run.startedAt.toISOString(),
          finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
          itemsSynced: run.itemsSynced,
          error: run.error,
        })),
      }))}
    />
  );
}
