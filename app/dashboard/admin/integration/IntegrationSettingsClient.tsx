'use client';

import { useMemo, useState } from 'react';
import { IntegrationSyncTarget } from '@prisma/client';
import {
  runIntegrationSyncNowAction,
  saveIntegrationSyncSettingsAction,
} from '@/app/actions/integration';

interface SyncRun {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  startedAt: string;
  finishedAt: string | null;
  itemsSynced: number | null;
  error: string | null;
}

interface DashboardItem {
  target: IntegrationSyncTarget;
  config: {
    enabled: boolean;
    frequencyMinutes: number;
    lastRunAt: string | null;
    nextRunAt: string | null;
  };
  recentRuns: SyncRun[];
}

interface IntegrationSettingsClientProps {
  dashboards: DashboardItem[];
}

const TARGET_LABELS: Record<IntegrationSyncTarget, string> = {
  COURSE_CATALOG: 'Course Catalog',
  USER_DIRECTORY: 'User Directory',
  ENROLLMENTS: 'Enrollments',
};

export default function IntegrationSettingsClient(props: IntegrationSettingsClientProps) {
  const [dashboards, setDashboards] = useState(props.dashboards);
  const [savingTarget, setSavingTarget] = useState<IntegrationSyncTarget | null>(null);
  const [syncingTarget, setSyncingTarget] = useState<IntegrationSyncTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedDashboards = useMemo(
    () => [...dashboards].sort((a, b) => a.target.localeCompare(b.target)),
    [dashboards],
  );

  function updateLocalTarget(target: IntegrationSyncTarget, patch: Partial<DashboardItem['config']>) {
    setDashboards((prev) =>
      prev.map((item) =>
        item.target === target
          ? { ...item, config: { ...item.config, ...patch } }
          : item,
      ),
    );
  }

  async function handleSave(target: IntegrationSyncTarget) {
    const item = dashboards.find((entry) => entry.target === target);
    if (!item) return;

    setMessage(null);
    setError(null);
    setSavingTarget(target);

    try {
      const result = await saveIntegrationSyncSettingsAction({
        target,
        enabled: item.config.enabled,
        frequencyMinutes: item.config.frequencyMinutes,
      });
      if (!result.ok) {
        setError(result.message);
      } else {
        setMessage(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingTarget(null);
    }
  }

  async function handleSyncNow(target: IntegrationSyncTarget) {
    setMessage(null);
    setError(null);
    setSyncingTarget(target);

    try {
      const result = await runIntegrationSyncNowAction(target);
      if (!result.ok) {
        setError(result.message);
      } else {
        setMessage(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run sync');
    } finally {
      setSyncingTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Moodle Integration Settings</h1>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Configure per-target sync schedule and run manual syncs.
        </p>
      </section>

      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}

      {orderedDashboards.map((item) => (
        <section key={item.target} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">{TARGET_LABELS[item.target]}</h2>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mt-1">{item.target}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(item.target)}
                disabled={savingTarget === item.target}
                className="rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black"
              >
                {savingTarget === item.target ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => handleSyncNow(item.target)}
                disabled={syncingTarget === item.target}
                className="rounded-xl px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-black"
              >
                {syncingTarget === item.target ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={item.config.enabled}
                onChange={(e) => updateLocalTarget(item.target, { enabled: e.target.checked })}
                className="w-4 h-4"
              />
              Enable scheduled sync
            </label>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Frequency (minutes)</label>
              <input
                type="number"
                min={5}
                value={item.config.frequencyMinutes}
                onChange={(e) =>
                  updateLocalTarget(item.target, { frequencyMinutes: Number(e.target.value || 5) })
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-slate-400 uppercase tracking-wider">Last Run</p>
                <p className="font-semibold text-slate-700 mt-1">
                  {item.config.lastRunAt ? new Date(item.config.lastRunAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-slate-400 uppercase tracking-wider">Next Run</p>
                <p className="font-semibold text-slate-700 mt-1">
                  {item.config.nextRunAt ? new Date(item.config.nextRunAt).toLocaleString() : 'Not scheduled'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-800 mb-2">Recent Runs</h3>
            {item.recentRuns.length === 0 ? (
              <p className="text-sm text-slate-500">No runs yet.</p>
            ) : (
              <div className="space-y-2">
                {item.recentRuns.slice(0, 8).map((run) => (
                  <div key={run.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-slate-700">{run.status}</span>
                      <span className="text-slate-500">{new Date(run.startedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 text-xs mt-1">
                      Synced: {run.itemsSynced ?? 0}
                      {run.error ? ` • ${run.error}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
