'use server';

import { enrolUser } from '@/lib/moodle/index';
import { cookies } from 'next/headers';
import { getCoursePriceInfo } from '@/lib/moodle/courses';
import { getUserId } from '@/app/(auth)/login/actions';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
/**
 * 1. Shared Helper to initialize Safepay Session
 * This prevents "Session Validation" errors by performing the official handshake.
 */
async function generateSafepayLink(courseId: number, amount: number, userId: string) {
    try {
        const response = await fetch("https://sandbox.api.getsafepay.com/order/v1/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client: process.env.SAFEPAY_PUBLIC_KEY,
                amount: Number(amount), // Ensure it's a number, not "100"
                currency: "PKR",
                environment: "sandbox",
                mode: "payment",
                intent: "CYBERSOURCE",
                redirect_url: `${process.env.NEXT_PUBLIC_URL}/payment-success`,
                cancel_url: `${process.env.NEXT_PUBLIC_URL}/course/${courseId}`
            })
        });

        const resData = await response.json();
        
        // Debug: Log the response to see if Safepay is returning an error message
        console.log("Safepay Init Response:", JSON.stringify(resData));

        if (!resData.status || !resData.data?.token) {
            throw new Error(resData.status?.message || 'No token received');
        }
 
        // Use the 'checkout' endpoint instead of 'components' if components fails
   const token = resData.data.token;
const publicKey = process.env.SAFEPAY_PUBLIC_KEY!;
const baseUrl = "https://sandbox.api.getsafepay.com/checkout";

// 2. Use the standard parameter mapping
const url = `${baseUrl}?env=sandbox` +
            `&beacon=${token}` +
            `&client_id=${publicKey}` + // Use client_id here
            `&order_id=${courseId}-${userId}`; // Remove source=custom

console.log("🔗 ATTEMPTING NEW ENDPOINT:", url);
return url;

    } catch (error: any) {
        console.error("❌ SAFEPAY ERROR:", error.message);
        return `${process.env.NEXT_PUBLIC_URL}/payment-error`;
    }
}
/**
 * 2. Action for users who are already logged in
 */
export async function enrollExistingUser(courseId: number) {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;

    if (!token) return { error: 'Not logged in' };

    try {
        const userId = await getUserId(token);
        if (!userId) return { error: 'Could not retrieve user profile' };

        const courseInfo = await getCoursePriceInfo(courseId);
        const isPaidCourse = courseInfo && courseInfo.price > 0;

        if (isPaidCourse) {
           const checkoutUrl = await generateSafepayLink(courseId, courseInfo.price, userId.toString());
        
        // 3. CALL REDIRECT HERE
        redirect(checkoutUrl);
        }

        // Free Course: Direct enrollment
        await enrolUser(userId, courseId);
        return { success: true, redirectUrl: `/course/${courseId}/learn` };

    } catch (error: any) {
    // Mature check: Next.js redirects are technically special "errors"
    if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
        throw error; 
    }

    console.error("Actual Enrollment Error:", error);
    return { error: error.message || 'Enrollment failed' };
    }
}