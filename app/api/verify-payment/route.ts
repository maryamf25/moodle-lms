
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { enrolUser } from '@/lib/moodle/index';
import { getUserId } from '@/app/(auth)/login/actions';

export async function POST(request: Request) {
    try {
        const { courseId, tracker } = await request.json();

        // 1. Verify Payment with Safepay
        // (This would normally involve a fetch to Safepay's verification endpoint with `tracker`)
        // For the sandbox, we assume if `tracker` exists, it was a success.

        console.log(`Verifying payment for course ${courseId} with tracker ${tracker}`);

        // 2. Get User ID from Cookie (Should be logged in)
        const cookieStore = await cookies();
        const token = cookieStore.get('moodle_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'User session expired. Please login again.' }, { status: 401 });
        }

        const userId = await getUserId(token);
        if (!userId) {
            return NextResponse.json({ error: 'Could not identify user.' }, { status: 400 });
        }

        // 3. Enroll User on Moodle
        await enrolUser(userId, parseInt(courseId));

        return NextResponse.json({ success: true, message: 'Enrolled successfully' });

    } catch (error: unknown) {
        console.error("Payment Verification Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Verification failed' }, { status: 500 });
    }
}
