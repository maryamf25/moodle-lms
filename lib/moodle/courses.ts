import { BASE_URL } from './api';
import { EnrolledCourse, CourseContent } from './types';
import { prisma } from '@/lib/db/prisma';

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

interface MoodleModuleContent {
    fileurl?: string;
    filename?: string;
}

interface MoodleModule {
    contents?: MoodleModuleContent[];
}

interface MoodleSection {
    modules: MoodleModule[];
}

interface MoodleCategorySummary {
    cancomplete?: boolean;
    visible?: number;
}

function getCourseAdminToken(): string {
    return process.env.MOODLE_ADMIN_MANAGE || process.env.MOODLE_ADMIN_TOKEN || '';
}

// --- Enroll User Function ---
export async function enrolUser(userId: number, courseId: number) {
    try {
        const url = `${BASE_URL}/webservice/rest/server.php`;

        const bodyParams = new URLSearchParams({
            wstoken: process.env.MOODLE_ADMIN_TOKEN!,
            wsfunction: 'enrol_manual_enrol_users',
            moodlewsrestformat: 'json',
            'enrolments[0][roleid]': '5',
            'enrolments[0][userid]': userId.toString(),
            'enrolments[0][courseid]': courseId.toString(),
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: bodyParams.toString(),
        });

        const data = await response.json() as MoodleCoursePriceResponse;

        // Moodle returns null/empty array on success, but an object on error
        if (data && data.exception) {
            console.error("❌ MOODLE ENROLLMENT EXCEPTION:", data.message);
            return { error: data.message };
        }

        console.log(`✨ Successfully enrolled User ${userId} in Course ${courseId}`);
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
    console.log('[pricing] getCoursePriceInfo local lookup', {
        courseId,
        found: Boolean(localCourse),
        localPrice: localCourse ? Number(localCourse.price) : null,
    });
    if (localCourse) {
        console.log('[pricing] getCoursePriceInfo source=local-db', {
            courseId,
            price: Number(localCourse.price),
        });
        return {
            id: courseId,
            price: Number(localCourse.price),
        };
    }

    const params = new URLSearchParams({
        wstoken: getCourseAdminToken(),
        wsfunction: 'core_course_get_courses_by_field',
        moodlewsrestformat: 'json',
        field: 'id',
        value: courseId.toString()
    });

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_MOODLE_URL}/webservice/rest/server.php?${params.toString()}`, {
            cache: 'no-store'
        });
        const data = await response.json();
        console.log('[pricing] getCoursePriceInfo moodle response meta', {
            courseId,
            hasCourses: Boolean(data?.courses?.length),
            hasException: Boolean(data?.exception),
            message: data?.message ?? null,
        });

        // Check terminal for this:
        console.log("--- MOODLE API RESPONSE ---", JSON.stringify(data, null, 2));

        if (data.courses && data.courses.length > 0) {
            const course = data.courses[0];

            // Try to find the field by common shortnames
            const priceField = course.customfields?.find(
                (f: MoodleCustomField) => f.shortname === 'price' || f.shortname === 'course_price'
            );
            const moodlePrice = priceField ? parseFloat(priceField.value || '0') : 0;
            console.log('[pricing] getCoursePriceInfo source=moodle-customfield', {
                courseId,
                foundPriceField: Boolean(priceField),
                rawValue: priceField?.value ?? null,
                parsedPrice: moodlePrice,
            });

            return {
                id: course.id,
                price: moodlePrice
            };
        }
    } catch (error) {
        console.error("Price fetch error:", error);
    }

    // Mature Fallback: return 0 instead of null to prevent frontend crashes
    console.log('[pricing] getCoursePriceInfo source=fallback-zero', { courseId });
    return { id: courseId, price: 0 };
}
// --- 3. FETCH USER COURSES ---
export async function getUserCourses(token: string, userid: number): Promise<EnrolledCourse[]> {
    try {
        const adminToken = process.env.MOODLE_ADMIN_TOKEN;

        // Use admin token if provided token fails (common for new students with restricted tokens)
        const effectiveToken = token || adminToken;

        // 1. Get primary course list
        const params = new URLSearchParams({
            wstoken: effectiveToken!,
            wsfunction: 'core_enrol_get_users_courses',
            moodlewsrestformat: 'json',
            userid: userid.toString(),
        });

        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch courses');
        let data = await response.json();

        // If direct fetch is empty but we have an admin token, try again with admin token
        if ((!Array.isArray(data) || data.length === 0) && adminToken && token !== adminToken) {
            console.log(`getUserCourses: Student token returned empty, falling back to admin token for user ${userid}`);
            const adminParams = new URLSearchParams({
                wstoken: adminToken,
                wsfunction: 'core_enrol_get_users_courses',
                moodlewsrestformat: 'json',
                userid: userid.toString(),
            });
            const adminRes = await fetch(`${BASE_URL}/webservice/rest/server.php?${adminParams.toString()}`);
            const adminData = await adminRes.json();
            if (Array.isArray(adminData)) {
                data = adminData;
            }
        }

        // LOGGING FOR DEBUGGING
        if (data.exception) {
            console.error('Moodle API Exception in getUserCourses:', data);
            return [];
        }

        let courseList = Array.isArray(data) ? data : [];

        // 2. Fetch progress and handle empty list fallback using Timeline API
        // Timeline API is often more reliable for "Current" courses
        let timelineCourses: any[] = [];
        try {
            const timelineParams = new URLSearchParams({
                wstoken: token,
                wsfunction: 'core_course_get_enrolled_courses_by_timeline_classification',
                moodlewsrestformat: 'json',
                classification: 'all'
            });
            const timelineRes = await fetch(`${BASE_URL}/webservice/rest/server.php?${timelineParams.toString()}`);
            const timelineData = await timelineRes.json();

            if (timelineData && !timelineData.exception) {
                timelineCourses = timelineData.courses || [];
            }
        } catch (e) {
            console.warn('Could not fetch timeline progress', e);
        }

        // FALLBACK: If core_enrol_get_users_courses is empty but timeline has courses, use timeline
        if (courseList.length === 0 && timelineCourses.length > 0) {
            console.log(`getUserCourses: Using timeline fallback for user ${userid}`);
            courseList = timelineCourses.map(tc => ({
                id: tc.id,
                fullname: tc.fullname,
                shortname: tc.shortname,
                progress: tc.progress,
                completed: tc.completed,
                overviewfiles: tc.courseimage ? [{ fileurl: tc.courseimage }] : []
            })) as any;
        }

        console.log(`getUserCourses: Returning ${courseList.length} courses for user ${userid}`);

        // 3. Merge data
        return courseList.map((course: EnrolledCourse) => {
            const matchedTimeline = timelineCourses.find(tc => tc.id === course.id);
            const progress = matchedTimeline ? matchedTimeline.progress : (course.progress || 0);
            const completed = matchedTimeline ? matchedTimeline.completed : (course.completed || false);

            return {
                ...course,
                progress: progress,
                completed: completed,
                fileurl: course.overviewfiles?.[0]?.fileurl?.replace('?token=', `?token=${token}`) || ''
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

        const fetchContents = async (useToken: string) => {
            const params = new URLSearchParams({
                wstoken: useToken,
                wsfunction: 'core_course_get_contents',
                moodlewsrestformat: 'json',
                courseid: courseid.toString(),
            });
            const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
            if (!response.ok) return null;
            return await response.json();
        };

        let data = await fetchContents(effectiveToken!);

        // Fallback to admin token if empty result or exception
        const isError = !Array.isArray(data) || data.length === 0 || (typeof data === 'object' && data !== null && (data as any).exception);

        if (isError && adminToken && token !== adminToken) {
            console.log(`getCourseContents: Falling back to admin token for course ${courseid}`);
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
                    filename: mod.contents?.[0]?.filename || ''
                }))
            })) as CourseContent[];
        }

        return [];
    } catch (error) {
        console.error('getCourseContents Error:', error);
        return [];
    }
}

export async function getEnrolledUsers(token: string, courseid: number) {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_enrol_get_enrolled_users',
        moodlewsrestformat: 'json',
        courseid: courseid.toString(),
    });

    try {
        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch enrolled users');
        const data = await response.json();
        if (data && data.exception) return [];
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error in getEnrolledUsers:", error);
        return [];
    }
}

// --- 6. CHECK COURSE CREATION PERMISSION ---
export async function canUserCreateCourse(token: string): Promise<boolean> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_course_get_categories',
        moodlewsrestformat: 'json',
        'criteria[0][key]': 'parent',
        'criteria[0][value]': '0', // check top level categories
    });

    try {
        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
        if (!response.ok) return false;
        const data = await response.json();

        // Moodle returns an array of categories. 
        // If the user can create courses in at least one category, return true.
        if (Array.isArray(data)) {
            return data.some((cat: MoodleCategorySummary) => cat.cancomplete === true || cat.visible === 1);
            // Note: 'cancomplete' isn't the right field, it's usually not returned in summary.
            // A better way: If they are an admin or have the function in site info.
        }
        return false;
    } catch (error) {
        return false;
    }
}

// --- 7. FETCH ALL CATEGORIES ---
export async function getCategories(token: string) {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_course_get_categories',
        moodlewsrestformat: 'json',
    });

    try {
        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Error in getCategories:", error);
        return [];
    }
}
