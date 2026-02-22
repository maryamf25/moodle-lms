import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();

    if (!auth || auth.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const enrollments = await prisma.userCourseEnrollment.findMany({
            include: {
                user: true,
                courseCatalog: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // CSV Header
        let csvContent = 'Enrollment ID,Student Name,Email,Course Name,Price,Enrollment Date,Progress\n';

        // CSV Rows
        enrollments.forEach(e => {
            const studentName = `"${e.user.firstName || ''} ${e.user.lastName || ''}"`.trim();
            const email = `"${e.user.email || ''}"`;
            const courseName = `"${e.courseCatalog.fullname}"`;
            const price = e.courseCatalog.price || 0;
            const date = new Date(e.createdAt).toLocaleDateString();
            const progress = `${e.progress || 0}%`;

            csvContent += `${e.id},${studentName},${email},${courseName},${price},${date},${progress}\n`;
        });

        // Return as a downloadable file
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="enrollments_report_${new Date().getTime()}.csv"`,
            },
        });

    } catch (error) {
        console.error('[admin][export] error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
