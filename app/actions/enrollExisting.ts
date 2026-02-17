'use server';

import { enrolUser } from '@/lib/moodle/index';
import { cookies } from 'next/headers';
import { getCoursePriceInfo } from '@/lib/moodle/courses';
import { getUserId } from '@/app/(auth)/login/actions';
import { redirect } from 'next/navigation';
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
                cancel_url: `${process.env.NEXT_PUBLIC_URL}/course/${courseId}`,
                // ADD THESE FOR BETTER REDIRECT HANDLING:
      // ADD THIS:
    metadata: {
        order_id: `${courseId}-${userId}`
    },
    configuration: {
        success_url: `${process.env.NEXT_PUBLIC_URL}/payment-success`,
        auto_redirect: true // Some API versions support this flag
    }
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

    } catch (error: unknown) {
        console.error("❌ SAFEPAY ERROR:", error instanceof Error ? error.message : error);
        return `${process.env.NEXT_PUBLIC_URL}/payment-error`;
    }
}

function isNextRedirectError(error: unknown): error is { message?: string; digest?: string } {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { message?: unknown; digest?: unknown };
    return typeof candidate.message === 'string' || typeof candidate.digest === 'string';
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

    } catch (error: unknown) {
    // Mature check: Next.js redirects are technically special "errors"
    if (
        isNextRedirectError(error) &&
        (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT'))
    ) {
        throw error; 
    }

    console.error("Actual Enrollment Error:", error);
    return { error: error instanceof Error ? error.message : 'Enrollment failed' };
    }
}
