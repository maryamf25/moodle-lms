import { CourseCatalog } from '@prisma/client';
import redis from '@/lib/redis';
import { prisma } from '@/lib/db/prisma';

const COURSE_CATALOG_CACHE_KEY = 'course-catalog';
const COURSE_CATALOG_CACHE_TTL = 3600; // 1 hour

/**
 * Retrieves the course catalog from the cache if available, otherwise fetches it
 * from the database and caches it.
 *
 * @returns {Promise<CourseCatalog[]>} A promise that resolves to the course catalog.
 */
export async function getCourseCatalog(): Promise<CourseCatalog[]> {
  try {
    const cachedCatalog = await redis.get(COURSE_CATALOG_CACHE_KEY);
    if (cachedCatalog) {
      return JSON.parse(cachedCatalog) as CourseCatalog[];
    }
  } catch (error) {
    console.error('Error fetching course catalog from Redis:', error);
  }

  const catalogFromDb = await prisma.courseCatalog.findMany({
    orderBy: {
      fullname: 'asc',
    },
  });

  if (catalogFromDb.length > 0) {
    try {
      await redis.set(
        COURSE_CATALOG_CACHE_KEY,
        JSON.stringify(catalogFromDb),
        'EX',
        COURSE_CATALOG_CACHE_TTL
      );
    } catch (error) {
      console.error('Error caching course catalog in Redis:', error);
    }
  }

  return catalogFromDb;
}

/**
 * Retrieves a single course from the cache or database.
 *
 * @param {number} courseId The Moodle course ID.
 * @returns {Promise<CourseCatalog | null>} A promise that resolves to the course or null if not found.
 */
export async function getCourseById(courseId: number): Promise<CourseCatalog | null> {
    const catalog = await getCourseCatalog();
    const course = catalog.find(c => c.moodleCourseId === courseId);
    if (course) {
        return course;
    }

    // Fallback to DB if not in cache for some reason
    const courseFromDb = await prisma.courseCatalog.findUnique({
        where: { moodleCourseId: courseId },
    });

    return courseFromDb;
}


/**
 * Invalidates the course catalog cache.
 */
export async function invalidateCourseCatalogCache(): Promise<void> {
  try {
    await redis.del(COURSE_CATALOG_CACHE_KEY);
  } catch (error) {
    console.error('Error invalidating course catalog cache:', error);
  }
}
