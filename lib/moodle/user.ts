import { BASE_URL } from './api';
import { UserProfile } from './types';
import { MoodleRole } from '@/lib/auth/roles';

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
    { role: 'school', keywords: ['school', 'organization', 'organisation'] },
    { role: 'parent', keywords: ['parent', 'guardian'] },
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

async function fetchRoleAssignments(token: string, userid: number, tokenSource: 'admin' | 'user'): Promise<MoodleUserRoleResponse[] | null> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_role_assign_get_user_roles',
        moodlewsrestformat: 'json',
        userid: String(userid),
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) {
        authLog('role api http failure', {
            tokenSource,
            userid,
            status: response.status,
        });
        return null;
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        authLog('role api returned non-array', {
            tokenSource,
            userid,
            payloadType: typeof data,
        });
        return null;
    }

    authLog('role api response received', {
        tokenSource,
        userid,
        roles: data.map((role: MoodleUserRoleResponse) => role.shortname ?? role.name ?? 'unknown'),
    });
    return data as MoodleUserRoleResponse[];
}

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
    authLog('resolving role', {
        userid: info.userid,
        username: info.username,
        userissiteadmin: info.userissiteadmin ?? false,
    });

    if (info.userissiteadmin || info.username === 'admin') {
        authLog('resolved as admin from site info');
        return 'admin';
    }

    try {
        let roleToken: string | null = null;
        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (adminToken) {
            roleToken = adminToken;
        } else {
            roleToken = token;
        }

        let assignedRoles: MoodleUserRoleResponse[] | null = null;
        if (roleToken) {
            assignedRoles = await fetchRoleAssignments(roleToken, info.userid, adminToken ? 'admin' : 'user');
        }

        if (!assignedRoles && adminToken) {
            assignedRoles = await fetchRoleAssignments(token, info.userid, 'user');
        }

        const roleNames = extractRoleText(assignedRoles || []);

        authLog('resolved role names', {
            userid: info.userid,
            roleNames,
        });

        const resolvedRole = resolveRoleFromRoleText(roleNames);
        if (resolvedRole) {
            return resolvedRole;
        }
    } catch (error) {
        console.warn('Unable to resolve Moodle role, defaulting to student:', error);
    }

    authLog('defaulting to student role');
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
        const params = new URLSearchParams({
            wstoken: token,
            wsfunction: 'core_user_get_users_by_field',
            moodlewsrestformat: 'json',
            'field': 'id',
            'values[0]': userid.toString()
        });

        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Get full profile error:', error);
        return null;
    }
}
