import { BASE_URL } from './api';

export interface CourseGrade {
    courseId: number;
    courseName: string;
    grade: string;
    percentage: number;
    progress: number;
}

export async function getStudentGrades(childId: number): Promise<CourseGrade[]> {
    const adminToken = process.env.MOODLE_ADMIN_TOKEN;
    if (!adminToken) throw new Error('MOODLE_ADMIN_TOKEN is not configured');

    try {
        // 1. Get user's enrolled courses
        const coursesParams = new URLSearchParams({
            wstoken: adminToken,
            wsfunction: 'core_enrol_get_users_courses',
            moodlewsrestformat: 'json',
            userid: String(childId),
        });

        const coursesRes = await fetch(`${BASE_URL}/webservice/rest/server.php?${coursesParams.toString()}`);
        const courses = await coursesRes.json();

        if (!Array.isArray(courses)) return [];

        // 2. For each course, fetch grades and completion
        const gradesProm = courses.map(async (course: any) => {
            try {
                const gradeParams = new URLSearchParams({
                    wstoken: adminToken,
                    wsfunction: 'gradereport_user_get_grade_items',
                    moodlewsrestformat: 'json',
                    courseid: String(course.id),
                    userid: String(childId),
                });

                const gradeRes = await fetch(`${BASE_URL}/webservice/rest/server.php?${gradeParams.toString()}`);
                const gradeData = await gradeRes.json();

                // Extract final grade (usually at the end of the usergrades array)
                const finalGradeItem = gradeData?.usergrades?.[0]?.gradeitems?.find((item: any) => item.itemtype === 'course');

                return {
                    courseId: course.id,
                    courseName: course.fullname,
                    grade: finalGradeItem?.gradeformatted || 'N/A',
                    percentage: parseFloat(finalGradeItem?.percentageformatted || '0'),
                    progress: course.progress || 0
                };
            } catch (err) {
                return {
                    courseId: course.id,
                    courseName: course.fullname,
                    grade: 'N/A',
                    percentage: 0,
                    progress: course.progress || 0
                };
            }
        });

        return await Promise.all(gradesProm);
    } catch (error) {
        console.error('Error fetching student grades:', error);
        return [];
    }
}
