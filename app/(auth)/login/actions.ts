// app/(auth)/login/actions.ts

'use server';

import { getDashboardPathForRole } from '@/lib/auth/roles';
import { syncUserFromMoodleSession } from '@/lib/auth/user-store';
import { getUserSessionContext } from '@/lib/moodle/user';
import { loginUser } from '@/lib/moodle/auth';
import { cookies } from 'next/headers';
const AUTH_DEBUG = process.env.AUTH_DEBUG === '1';

function authLog(message: string, data?: Record<string, unknown>) {
    if (!AUTH_DEBUG) return;
    if (data) {
        console.log(`[auth][login] ${message}`, data);
        return;
    }
    console.log(`[auth][login] ${message}`);
}

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

        // 2. UserId fetch karein taake URL sahi bane
        const session = await getUserSessionContext(token);
        const userid = session.userid;

        if (data.key) {
            const autologinUrl = `${process.env.NEXT_PUBLIC_MOODLE_URL}/admin/tool/mobile/autologin.php?userid=${userid}&key=${data.key}`;
            return { key: data.key, url: autologinUrl };
        }

        if (data.exception) return { error: `Moodle Error: ${data.message}` };
        return { error: 'No auto-login key returned' };

    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Network error' };
    }
}

export async function getUserSessionAction(token: string) {
    const session = await getUserSessionContext(token);
    const appUser = await syncUserFromMoodleSession({
        moodleUserId: session.userid,
        username: session.username,
        role: session.role,
    });
    return {
        userId: session.userid,
        role: appUser.role,
        dashboardPath: getDashboardPathForRole(appUser.role),
    };
}

interface LoginActionResult {
    success: boolean;
    redirectPath?: string;
    role?: string;
    token?: string;
    privateToken?: string;
    error?: string;
}

export async function loginWithCredentialsAction(
    username: string,
    password: string,
    callbackUrl?: string | null
): Promise<LoginActionResult> {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password) {
        return { success: false, error: 'Username and password are required' };
    }

    authLog('login started', {
        username: normalizedUsername,
        hasCallbackUrl: Boolean(callbackUrl),
    });

    const loginResult = await loginUser(normalizedUsername, password);

    if (!loginResult.token) {
        authLog('login failed at token request', {
            username,
            error: loginResult.error || 'no_token',
        });
        return { success: false, error: loginResult.error || 'Invalid credentials' };
    }

    const session = await getUserSessionContext(loginResult.token);
    if (!normalizedUsername.includes('@') && session.username.toLowerCase() !== normalizedUsername.toLowerCase()) {
        authLog('credential mismatch after token validation', {
            requestedUsername: normalizedUsername,
            sessionUsername: session.username,
        });
        return { success: false, error: 'Invalid credentials' };
    }

    const appUser = await syncUserFromMoodleSession({
        moodleUserId: session.userid,
        username: session.username,
        role: session.role,
    });
    const dashboardPath = getDashboardPathForRole(appUser.role);
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
    cookieStore.set('moodle_role', appUser.role, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
    });
    if (loginResult.privatetoken) {
        cookieStore.set('moodle_private_token', loginResult.privatetoken, {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
        });
    }
    console.log('[auth][login] resolved role for user', {
        username: session.username,
        userid: session.userid,
        resolvedRole: appUser.role,
        redirectPath: safeCallbackUrl || dashboardPath,
    });
    authLog('login success and cookies set', {
        userid: session.userid,
        username: session.username,
        resolvedRole: appUser.role,
        dashboardPath,
        redirectPath: safeCallbackUrl || dashboardPath,
        roleCookieValue: appUser.role,
    });

    return {
        success: true,
        redirectPath: safeCallbackUrl || dashboardPath,
        role: appUser.role,
        token: loginResult.token,
        privateToken: loginResult.privatetoken,
    };
}
