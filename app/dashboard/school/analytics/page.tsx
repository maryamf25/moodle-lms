import { requireAppAuth, getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';
import AnalyticsClient from './AnalyticsClient';
import { getUserProfile, getFullUserProfiles } from '@/lib/moodle/user';
import { getEnrolledUsers } from '@/lib/moodle/courses';

export default async function SchoolAnalyticsPage() {
    await requireAppAuth('school');
    const session = await getAppAuthContext();
    const profile = await getUserProfile(session?.token!);
    const schoolName = profile?.fullname || 'School Admin';

    const prismaAny = prisma as any;

    const [licenses, catalog] = await Promise.all([
        prismaAny.schoolLicense ? prismaAny.schoolLicense.findMany({
            where: { schoolId: session?.moodleUserId },
            include: { assignments: true }
        }) : Promise.resolve([]),
        prismaAny.courseCatalog ? prismaAny.courseCatalog.findMany() : Promise.resolve([])
    ]);

    const adminToken = process.env.MOODLE_ADMIN_TOKEN!;

    // 1. Enrich licenses with student details and progress by matching dashboard pattern
    const { getFullUserProfile } = await import('@/lib/moodle/user');
    const { getUserCourses } = await import('@/lib/moodle/courses');
    const { getStudentGrades } = await import('@/lib/moodle/grades');

    const enrichedLicenses = await Promise.all(licenses.map(async (l: any) => {
        const course = catalog.find((c: any) => c.moodleCourseId === l.moodleCourseId);

        // Fetch details for each student in this license individually (matches dashboard logic)
        const studentsInLicense = await Promise.all(l.assignments.map(async (as: any) => {
            try {
                const [profile, courses, grades] = await Promise.all([
                    getFullUserProfile(adminToken, as.studentId),
                    getUserCourses(adminToken, as.studentId),
                    getStudentGrades(as.studentId)
                ]);

                const myCourse = courses.find(c => c.id === l.moodleCourseId);
                const myGrade = grades.find(g => g.courseId === l.moodleCourseId);

                return {
                    id: as.studentId,
                    fullname: profile?.fullname || 'Unknown Student',
                    email: profile?.email || 'N/A',
                    progress: myCourse?.progress || 0,
                    grade: myGrade?.percentage || '0%',
                    lastaccess: profile?.lastaccess || 0
                };
            } catch (err) {
                console.error(`Analytics Sync Error for student ${as.studentId}:`, err);
                return {
                    id: as.studentId,
                    fullname: 'Unknown Student',
                    email: 'N/A',
                    progress: 0,
                    grade: '0%',
                    lastaccess: 0
                };
            }
        }));

        return {
            ...JSON.parse(JSON.stringify(l)),
            courseName: course?.fullname || `Course ${l.moodleCourseId}`,
            students: studentsInLicense
        };
    }));

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Advanced Analytics</h1>
                    <p className="text-slate-500 font-medium">Detailed insights into your institution's performance</p>
                </div>
            </div>

            <AnalyticsClient
                initialLicenses={enrichedLicenses}
                schoolName={schoolName}
            />
        </div>
    );
}
