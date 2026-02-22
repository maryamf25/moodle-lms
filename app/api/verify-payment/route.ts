
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { enrolUser } from '@/lib/moodle/index';
import { getUserId } from '@/app/(auth)/login/actions';
import { sendNotification } from '@/lib/notifications';
import { prisma } from '@/lib/db/prisma';

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

        const dbUser = await prisma.user.findUnique({ where: { moodleUserId: userId } });

        // Naya Code: Order Create Karein
        const courseDetails = await prisma.courseCatalog.findUnique({
            where: { moodleCourseId: parseInt(courseId) }
        });

        if (dbUser && courseDetails) {
            await prisma.order.create({
                data: {
                    userId: dbUser.id,
                    totalAmount: courseDetails.price,
                    transactionId: tracker || `MANUAL-${Date.now()}`,
                    status: 'COMPLETED',
                    items: {
                        create: [{
                            courseId: courseDetails.id,
                            price: courseDetails.price,
                            quantity: 1
                        }]
                    }
                }
            });
        }
        // Naya Code Yahan Khatam

        // Nayi Notification user ko bhejna:
        if (dbUser) {
            await sendNotification({
                userId: dbUser.id,
                title: 'Payment Successful & Enrolled! 🎓',
                message: `Aap successfully course mein enroll ho gaye hain. Happy Learning!`,
                type: 'PAYMENT',
                actionUrl: '/dashboard/student',
            });


            // 2. Parent ko dhoondein aur Alert bhejein (SRS Section 4.10)
            const parentLink = await prisma.parentChild.findFirst({
                where: { childId: dbUser.moodleUserId }
            });

            if (parentLink) {
                const parentUser = await prisma.user.findUnique({
                    where: { moodleUserId: parentLink.parentId }
                });

                if (parentUser) {
                    await sendNotification({
                        userId: parentUser.id,
                        title: 'New Course Enrollment 📚',
                        message: `Aapke bache ne naya course join kiya hai. Dashboard se progress monitor karein.`,
                        type: 'PARENT_ALERT',
                        actionUrl: '/dashboard/parent',
                    });
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Enrolled successfully' });

    } catch (error: unknown) {
        console.error("Payment Verification Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Verification failed' }, { status: 500 });
    }
}
