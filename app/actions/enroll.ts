
'use server';
import crypto from 'crypto';
import { loginUser, registerUser, enrolUser, getUserByEmail } from '@/lib/moodle/index';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCoursePriceInfo } from '@/lib/moodle/courses'; // Import your new helper
import { getUserSessionContext } from '@/lib/moodle/user';
import { syncUserFromMoodleSession } from '@/lib/auth/user-store';
interface EnrollmentState {
    success?: boolean;
    error?: string;
    token?: string;
    redirectUrl?: string; // Where to go after success
}

interface SafepayInitResponse {
    status?: { message?: string };
    data?: { token?: string };
}

function isNextRedirectError(error: unknown): error is { message?: string; digest?: string } {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { message?: unknown; digest?: unknown };
    return typeof candidate.message === 'string' || typeof candidate.digest === 'string';
}

export async function quickEnroll(prevState: unknown, formData: FormData): Promise<EnrollmentState> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstname = formData.get('firstname') as string;
    const lastname = formData.get('lastname') as string;
    const courseId = parseInt(formData.get('courseId') as string);
    const isNewUser = formData.get('isNewUser') === 'true';

    if (!email || !password || !courseId) {
        return { error: 'Missing required fields' };
    }

    try {
        let userId: number | null = null;

        // 1. Check if user exists or needs creation
        if (isNewUser) {
            if (!firstname || !lastname) {
                return { error: 'Name is required for new users' };
            }

            // Generate a username from email (or use email as username if allowed)
            // Moodle usernames usually lowercase, no spaces
            const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);

            const newUser = await registerUser({
                username,
                password,
                firstname,
                lastname,
                email
            });
            userId = newUser.id;
        } else {
            // Existing user - Verify by logging in first to get token/id or just trust email?
            // Safer to just try login first
            await loginUser(email, password); // Moodle often allows email login if config enabled, else need username
            // If login fails with email, we might need to fetch username first?
            // Let's assume username login for now or check if we can get username from email

            // Actually, loginUser takes username. Use getUserByEmail to get username first
            const user = await getUserByEmail(email);
            if (!user) {
                return { error: 'User not found. Please sign up.' };
            }
            userId = user.id;
            // Now verify password by logging in
            const loginRes = await loginUser(user.username, password);
            if (loginRes.error) {
                return { error: 'Invalid password' };
            }
        }

        // 2. Perform Login to get the User Token (needed for session)
        // We need the username for loginUser
        let username = '';
        if (isNewUser) {
            // We need the username we just created. 
            // registerUser returns { id, username } usually.
            // If not, we might need to fetch it? 
            // Let's assume we use the one we generated or the email if supported.
            // The registerUser implementation I wrote returns data[0] which contains id and username.
            // We need to return username from registerUser
            const user = await getUserByEmail(email); // Fetch again to be sure
            if (!user) throw new Error("User creation verification failed");
            username = user.username;
        } else {
            const user = await getUserByEmail(email);
            if (user) username = user.username;
        }

        const loginRes = await loginUser(username, password);
        if (loginRes.error) throw new Error(loginRes.error);
        const session = await getUserSessionContext(loginRes.token);
        const appUser = await syncUserFromMoodleSession({
            moodleUserId: session.userid,
            username: session.username,
            role: session.role,
        });

  const courseInfo = await getCoursePriceInfo(courseId);
        const isPaidCourse = courseInfo && courseInfo.price > 0;

        if (isPaidCourse) {
const orderId = `${courseId}-${userId}`;
const checkoutUrl = generatePayFastLink(orderId, courseInfo.price);
 

        const cookieStore = await cookies();
        cookieStore.set('moodle_token', loginRes.token, {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/'
        });
        cookieStore.set('moodle_role', appUser.role, {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/'
        });

        // 2. CALL REDIRECT HERE
        redirect(checkoutUrl); 
    }
        // 3. ENROLL USER (Only for Free Courses)
        if (userId) {
            await enrolUser(userId, courseId);
        }

        // 4. SET COOKIE
        const cookieStore = await cookies();
        cookieStore.set('moodle_token', loginRes.token, {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/'
        });
        cookieStore.set('moodle_role', appUser.role, {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/'
        });

        return {
            success: true,
            redirectUrl: `/course/${courseId}/learn`
        };

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
async function generatePayFastLink(courseId: string | number, amount: number, userId: string) {
    const merchantId = "27315"; // 
    const securedKey = "ZqyCrJzLAzosYGMH7ahpp81DK-"; // 
    
    // Updated to the correct PayFast Sandbox Checkout URL
    const baseUrl = "https://ipg1.apps.net.pk/ipg/payment/checkout"; 
    
    const basketId = `${courseId}-${userId}`;

    const params = new URLSearchParams({
        merchant_id: merchantId,
        merchant_secured_key: securedKey,
        basket_id: basketId,
        trans_amount: amount.toString(),
        success_url: `${process.env.NEXT_PUBLIC_URL}/payment-success`,
        fail_url: `${process.env.NEXT_PUBLIC_URL}/payment-error`,
    });

    return `${baseUrl}?${params.toString()}`;
}