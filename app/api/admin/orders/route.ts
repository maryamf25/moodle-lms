import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();
    if (!auth || auth.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // optional filter

        const orders = await prisma.order.findMany({
            where: status ? { status } : undefined,
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true, username: true, moodleUserId: true }
                },
                items: {
                    include: { course: { select: { fullname: true, moodleCourseId: true } } }
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Summary stats
        const stats = {
            total: orders.length,
            completed: orders.filter((o: { status: string }) => o.status === 'COMPLETED').length,
            pending: orders.filter((o: { status: string }) => o.status === 'PENDING').length,
            refunded: orders.filter((o: { status: string }) => o.status === 'REFUNDED').length,
            failed: orders.filter((o: { status: string }) => o.status === 'FAILED').length,
            totalRevenue: orders
                .filter((o: { status: string }) => o.status === 'COMPLETED')
                .reduce((sum: number, o: { totalAmount: unknown }) => sum + Number(o.totalAmount), 0),
        };

        return NextResponse.json({ success: true, orders, stats });
    } catch (error) {
        console.error('[admin][orders][get] error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

// Admin can update order status (e.g., approve refund)
export async function PATCH(request: NextRequest) {
    const auth = await getAppAuthContext();
    if (!auth || auth.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { orderId, status } = await request.json();
        const validStatuses = ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'];

        if (!orderId || !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid orderId or status' }, { status: 400 });
        }

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status },
        });

        return NextResponse.json({ success: true, order: updated });
    } catch (error) {
        console.error('[admin][orders][patch] error:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
