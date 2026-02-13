
'use server';

import { loginUser, registerUser, enrolUser, getUserByEmail, UserData } from '@/lib/moodle/index';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCoursePriceInfo } from '@/lib/moodle/courses'; // Import your new helper
import { isRedirectError } from 'next/dist/client/components/redirect-error';
interface EnrollmentState {
    success?: boolean;
    error?: string;
    token?: string;
    redirectUrl?: string; // Where to go after success
}

export async function quickEnroll(prevState: any, formData: FormData): Promise<EnrollmentState> {
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
            const loginData = await loginUser(email, password); // Moodle often allows email login if config enabled, else need username
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

  const courseInfo = await getCoursePriceInfo(courseId);
        const isPaidCourse = courseInfo && courseInfo.price > 0;

        if (isPaidCourse) {
        const checkoutUrl = await generateSafepayLink(
            courseId, 
            courseInfo.price, 
            userId!.toString()
        );

        const cookieStore = await cookies();
        cookieStore.set('moodle_token', loginRes.token, {
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

        return {
            success: true,
            redirectUrl: `/course/${courseId}/learn`
        };

    } catch (error: any) {
   // Mature check: Next.js redirects are technically special "errors"
    if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
        throw error; 
    }

    console.error("Actual Enrollment Error:", error);
    return { error: error.message || 'Enrollment failed' };
    }
}
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