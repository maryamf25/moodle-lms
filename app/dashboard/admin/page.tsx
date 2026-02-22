import { requireAppAuth } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';
import AdminManagementPanel from '@/components/features/admin/AdminManagementPanel';
import CourseManagementPanel from '@/components/features/admin/CourseManagementPanel';
import { getMoodleCategoriesAdmin } from '@/lib/moodle/admin-courses';
import { getCourseCatalog } from '@/lib/course-cache';

export default async function AdminDashboardPage() {
  await requireAppAuth('admin');

  const [users, activityLogs, courses, categories] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isSuspended: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        moodleUserId: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isSuspended: true,
        lastLoginAt: true,
      },
    }),
    prisma.adminActivityLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        details: true,
        createdAt: true,
        adminUser: {
          select: { username: true },
        },
        targetUser: {
          select: { username: true },
        },
      },
    }),
    getCourseCatalog(),
    getMoodleCategoriesAdmin().catch(() => []),
  ]);

  console.log(
    '[admin][courses] dashboard catalog prices',
    courses.map((course) => ({
      moodleCourseId: course.moodleCourseId,
      fullname: course.fullname,
      price: Number(course.price),
      isVisible: course.isVisible,
    })),
  );

  return (
    <div className="space-y-8">
      <CourseManagementPanel
        courses={courses.map((course) => ({
          ...course,
          price: course.price.toString(),
          lastSyncedAt: course.lastSyncedAt ? new Date(course.lastSyncedAt).toISOString() : new Date().toISOString(),
        }))}
        categories={categories}
      />
      <AdminManagementPanel
        users={users.map((user) => ({
          ...user,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        }))}
        activityLogs={activityLogs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
