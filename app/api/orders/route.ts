import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const orders = await prisma.order.findMany({
            where: { user: { moodleUserId: auth.moodleUserId } },
            include: {
                items: {
                    include: { course: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, orders });
    } catch (error) {
        console.error('[orders][get] error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
