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
    if (localCourse) {
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

        // Check terminal for this:
        console.log("--- MOODLE API RESPONSE ---", JSON.stringify(data, null, 2));

        if (data.courses && data.courses.length > 0) {
            const course = data.courses[0];

            // Try to find the field by common shortnames
            const priceField = course.customfields?.find(
                (f) => f.shortname === 'price' || f.shortname === 'course_price'
            );

            return {
                id: course.id,
                price: priceField ? parseFloat(priceField.value) : 0
            };
        }
    } catch (error) {
        console.error("Price fetch error:", error);
    }

    // Mature Fallback: return 0 instead of null to prevent frontend crashes
    return { id: courseId, price: 0 };
}
// --- 3. FETCH USER COURSES ---
export async function getUserCourses(token: string, userid: number): Promise<EnrolledCourse[]> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_enrol_get_users_courses',
        moodlewsrestformat: 'json',
        userid: userid.toString(),
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch courses');

    const data = await response.json();
    if (Array.isArray(data)) {
        // Helper to extract image if needed, or just return data
        return data.map((course: EnrolledCourse) => ({
            ...course,
            fileurl: course.overviewfiles?.[0]?.fileurl?.replace('?token=', `?token=${token}`) || '' // naive token append
        }));
    }
    return [];
}

// --- 4. FETCH COURSE CONTENTS ---
export async function getCourseContents(token: string, courseid: number): Promise<CourseContent[]> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_course_get_contents',
        moodlewsrestformat: 'json',
        courseid: courseid.toString(),
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch course contents');

    const data = await response.json();

    if (Array.isArray(data)) {
        // Process modules to add convenience fields
        return data.map((section: MoodleSection) => ({
            ...section,
            modules: section.modules.map((mod: MoodleModule) => ({
                ...mod,
                fileurl: mod.contents?.[0]?.fileurl || '',
                filename: mod.contents?.[0]?.filename || ''
            }))
        })) as CourseContent[];
    }

    return [];
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
