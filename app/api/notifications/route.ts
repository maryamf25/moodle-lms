import { NextRequest, NextResponse } from 'next/server';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';

// 1. GET: User ki saari notifications fetch karein
export async function GET(request: NextRequest) {
    const auth = await getAppAuthContext();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                user: { moodleUserId: auth.moodleUserId }
            },
            orderBy: { createdAt: 'desc' },
            take: 20, // Sirf latest 20 notifications dikhayen
        });

        return NextResponse.json({ success: true, notifications });
    } catch (error) {
        console.error('[notifications][get] error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

// 2. PATCH: Notification ko "Read" mark karein
export async function PATCH(request: NextRequest) {
    const auth = await getAppAuthContext();
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { notificationId } = body;

        if (!notificationId) {
            return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
        }

        const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });

        return NextResponse.json({ success: true, notification: updatedNotification });
    } catch (error) {
        console.error('[notifications][patch] error:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
}
