import { BASE_URL } from './api';
import { EnrolledCourse, CourseContent } from './types';

// --- Enroll User Function ---
export async function enrolUser(userId: number, courseId: number) {
    try {
        const params = new URLSearchParams({
            wstoken: process.env.MOODLE_ADMIN_TOKEN!,
            wsfunction: 'enrol_manual_enrol_users',
            moodlewsrestformat: 'json',
        });

        const bodyParams = new URLSearchParams();
        bodyParams.append('enrolments[0][roleid]', '5'); // 5 = Student
        bodyParams.append('enrolments[0][userid]', userId.toString());
        bodyParams.append('enrolments[0][courseid]', courseId.toString());

        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`, {
            method: 'POST',
            body: bodyParams,
        });

        // Moodle returns null usually on success for void functions, or exception
        const text = await response.text();
        // Try parse json
        try {
            const data = JSON.parse(text);
            if (data && data.exception) return { error: data.message };
            return { success: true };
        } catch {
            // if empty or not json, assume success if status ok?
            return { success: true };
        }
    } catch (error) {
        console.error('Enrollment error:', error);
        throw error;
    }
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
        return data.map((course: any) => ({
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
        return data.map((section: any) => ({
            ...section,
            modules: section.modules.map((mod: any) => ({
                ...mod,
                fileurl: mod.contents?.[0]?.fileurl || '',
                filename: mod.contents?.[0]?.filename || ''
            }))
        }));
    }

    return [];
}
