import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';
import { getStudentGrades } from '@/lib/moodle/grades';

export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();

    // Security Check: Sirf 'parent' role allow hai
    if (!auth || auth.role !== 'parent') {
        return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 });
    }

    try {
        // 1. Parent ke linked bacho ko dhoondein (Moodle ID ke zariye)
        const parentLinks = await prisma.parentChild.findMany({
            where: { parentId: auth.moodleUserId }
        });

        const childMoodleIds = parentLinks.map(link => link.childId);

        // 2. Fetch children users from db
        const childrenData = await prisma.user.findMany({
            where: { moodleUserId: { in: childMoodleIds } }
        });

        // 3. Fetch real-time progress & grades from Moodle instead of db courseEnrollments
        const childrenWithProgress = await Promise.all(
            childrenData.map(async (child) => {
                const grades = await getStudentGrades(child.moodleUserId);

                return {
                    id: child.id,
                    moodleUserId: child.moodleUserId,
                    name: `${child.firstName || ''} ${child.lastName || ''}`.trim() || child.username,
                    email: child.email || 'No email',
                    courses: grades.map(g => ({
                        id: String(g.courseId),
                        courseName: g.courseName,
                        progress: g.progress || 0,
                        grade: g.grade,
                        percentage: g.percentage || 0,
                        lastUpdated: new Date().toISOString()
                    }))
                };
            })
        );

        return NextResponse.json({ success: true, children: childrenWithProgress });

    } catch (error) {
        console.error('[parent][children-progress] error:', error);
        return NextResponse.json({ error: 'Failed to fetch children data' }, { status: 500 });
    }
}
