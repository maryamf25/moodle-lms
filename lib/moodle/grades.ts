import { moodleWebserviceGet } from './client';

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
            userid: String(childId),
        });

        const courses = await moodleWebserviceGet<any>(adminToken, 'core_enrol_get_users_courses', coursesParams);

        if (!Array.isArray(courses)) return [];

        // 2. For each course, fetch grades and completion
        const gradesProm = courses.map(async (course: any) => {
            try {
                const gradeParams = new URLSearchParams({
                    courseid: String(course.id),
                    userid: String(childId),
                });

                const gradeData = await moodleWebserviceGet<any>(adminToken, 'gradereport_user_get_grade_items', gradeParams);

                // Extract final grade (usually at the end of the usergrades array)
                const finalGradeItem = gradeData?.usergrades?.[0]?.gradeitems?.find((item: any) => item.itemtype === 'course');

                // Clean up percentage (Moodle might return " - " or "85 %")
                const rawPercentage = finalGradeItem?.percentageformatted || '';
                const cleanPercentage = parseFloat(rawPercentage.replace(/[^\d.]/g, ''));

                return {
                    courseId: course.id,
                    courseName: course.fullname,
                    grade: (finalGradeItem?.gradeformatted && finalGradeItem.gradeformatted !== '-')
                        ? finalGradeItem.gradeformatted
                        : 'N/A',
                    percentage: isNaN(cleanPercentage) ? 0 : cleanPercentage,
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
