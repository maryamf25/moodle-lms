'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MoodleRole } from '@/lib/auth/roles';
import { assignRoleAction, resetPasswordAction, suspendUserAction } from '@/app/dashboard/admin/actions';

interface AdminUserRow {
  id: string;
  moodleUserId: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: MoodleRole;
  isSuspended: boolean;
  lastLoginAt: string | null;
}

interface ActivityRow {
  id: string;
  action: string;
  createdAt: string;
  details: unknown;
  adminUser: {
    username: string;
  };
  targetUser: {
    username: string;
  } | null;
}

interface AdminManagementPanelProps {
  users: AdminUserRow[];
  activityLogs: ActivityRow[];
}

const APP_ROLES: MoodleRole[] = ['admin', 'student', 'parent', 'school'];

export default function AdminManagementPanel({ users, activityLogs }: AdminManagementPanelProps) {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [resetPasswordInputs, setResetPasswordInputs] = useState<Record<number, string>>({});

  const setPasswordDraft = (moodleUserId: number, password: string) => {
    setResetPasswordInputs((prev) => ({ ...prev, [moodleUserId]: password }));
  };

  const onSuspendToggle = (moodleUserId: number, suspend: boolean) => {
    startTransition(async () => {
      try {
        const result = await suspendUserAction({ moodleUserId, suspend });
        setStatusMessage(result.message);
        if (result.ok) router.refresh();
      } catch (error: unknown) {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to update account status');
      }
    });
  };

  const onResetPassword = (moodleUserId: number) => {
    const draft = (resetPasswordInputs[moodleUserId] || '').trim();
    if (!draft) {
      setStatusMessage('Enter a password before resetting.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await resetPasswordAction({
          moodleUserId,
          newPassword: draft,
        });
        setStatusMessage(result.message);
        if (result.ok) router.refresh();
        setPasswordDraft(moodleUserId, '');
      } catch (error: unknown) {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to reset password');
      }
    });
  };

  const onAssignRole = (moodleUserId: number, role: MoodleRole) => {
    startTransition(async () => {
      try {
        const result = await assignRoleAction({ moodleUserId, role });
        setStatusMessage(result.message);
        if (result.ok) router.refresh();
      } catch (error: unknown) {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to assign role');
      }
    });
  };

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Management</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage users, suspend accounts, reset passwords, assign roles, and monitor activity logs.
        </p>
        {statusMessage && (
          <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {statusMessage}
          </p>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Manage Users</h2>
          <p className="text-sm text-slate-500">{users.length} synced users</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Last Login</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4 pr-4 align-top">
                    <p className="font-medium text-slate-900">{user.firstName || user.username}</p>
                    <p className="text-xs text-slate-500">
                      {user.email || 'No email'} | Moodle ID: {user.moodleUserId}
                    </p>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <select
                      defaultValue={user.role}
                      disabled={isPending}
                      onChange={(event) => onAssignRole(user.moodleUserId, event.target.value as MoodleRole)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60"
                    >
                      {APP_ROLES.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 pr-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.isSuspended ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {user.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="py-4 pr-4 align-top text-sm text-slate-600">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-4 align-top">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onSuspendToggle(user.moodleUserId, !user.isSuspended)}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                            user.isSuspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {user.isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="password"
                          value={resetPasswordInputs[user.moodleUserId] || ''}
                          disabled={isPending}
                          onChange={(event) => setPasswordDraft(user.moodleUserId, event.target.value)}
                          placeholder="New password"
                          className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 disabled:opacity-60"
                        />
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onResetPassword(user.moodleUserId)}
                          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              No synced users found. Users appear here after first login.
            </p>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Activity Logs</h2>
          <p className="text-sm text-slate-500">Latest {activityLogs.length} actions</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Admin</th>
                <th className="py-3 pr-4">Target</th>
                <th className="py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 pr-4 text-sm text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-slate-900">{log.action}</td>
                  <td className="py-3 pr-4 text-sm text-slate-700">{log.adminUser.username}</td>
                  <td className="py-3 pr-4 text-sm text-slate-700">{log.targetUser?.username || '-'}</td>
                  <td className="py-3 text-xs text-slate-500">
                    <pre className="whitespace-pre-wrap break-words">{JSON.stringify(log.details || {}, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activityLogs.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">No admin actions logged yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
