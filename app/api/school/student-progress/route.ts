
import { NextRequest, NextResponse } from 'next/server';
import { getUserCourses } from '@/lib/moodle/courses';
import { getStudentGrades } from '@/lib/moodle/grades';
import { getFullUserProfile } from '@/lib/moodle/user';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.nextUrl);
    const courseId = parseInt(searchParams.get('courseId') || '0');
    const studentIdsStr = searchParams.get('studentIds') || '';
    const studentIds = studentIdsStr.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (!courseId || studentIds.length === 0) {
        return NextResponse.json([]);
    }

    const adminToken = process.env.MOODLE_ADMIN_TOKEN!;

    try {
        const results = await Promise.all(studentIds.map(async (userId) => {
            try {
                // Fetch progress & basic details for each student independently to ensure accuracy
                const [courses, grades, profile] = await Promise.all([
                    getUserCourses(adminToken, userId),
                    getStudentGrades(userId),
                    getFullUserProfile(adminToken, userId)
                ]);

                const myCourse = courses.find(c => c.id === courseId);
                const myGrade = grades.find(g => g.courseId === courseId);

                return {
                    id: userId,
                    fullname: profile?.fullname || 'Unknown Student',
                    email: profile?.email || 'N/A',
                    progress: myCourse?.progress || 0,
                    grade: myGrade?.percentage || '0%',
                    lastaccess: profile?.lastaccess || 0
                };
            } catch (err) {
                console.error(`Failed to fetch sync for student ${userId}`, err);
                return null;
            }
        }));

        return NextResponse.json(results.filter(r => r !== null));
    } catch (error) {
        console.error("Bulk progress fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
    }
}
