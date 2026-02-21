import { BASE_URL } from './api';
import { UserProfile } from './types';
import { MoodleRole, normalizeRole } from '@/lib/auth/roles';

const AUTH_DEBUG = process.env.AUTH_DEBUG === '1';

function authLog(message: string, data?: Record<string, unknown>) {
    if (!AUTH_DEBUG) return;
    if (data) {
        console.log(`[auth][role] ${message}`, data);
        return;
    }
    console.log(`[auth][role] ${message}`);
}

// --- Check User By Email (Helper) ---
export async function getUserByEmail(email: string) {
    try {
        const params = new URLSearchParams({
            wstoken: process.env.MOODLE_ADMIN_TOKEN!,
            wsfunction: 'core_user_get_users_by_field',
            moodlewsrestformat: 'json',
            'field': 'email',
            'values[0]': email
        });

        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Get user error:', error);
        throw error;
    }
}

// --- 5. FETCH USER PROFILE ---
export async function getUserProfile(token: string): Promise<UserProfile> {
    const data = await getSiteInfo(token);

    if (data.exception) {
        throw new Error(data.message);
    }

    authLog('getUserProfile raw moodle data', {
        userid: data.userid,
        username: data.username,
        fullname: data.fullname,
        userissiteadmin: data.userissiteadmin,
        allData: data,
    });

    // Keep profile fetching lightweight for page renders.
    // Full role resolution (system + course checks) is done during login/session creation.
    const role: MoodleRole = data.userissiteadmin || data.username === 'admin' ? 'admin' : 'student';

    return {
        id: data.userid,
        username: data.username,
        fullname: data.fullname,
        firstname: data.firstname,
        lastname: data.lastname,
        email: '', // site info might not return email depending on version/perms
        profileimageurlsmall: data.userpictureurl,
        profileimageurl: data.userpictureurl, // Moodle returns userpictureurl
        role,
    };
}

interface MoodleSiteInfoResponse {
    userid: number;
    username: string;
    fullname: string;
    firstname: string;
    lastname: string;
    userpictureurl: string;
    userissiteadmin?: boolean;
    exception?: string;
    message?: string;
}

interface MoodleUserRoleResponse {
    roleid?: number;
    contextlevel?: number;
    instanceid?: number;
    shortname?: string;
    name?: string;
}

const ROLE_KEYWORDS: Array<{ role: MoodleRole; keywords: string[] }> = [
    // Order matters: check for parent before student so users with multiple roles
    // including parent + student resolve to `parent`.
    { role: 'parent', keywords: ['parent', 'Parent'] },
    { role: 'school', keywords: ['school', 'organization', 'organisation'] },
    { role: 'student', keywords: ['student', 'learner'] },
];

async function getSiteInfo(token: string): Promise<MoodleSiteInfoResponse> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json',
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    const data = await response.json();
    authLog('site info fetched', {
        userid: data?.userid,
        username: data?.username,
        userissiteadmin: data?.userissiteadmin,
        hasException: Boolean(data?.exception),
    });
    return data;
}

// Removed fetchRoleAssignments - Moodle API function does not exist in all instances
// Now using database-backed parent detection instead

function extractRoleText(roles: MoodleUserRoleResponse[]): string {
    return roles
        .map((role) => `${role.shortname ?? ''} ${role.name ?? ''}`.toLowerCase().trim())
        .join(' ');
}

function resolveRoleFromRoleText(roleText: string): MoodleRole | null {
    for (const candidate of ROLE_KEYWORDS) {
        if (candidate.keywords.some((keyword) => roleText.includes(keyword))) {
            return candidate.role;
        }
    }
    return null;
}

export async function getUserRole(token: string, siteInfo?: MoodleSiteInfoResponse): Promise<MoodleRole> {
    const info = siteInfo ?? await getSiteInfo(token);

    // 1. Admin check (Highest priority)
    if (info.userissiteadmin || info.username === 'admin') {
        return 'admin';
    }

    // 2. Check local database for PERMANENT stored role
    try {
        const { getStoredRoleByMoodleUserId } = await import('@/lib/auth/user-store');
        const storedRole = await getStoredRoleByMoodleUserId(info.userid);
        if (storedRole && storedRole !== 'student') {
            return storedRole;
        }
    } catch (err) {
        // Silent fail for DB checks during role resolution
    }

    // 3. Check for PENDING registration role (intent during signup)
    try {
        const { prisma } = await import('@/lib/db/prisma');
        const pending = await (prisma as any).registrationRole.findUnique({
            where: { username: info.username }
        });
        if (pending) {
            authLog('resolved role from pending registration', { role: pending.role });
            return pending.role as MoodleRole;
        }
    } catch (err) {
        // Silent fail
    }

    // 4. Default
    return 'student';
}

export async function getUserSessionContext(token: string): Promise<{ userid: number; username: string; role: MoodleRole }> {
    const siteInfo = await getSiteInfo(token);
    if (siteInfo.exception || !siteInfo.userid) {
        throw new Error(siteInfo.message || 'Unable to fetch user session');
    }

    const role = await getUserRole(token, siteInfo);
    authLog('session context ready', {
        userid: siteInfo.userid,
        username: siteInfo.username,
        role,
    });
    return {
        userid: siteInfo.userid,
        username: siteInfo.username,
        role,
    };
}
export async function getFullUserProfile(token: string, userid: number) {
    try {
        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        const effectiveToken = token || adminToken;

        const fetchProfile = async (useToken: string) => {
            const params = new URLSearchParams({
                wstoken: useToken,
                wsfunction: 'core_user_get_users_by_field',
                moodlewsrestformat: 'json',
                'field': 'id',
                'values[0]': userid.toString()
            });
            const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
            if (!response.ok) return null;
            return await response.json();
        };

        let data = await fetchProfile(effectiveToken!);

        // Fallback to admin token if empty result or exception
        const isError = !Array.isArray(data) || data.length === 0 || (typeof data === 'object' && data !== null && (data as any).exception);

        if (isError && adminToken && token !== adminToken) {
            console.log(`getFullUserProfile: Falling back to admin token for user ${userid}`);
            const adminData = await fetchProfile(adminToken);
            if (Array.isArray(adminData) && adminData.length > 0) {
                data = adminData;
            }
        }

        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Get full profile error:', error);
        return null;
    }
}
export async function getFullUserProfiles(token: string, userids: number[]) {
    if (userids.length === 0) return [];

    const adminToken = process.env.MOODLE_ADMIN_TOKEN;

    const fetchProfiles = async (useToken: string) => {
        try {
            const params = new URLSearchParams({
                wstoken: useToken,
                wsfunction: 'core_user_get_users_by_field',
                moodlewsrestformat: 'json',
                'field': 'id',
            });
            userids.forEach((id, index) => {
                params.append(`values[${index}]`, id.toString());
            });

            const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
            if (!response.ok) return [];
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) return data;
            return [];
        } catch {
            return [];
        }
    };

    let results = await fetchProfiles(token || adminToken!);

    // If first attempt failed (likely due to permissions) and we have an admin token, try again
    if (results.length === 0 && adminToken && token !== adminToken) {
        console.log(`getFullUserProfiles: Retrying with Admin Token for ${userids.length} users`);
        results = await fetchProfiles(adminToken);
    }

    return results;
}
