// app/(auth)/login/actions.ts

'use server';

import { getDashboardPathForRole } from '@/lib/auth/roles';
import { getUserSessionContext } from '@/lib/moodle/user';
import { loginUser } from '@/lib/moodle/auth';
import { cookies } from 'next/headers';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function getUserId(token: string) {
    const session = await getUserSessionContext(token);
    return session.userid;
}

export async function getAutoLoginUrlAction(token: string, privateToken: string) {
    const endpoint = `${process.env.NEXT_PUBLIC_MOODLE_URL}/webservice/rest/server.php`;

    // 1. Params mein se 'userid' hata diya gaya hai (Ye Invalid Parameter error theek karega)
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'tool_mobile_get_autologin_key',
        moodlewsrestformat: 'json',
        privatetoken: privateToken,
    });

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'User-Agent': 'MoodleMobile/4.4.0 (Linux; Android 14)',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        const data = await res.json();

        // 2. Hum ab 'key' bhi return kar rahe hain taake URL manually bana saken
        if (data.key) {
            return { key: data.key, url: data.autologinurl };
        }

        if (data.exception) return { error: `Moodle Error: ${data.message}` };
        return { error: 'No auto-login key returned' };

    } catch (error: any) {
        return { error: error.message || 'Network error' };
    }
}

export async function getUserSessionAction(token: string) {
    const session = await getUserSessionContext(token);
    return {
        userId: session.userid,
        role: session.role,
        dashboardPath: getDashboardPathForRole(session.role),
    };
}

interface LoginActionResult {
    success: boolean;
    redirectPath?: string;
    error?: string;
}

export async function loginWithCredentialsAction(
    username: string,
    password: string,
    callbackUrl?: string | null
): Promise<LoginActionResult> {
    const loginResult = await loginUser(username, password);

    if (!loginResult.token) {
        return { success: false, error: loginResult.error || 'Invalid credentials' };
    }

    const session = await getUserSessionContext(loginResult.token);
    const dashboardPath = getDashboardPathForRole(session.role);
    const safeCallbackUrl =
        callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
            ? callbackUrl
            : null;

    const cookieStore = await cookies();
    cookieStore.set('moodle_token', loginResult.token, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
    });
    cookieStore.set('moodle_role', session.role, {
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });

    return {
        success: true,
        redirectPath: safeCallbackUrl || dashboardPath,
    };
}
