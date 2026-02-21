import { MoodleRole } from '@/lib/auth/roles';
import { moodleWebservicePost } from '@/lib/moodle/client';

interface MoodleErrorShape {
  exception?: string;
  errorcode?: string;
  message?: string;
}

interface MoodleUserRecord {
  id: number;
  username: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  suspended?: number;
}

function getAdminTokenOrThrow(): string {
  const token = process.env.MOODLE_ADMIN_MANAGE || process.env.MOODLE_ADMIN_TOKEN;
  if (!token) {
    throw new Error('MOODLE_ADMIN_MANAGE (or MOODLE_ADMIN_TOKEN) is not configured');
  }
  return token;
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

async function callMoodleAdmin(wsfunction: string, params: URLSearchParams): Promise<unknown> {
  const data = await moodleWebservicePost(getAdminTokenOrThrow(), wsfunction, params);
  const moodleError = parseMoodleError(data);
  if (moodleError?.exception || moodleError?.errorcode) {
    throw new Error(moodleError.message || `Moodle returned an error in ${wsfunction}`);
  }
  return data;
}

function resolveMoodleRoleId(appRole: MoodleRole): number {
  const roleIdFromEnv =
    appRole === 'admin'
      ? process.env.MOODLE_ROLE_ADMIN_ID
      : appRole === 'parent'
        ? process.env.MOODLE_ROLE_PARENT_ID
        : appRole === 'school'
          ? process.env.MOODLE_ROLE_SCHOOL_ID
          : process.env.MOODLE_ROLE_STUDENT_ID;

  const fallback = appRole === 'admin' ? 1 : appRole === 'student' ? 5 : null;
  const resolved = roleIdFromEnv ? Number(roleIdFromEnv) : fallback;
  if (!resolved || Number.isNaN(resolved) || resolved <= 0) {
    const envName =
      appRole === 'admin'
        ? 'MOODLE_ROLE_ADMIN_ID'
        : appRole === 'parent'
          ? 'MOODLE_ROLE_PARENT_ID'
          : appRole === 'school'
            ? 'MOODLE_ROLE_SCHOOL_ID'
            : 'MOODLE_ROLE_STUDENT_ID';
    throw new Error(`Missing Moodle role mapping for "${appRole}". Set ${envName} in .env`);
  }
  return resolved;
}

function getKnownMoodleRoleIdsForUnassign(): number[] {
  const roleEnvValues = [
    process.env.MOODLE_ROLE_ADMIN_ID,
    process.env.MOODLE_ROLE_PARENT_ID,
    process.env.MOODLE_ROLE_SCHOOL_ID,
    process.env.MOODLE_ROLE_STUDENT_ID,
  ];

  const parsed = roleEnvValues
    .map((value) => (value ? Number(value) : null))
    .filter((value): value is number => value !== null && !Number.isNaN(value) && value > 0);

  for (const fallback of [1, 5]) {
    if (!parsed.includes(fallback)) parsed.push(fallback);
  }

  return parsed;
}

export async function setMoodleUserSuspended(moodleUserId: number, suspended: boolean): Promise<void> {
  const params = new URLSearchParams({
    'users[0][id]': String(moodleUserId),
    'users[0][suspended]': suspended ? '1' : '0',
  });
  await callMoodleAdmin('core_user_update_users', params);
}

export async function getMoodleUserById(moodleUserId: number): Promise<MoodleUserRecord | null> {
  const params = new URLSearchParams({
    field: 'id',
    'values[0]': String(moodleUserId),
  });
  const payload = await callMoodleAdmin('core_user_get_users_by_field', params);
  if (!Array.isArray(payload) || payload.length === 0) {
    return null;
  }
  const first = payload[0] as MoodleUserRecord;
  if (!first?.id || !first?.username) {
    return null;
  }
  return first;
}

export async function resetMoodleUserPassword(moodleUserId: number, newPassword: string): Promise<void> {
  if (!newPassword.trim()) {
    throw new Error('New password is required');
  }
  const params = new URLSearchParams({
    'users[0][id]': String(moodleUserId),
    'users[0][password]': newPassword.trim(),
  });
  await callMoodleAdmin('core_user_update_users', params);
}

export async function assignMoodleUserRole(moodleUserId: number, appRole: MoodleRole): Promise<void> {
  const roleId = resolveMoodleRoleId(appRole);
  const contextId = Number(process.env.MOODLE_SYSTEM_CONTEXT_ID || '1');
  if (!contextId || Number.isNaN(contextId) || contextId <= 0) {
    throw new Error('Invalid MOODLE_SYSTEM_CONTEXT_ID configured');
  }

  const knownRoleIds = getKnownMoodleRoleIdsForUnassign();
  if (knownRoleIds.length > 0) {
    const unassignParams = new URLSearchParams();
    knownRoleIds.forEach((knownRoleId, index) => {
      unassignParams.append(`unassignments[${index}][roleid]`, String(knownRoleId));
      unassignParams.append(`unassignments[${index}][userid]`, String(moodleUserId));
      unassignParams.append(`unassignments[${index}][contextid]`, String(contextId));
    });
    await callMoodleAdmin('core_role_unassign_roles', unassignParams);
  }

  const assignParams = new URLSearchParams({
    'assignments[0][roleid]': String(roleId),
    'assignments[0][userid]': String(moodleUserId),
    'assignments[0][contextid]': String(contextId),
  });
  await callMoodleAdmin('core_role_assign_roles', assignParams);
}
