
'use server';

import { loginUser, registerUser, enrolUser, getUserByEmail, UserData } from '@/lib/moodle/index';
import { cookies } from 'next/headers';
 
import { getCoursePriceInfo } from '@/lib/moodle/courses'; // Import your new helper
 
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
            // Generate Safepay Link instead of enrolling
            const checkoutUrl = await generateSafepayLink(
                courseId, 
                courseInfo.price, 
                userId!.toString()
            );

            // Set the token first so they are logged in when they return from Safepay
            const cookieStore = await cookies();
            cookieStore.set('moodle_token', loginRes.token, {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                path: '/'
            });

            return {
                success: true,
                redirectUrl: checkoutUrl // Redirect to Safepay Checkout
            };
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
        console.error("Quick Enroll Error:", error);
        if (error.message && error.message.includes('Access control exception')) {
            return { error: 'Server Error: The Moodle API Token does not have permission to create users. Please check "core_user_create_users" capability in Moodle.' };
        }
        return { error: error.message || 'Enrollment failed' };
    }
}
async function generateSafepayLink(courseId: number, amount: number, userId: string) {
    const baseURL = "https://sandbox.api.getsafepay.com/checkout/render";
    
    // Safepay expects amount in paisa (e.g. 100 PKR = 10000)
    const totalAmountInPaisa = amount * 100;

const params = new URLSearchParams({
        client: process.env.SAFEPAY_PUBLIC_KEY!,
        amount: totalAmountInPaisa.toString(),
        currency: "PKR",
        environment: "sandbox", 
        order_id: `CR-${courseId}-${userId}-${Date.now()}`,
        success_url: `${process.env.NEXT_PUBLIC_URL}/payment-success?courseId=${courseId}`, // Add courseId here for safety
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/course/${courseId}`,
        // Safepay specific metadata format
        "source": "custom",
        "reference": `USER_${userId}_COURSE_${courseId}` // A clean reference string
    });
    return `${baseURL}?${params.toString()}`;
}