import { NextResponse } from 'next/server';
import { enrolUser } from '@/lib/moodle/index';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // The logs showed the tracker data is inside body.data.notification
        const notification = body.data?.notification;
        const state = notification?.state;
        
        // Use the order_id we passed during init
        const orderId = body.data?.order_id; 

        if (state === 'PAID' && orderId) {
            const [courseId, userId] = orderId.split('-').map(Number);
            
            console.log(`✅ WEBHOOK ENROLLING: User ${userId} into Course ${courseId}`);
            await enrolUser(userId, courseId);
            
            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored' });
    } catch (error: any) {
        console.error("❌ WEBHOOK ERROR:", error.message);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}