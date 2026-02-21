import { prisma } from '@/lib/db/prisma';
import { getMoodleCategoriesAdmin, getMoodleCoursesAdmin } from '@/lib/moodle/admin-courses';

interface SyncCourseCatalogOptions {
  actingAdminUserId?: string;
}

export interface SyncCourseCatalogResult {
  syncedCount: number;
  removedCount: number;
  categoryCount: number;
}

export async function syncCourseCatalogFromMoodle(
  options: SyncCourseCatalogOptions = {},
): Promise<SyncCourseCatalogResult> {
  const [moodleCourses, moodleCategories] = await Promise.all([
    getMoodleCoursesAdmin(),
    getMoodleCategoriesAdmin().catch(() => []),
  ]);

  const categoryMap = new Map(moodleCategories.map((category) => [category.id, category.name]));
  let removedCount = 0;

  await prisma.$transaction(async (tx) => {
    const moodleCourseIds = moodleCourses.map((course) => course.id);

    for (const course of moodleCourses) {
      const existing = await tx.courseCatalog.findUnique({
        where: { moodleCourseId: course.id },
        select: { price: true },
      });

      const existingPrice = existing ? Number(existing.price) : null;
      const resolvedPrice =
        existingPrice !== null
          ? existingPrice > 0
            ? existingPrice
            : (course.moodlePrice ?? existingPrice)
          : (course.moodlePrice ?? 0);

      await tx.courseCatalog.upsert({
        where: { moodleCourseId: course.id },
        create: {
          moodleCourseId: course.id,
          shortname: course.shortname,
          fullname: course.fullname,
          summary: course.summary,
          categoryId: course.categoryId,
          categoryName: course.categoryId ? categoryMap.get(course.categoryId) || null : null,
          isVisible: course.visible,
          price: resolvedPrice,
          lastSyncedAt: new Date(),
        },
        update: {
          shortname: course.shortname,
          fullname: course.fullname,
          summary: course.summary,
          categoryId: course.categoryId,
          categoryName: course.categoryId ? categoryMap.get(course.categoryId) || null : null,
          isVisible: course.visible,
          price: resolvedPrice,
          lastSyncedAt: new Date(),
        },
      });
    }

    const staleDelete = await tx.courseCatalog.deleteMany({
      where: {
        moodleCourseId: {
          notIn: moodleCourseIds,
        },
      },
    });
    removedCount = staleDelete.count;

    if (options.actingAdminUserId) {
      await tx.adminActivityLog.create({
        data: {
          adminUserId: options.actingAdminUserId,
          action: 'COURSES_SYNCED',
          details: {
            syncedCount: moodleCourses.length,
            removedCount,
            categoryCount: moodleCategories.length,
          },
        },
      });
    }
  });

  return {
    syncedCount: moodleCourses.length,
    removedCount,
    categoryCount: moodleCategories.length,
  };
}
