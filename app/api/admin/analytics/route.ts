import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();

    // Security Check: Sirf 'admin' is API ko call kar sakta hai
    if (!auth || auth.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 });
    }

    try {
        // 1. Total Active Students
        const totalStudents = await prisma.user.count({
            where: { role: 'student', isSuspended: false }
        });

        // 2. Total Enrollments (Course purchases)
        const totalEnrollments = await prisma.userCourseEnrollment.count();

        // 3. Total Revenue Calculate karein
        const enrollmentsWithPrice = await prisma.userCourseEnrollment.findMany({
            include: { courseCatalog: true }
        });

        let totalRevenue = 0;
        enrollmentsWithPrice.forEach(enrollment => {
            totalRevenue += Number(enrollment.courseCatalog.price || 0);
        });

        // 4. Chart Data for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const recentCoursePurchases = await prisma.userCourseEnrollment.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            include: { courseCatalog: true }
        });

        const recentTickets = await prisma.supportTicket.findMany({
            where: { createdAt: { gte: sixMonthsAgo } }
        });

        const recentUsers = await prisma.user.findMany({
            where: { createdAt: { gte: sixMonthsAgo } }
        });

        const recentForms = await prisma.formSubmission.findMany({
            where: { createdAt: { gte: sixMonthsAgo } }
        });

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const chartDataMap = new Map();

        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            chartDataMap.set(monthLabel, {
                name: monthLabel,
                revenue: 0,
                enrollments: 0,
                tickets: 0,
                newUsers: 0,
                formSubmissions: 0
            });
        }

        recentCoursePurchases.forEach(e => {
            const d = new Date(e.createdAt);
            const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            if (chartDataMap.has(monthLabel)) {
                const entry = chartDataMap.get(monthLabel);
                entry.enrollments += 1;
                entry.revenue += Number(e.courseCatalog.price || 0);
            }
        });

        recentTickets.forEach(t => {
            const d = new Date(t.createdAt);
            const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            if (chartDataMap.has(monthLabel)) chartDataMap.get(monthLabel).tickets += 1;
        });

        recentUsers.forEach(u => {
            const d = new Date(u.createdAt);
            const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            if (chartDataMap.has(monthLabel)) chartDataMap.get(monthLabel).newUsers += 1;
        });

        recentForms.forEach(f => {
            const d = new Date(f.createdAt);
            const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
            if (chartDataMap.has(monthLabel)) chartDataMap.get(monthLabel).formSubmissions += 1;
        });

        const chartData = Array.from(chartDataMap.values()).reverse();

        // 5. Recent Enrollments for Table (Latest 5)
        const recentEnrollments = await prisma.userCourseEnrollment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                courseCatalog: { select: { fullname: true, price: true } }
            }
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalStudents,
                totalEnrollments,
                totalRevenue,
            },
            chartData,
            recentEnrollments: recentEnrollments.map(e => ({
                id: e.id,
                studentName: `${e.user.firstName || ''} ${e.user.lastName || ''}`.trim() || 'Unknown User',
                email: e.user.email,
                courseName: e.courseCatalog.fullname,
                price: e.courseCatalog.price,
                date: e.createdAt
            }))
        });

    } catch (error) {
        console.error('[admin][analytics] error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
