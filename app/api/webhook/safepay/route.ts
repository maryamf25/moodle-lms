import { NextResponse } from 'next/server';
import { enrolUser } from '@/lib/moodle/index';
export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // 1. Get the notification object
        const notification = body.data?.notification;
        const state = notification?.state;
        
        // 2. Extract order_id from the correct nested path
        // It's inside data -> notification -> metadata
        const orderId = notification?.metadata?.order_id; 

        console.log(`DEBUG: State is ${state}, OrderID is ${orderId}`);

        if (state === 'PAID' && orderId) {
            const [courseId, userId] = orderId.split('-').map(Number);
            
            console.log(`✅ WEBHOOK ENROLLING: User ${userId} into Course ${courseId}`);
            
            const enrollment = await enrolUser(userId, courseId);
            console.log("Enrollment Result:", enrollment);
            
            return NextResponse.json({ status: 'success' });
        }

        console.log("⚠️ Webhook ignored: Condition not met.");
        return NextResponse.json({ status: 'ignored' });
    } catch (error: any) {
        console.error("❌ WEBHOOK ERROR:", error.message);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}