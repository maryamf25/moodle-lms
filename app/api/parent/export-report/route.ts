import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();

    if (!auth || auth.role !== 'parent') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // URL se bache ki ID (moodleUserId) nikalein
    const searchParams = request.nextUrl.searchParams;
    const childId = searchParams.get('childId');

    if (!childId) return NextResponse.json({ error: 'Child ID is required' }, { status: 400 });

    try {
        // Security: Verify karein ke ye bacha ishi parent ka hai
        const parentLink = await prisma.parentChild.findFirst({
            where: {
                parentId: auth.moodleUserId,
                childId: Number(childId)
            }
        });

        if (!parentLink) {
            return NextResponse.json({ error: 'You are not authorized to view this childs report' }, { status: 403 });
        }

        // Bache ki progress fetch karein
        const child = await prisma.user.findUnique({
            where: { moodleUserId: Number(childId) },
            include: {
                courseEnrollments: { include: { courseCatalog: true } }
            }
        });

        // CSV file ka content banayen
        let csvContent = 'Course Name,Progress (%),Grade,Last Updated\n';

        child?.courseEnrollments.forEach(en => {
            const date = new Date(en.updatedAt).toLocaleDateString();
            csvContent += `"${en.courseCatalog.fullname}",${en.progress || 0},${en.grade || 'N/A'},${date}\n`;
        });

        // File download karwayen
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${child?.firstName || 'Student'}_Progress_Report.csv"`,
            },
        });

    } catch (error) {
        console.error('[parent][export] error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
