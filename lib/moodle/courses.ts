import { EnrolledCourse, CourseContent } from './types';
import { prisma } from '@/lib/db/prisma';
import { moodleWebserviceGet, moodleWebservicePost } from './client';
import { extractCoursePrice } from './mappers';

interface MoodleCustomField {
  shortname?: string;
  value?: string;
}

interface MoodleCoursePriceRow {
  id: number;
  customfields?: MoodleCustomField[];
}

interface MoodleCoursePriceResponse {
  courses?: MoodleCoursePriceRow[];
  exception?: string;
  message?: string;
}

interface MoodleCategorySummary {
  cancomplete?: boolean;
  visible?: number;
}

function getCourseAdminToken(): string {
  return process.env.MOODLE_ADMIN_MANAGE || process.env.MOODLE_ADMIN_TOKEN || '';
}

export async function enrolUser(userId: number, courseId: number) {
  try {
    const data = await moodleWebservicePost<MoodleCoursePriceResponse>(
      process.env.MOODLE_ADMIN_TOKEN || '',
      'enrol_manual_enrol_users',
      new URLSearchParams({
        'enrolments[0][roleid]': '5',
        'enrolments[0][userid]': userId.toString(),
        'enrolments[0][courseid]': courseId.toString(),
      }),
    );

    if (data && data.exception) {
      console.error('MOODLE ENROLLMENT EXCEPTION:', data.message);
      return { error: data.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Enrollment error:', error);
    throw error;
  }
}

export async function getCoursePriceInfo(courseId: number) {
  const localCourse = await prisma.courseCatalog.findUnique({
    where: { moodleCourseId: courseId },
    select: { price: true },
  });

  if (localCourse) {
    return {
      id: courseId,
      price: Number(localCourse.price),
    };
  }

  try {
    const data = await moodleWebserviceGet<MoodleCoursePriceResponse>(
      getCourseAdminToken(),
      'core_course_get_courses_by_field',
      new URLSearchParams({
        field: 'id',
        value: courseId.toString(),
      }),
    );

    if (data.courses && data.courses.length > 0) {
      const course = data.courses[0];
      const moodlePrice = extractCoursePrice(course) ?? 0;
      return {
        id: course.id,
        price: moodlePrice,
      };
    }
  } catch (error) {
    console.error('Price fetch error:', error);
  }

  return { id: courseId, price: 0 };
}

export async function getUserCourses(token: string, userid: number): Promise<EnrolledCourse[]> {
  try {
    const adminToken = process.env.MOODLE_ADMIN_TOKEN;
    const effectiveToken = token || adminToken;
    if (!effectiveToken) return [];

    let data = await moodleWebserviceGet<any>(
      effectiveToken,
      'core_enrol_get_users_courses',
      new URLSearchParams({ userid: userid.toString() }),
    );

    if ((!Array.isArray(data) || data.length === 0) && adminToken && token !== adminToken) {
      data = await moodleWebserviceGet<any>(
        adminToken,
        'core_enrol_get_users_courses',
        new URLSearchParams({ userid: userid.toString() }),
      );
    }

    if (data?.exception) {
      console.error('Moodle API Exception in getUserCourses:', data);
      return [];
    }

    let courseList = Array.isArray(data) ? data : [];

    let timelineCourses: any[] = [];
    try {
      const timelineData = await moodleWebserviceGet<any>(
        token,
        'core_course_get_enrolled_courses_by_timeline_classification',
        new URLSearchParams({ classification: 'all' }),
      );

      if (timelineData && !timelineData.exception) {
        timelineCourses = timelineData.courses || [];
      }
    } catch (e) {
      console.warn('Could not fetch timeline progress', e);
    }

    if (courseList.length === 0 && timelineCourses.length > 0) {
      courseList = timelineCourses.map((tc) => ({
        id: tc.id,
        fullname: tc.fullname,
        shortname: tc.shortname,
        progress: tc.progress,
        completed: tc.completed,
        overviewfiles: tc.courseimage ? [{ fileurl: tc.courseimage }] : [],
      }));
    }

    return courseList.map((course: EnrolledCourse) => {
      const matchedTimeline = timelineCourses.find((tc) => tc.id === course.id);
      const progress = matchedTimeline ? matchedTimeline.progress : course.progress || 0;
      const completed = matchedTimeline ? matchedTimeline.completed : course.completed || false;

      return {
        ...course,
        progress,
        completed,
        fileurl: course.overviewfiles?.[0]?.fileurl?.replace('?token=', `?token=${token}`) || '',
      };
    });
  } catch (error) {
    console.error('getUserCourses CRITICAL Error:', error);
    return [];
  }
}

export async function getCourseContents(token: string, courseid: number): Promise<CourseContent[]> {
  try {
    const adminToken = process.env.MOODLE_ADMIN_TOKEN;
    const effectiveToken = token || adminToken;
    if (!effectiveToken) return [];

    const fetchContents = async (useToken: string) => {
      return await moodleWebserviceGet<any>(
        useToken,
        'core_course_get_contents',
        new URLSearchParams({ courseid: courseid.toString() }),
      );
    };

    let data = await fetchContents(effectiveToken);

    const isError =
      !Array.isArray(data) ||
      data.length === 0 ||
      (typeof data === 'object' && data !== null && (data as any).exception);

    if (isError && adminToken && token !== adminToken) {
      const adminData = await fetchContents(adminToken);
      if (Array.isArray(adminData) && adminData.length > 0) {
        data = adminData;
      }
    }

    if (Array.isArray(data)) {
      return data.map((section: any) => ({
        ...section,
        modules: (section.modules || []).map((mod: any) => ({
          ...mod,
          fileurl: mod.contents?.[0]?.fileurl || '',
          filename: mod.contents?.[0]?.filename || '',
        })),
      })) as CourseContent[];
    }

    return [];
  } catch (error) {
    console.error('getCourseContents Error:', error);
    return [];
  }
}

export async function getEnrolledUsers(token: string, courseid: number) {
  try {
    const data = await moodleWebserviceGet<any>(
      token,
      'core_enrol_get_enrolled_users',
      new URLSearchParams({ courseid: courseid.toString() }),
    );
    if (data && data.exception) return [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error in getEnrolledUsers:', error);
    return [];
  }
}

export async function canUserCreateCourse(token: string): Promise<boolean> {
  try {
    const data = await moodleWebserviceGet<any>(
      token,
      'core_course_get_categories',
      new URLSearchParams({
        'criteria[0][key]': 'parent',
        'criteria[0][value]': '0',
      }),
    );

    if (Array.isArray(data)) {
      return data.some((cat: MoodleCategorySummary) => cat.cancomplete === true || cat.visible === 1);
    }
    return false;
  } catch {
    return false;
  }
}

export async function getCategories(token: string) {
  try {
    const data = await moodleWebserviceGet<any>(token, 'core_course_get_categories', new URLSearchParams());
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error in getCategories:', error);
    return [];
  }
}
