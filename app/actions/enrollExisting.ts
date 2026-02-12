
'use server';

import { enrolUser } from '@/lib/moodle/index';
import { cookies } from 'next/headers';
import { getCoursePriceInfo } from '@/lib/moodle/courses';
import { getUserId } from '@/app/(auth)/login/actions';

export async function enrollExistingUser(courseId: number) {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;

    if (!token) {
        return { error: 'Not logged in' };
    }

    try {
        // 1. Get User ID
        const userId = await getUserId(token);
        if (!userId) {
            return { error: 'Could not retrieve user profile' };
        }

        // 2. Check Price
        const courseInfo = await getCoursePriceInfo(courseId);
        const isPaidCourse = courseInfo && courseInfo.price > 0;

        if (isPaidCourse) {
            const generateSafepayLinkLocal = (cId: number, amount: number, uId: string) => {
                const baseURL = "https://sandbox.api.getsafepay.com/checkout/render";
                const totalAmountInPaisa = amount * 100;
                const params = new URLSearchParams({
                    client: process.env.SAFEPAY_PUBLIC_KEY!,
                    amount: totalAmountInPaisa.toString(),
                    currency: "PKR",
                    environment: "sandbox",
                    order_id: `CR-${cId}-${uId}-${Date.now()}`,
                    success_url: `${process.env.NEXT_PUBLIC_URL}/payment-success?courseId=${cId}`,
                    cancel_url: `${process.env.NEXT_PUBLIC_URL}/course/${cId}`,
                    "source": "custom",
                    "reference": `USER_${uId}_COURSE_${cId}`
                });
                return `${baseURL}?${params.toString()}`;
            };

            const checkoutUrl = generateSafepayLinkLocal(courseId, courseInfo.price, userId.toString());
            return { success: true, redirectUrl: checkoutUrl };
        }

        // 3. Free Enrollment
        await enrolUser(userId, courseId);
        return { success: true, redirectUrl: `/course/${courseId}/learn` };

    } catch (error: any) {
        console.error("Enrollment Error:", error);
        if (error.message && error.message.includes('Access control exception')) {
            return { error: 'Server Error: The Moodle API Token does not have permission to enroll users.' };
        }
        return { error: error.message || 'Enrollment failed' };
    }
}
