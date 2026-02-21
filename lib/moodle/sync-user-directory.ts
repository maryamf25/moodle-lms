import { prisma } from '@/lib/db/prisma';
import { moodleWebserviceGet } from '@/lib/moodle/client';
import { mapMoodleUserRow, MoodleUserRow } from '@/lib/moodle/mappers';

interface MoodleUsersResponse {
  users?: MoodleUserRow[];
  warnings?: Array<{ item?: string; itemid?: number; warningcode?: string; message?: string }>;
  exception?: string;
  message?: string;
}

export interface SyncUserDirectoryResult {
  syncedCount: number;
  newCount: number;
  updatedCount: number;
  skippedCount: number;
}

function getAdminTokenOrThrow(): string {
  const token = process.env.MOODLE_ADMIN_MANAGE || process.env.MOODLE_ADMIN_TOKEN;
  if (!token) throw new Error('Missing MOODLE_ADMIN_MANAGE or MOODLE_ADMIN_TOKEN');
  return token;
}

export async function syncUserDirectoryFromMoodle(): Promise<SyncUserDirectoryResult> {
  const adminToken = getAdminTokenOrThrow();
  const pageSize = Number(process.env.MOODLE_SYNC_USERS_PAGE_SIZE || '200');
  const maxPages = Number(process.env.MOODLE_SYNC_USERS_MAX_PAGES || '50');

  let syncedCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await moodleWebserviceGet<MoodleUsersResponse>(
      adminToken,
      'core_user_get_users',
      new URLSearchParams({
        'criteria[0][key]': 'deleted',
        'criteria[0][value]': '0',
        limitfrom: String(page * pageSize),
        limitnumber: String(pageSize),
      }),
    );

    if (response.exception) {
      throw new Error(response.message || 'Failed to sync Moodle users');
    }

    const users = response.users ?? [];
    if (users.length === 0) {
      break;
    }

    for (const raw of users) {
      const user = mapMoodleUserRow(raw);
      if (!user) {
        skippedCount += 1;
        continue;
      }

      const existing = await prisma.user.findUnique({
        where: { moodleUserId: user.moodleUserId },
        select: { id: true },
      });

      await prisma.user.upsert({
        where: { moodleUserId: user.moodleUserId },
        create: {
          moodleUserId: user.moodleUserId,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: 'student',
          isSuspended: user.isSuspended,
          lastLoginAt: new Date(),
        },
        update: {
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isSuspended: user.isSuspended,
        },
      });

      syncedCount += 1;
      if (existing) {
        updatedCount += 1;
      } else {
        newCount += 1;
      }
    }

    if (users.length < pageSize) {
      break;
    }
  }

  return {
    syncedCount,
    newCount,
    updatedCount,
    skippedCount,
  };
}
