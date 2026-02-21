import { prisma } from '@/lib/db/prisma';
import { moodleWebserviceGet } from '@/lib/moodle/client';
import { mapMoodleUserRow, MoodleEnrolledUserRow } from '@/lib/moodle/mappers';

interface MoodleCourseEnrolledUser extends MoodleEnrolledUserRow {
  roles?: Array<{ shortname?: string }>;
}

export interface SyncEnrollmentsResult {
  syncedCount: number;
  newCount: number;
  updatedCount: number;
  deactivatedCount: number;
  courseCount: number;
}

function getAdminTokenOrThrow(): string {
  const token = process.env.MOODLE_ADMIN_MANAGE || process.env.MOODLE_ADMIN_TOKEN;
  if (!token) throw new Error('Missing MOODLE_ADMIN_MANAGE or MOODLE_ADMIN_TOKEN');
  return token;
}

function toDateFromUnix(timestamp?: number): Date | null {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  return new Date(timestamp * 1000);
}

export async function syncEnrollmentsFromMoodle(): Promise<SyncEnrollmentsResult> {
  const adminToken = getAdminTokenOrThrow();
  const courses = await prisma.courseCatalog.findMany({
    select: {
      id: true,
      moodleCourseId: true,
    },
    orderBy: { moodleCourseId: 'asc' },
  });

  let syncedCount = 0;
  let newCount = 0;
  let updatedCount = 0;
  let deactivatedCount = 0;

  for (const course of courses) {
    const users = await moodleWebserviceGet<MoodleCourseEnrolledUser[]>(
      adminToken,
      'core_enrol_get_enrolled_users',
      new URLSearchParams({ courseid: String(course.moodleCourseId) }),
    );

    const activeUserIds = new Set<number>();

    for (const rawUser of users) {
      const mapped = mapMoodleUserRow(rawUser);
      if (!mapped) continue;

      activeUserIds.add(mapped.moodleUserId);

      const localUser = await prisma.user.upsert({
        where: { moodleUserId: mapped.moodleUserId },
        create: {
          moodleUserId: mapped.moodleUserId,
          username: mapped.username,
          email: mapped.email,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          role: 'student',
          isSuspended: mapped.isSuspended,
        },
        update: {
          username: mapped.username,
          email: mapped.email,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          isSuspended: mapped.isSuspended,
        },
        select: { id: true },
      });

      const existing = await prisma.userCourseEnrollment.findUnique({
        where: {
          moodleUserId_moodleCourseId: {
            moodleUserId: mapped.moodleUserId,
            moodleCourseId: course.moodleCourseId,
          },
        },
        select: { id: true },
      });

      await prisma.userCourseEnrollment.upsert({
        where: {
          moodleUserId_moodleCourseId: {
            moodleUserId: mapped.moodleUserId,
            moodleCourseId: course.moodleCourseId,
          },
        },
        create: {
          userId: localUser.id,
          courseCatalogId: course.id,
          moodleUserId: mapped.moodleUserId,
          moodleCourseId: course.moodleCourseId,
          isActive: true,
          enrolledAt: null,
          lastAccessAt: toDateFromUnix(rawUser.lastaccess),
          lastSyncedAt: new Date(),
        },
        update: {
          userId: localUser.id,
          courseCatalogId: course.id,
          isActive: true,
          lastAccessAt: toDateFromUnix(rawUser.lastaccess),
          lastSyncedAt: new Date(),
        },
      });

      syncedCount += 1;
      if (existing) {
        updatedCount += 1;
      } else {
        newCount += 1;
      }
    }

    const stale = await prisma.userCourseEnrollment.updateMany({
      where: {
        moodleCourseId: course.moodleCourseId,
        moodleUserId: { notIn: [...activeUserIds] },
        isActive: true,
      },
      data: {
        isActive: false,
        lastSyncedAt: new Date(),
      },
    });

    deactivatedCount += stale.count;
  }

  return {
    syncedCount,
    newCount,
    updatedCount,
    deactivatedCount,
    courseCount: courses.length,
  };
}
