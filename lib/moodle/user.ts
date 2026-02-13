import { BASE_URL } from './api';
import { UserProfile } from './types';
import { MoodleRole } from '@/lib/auth/roles';

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

    const role = await getUserRole(token, data);

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
    shortname?: string;
    name?: string;
}

function mapRoleName(rawRole?: string): MoodleRole | null {
    if (!rawRole) return null;
    const normalized = rawRole.toLowerCase();

    if (normalized.includes('manager') || normalized.includes('admin')) return 'admin';
    if (normalized.includes('teacher')) return 'teacher';
    if (normalized.includes('student')) return 'student';

    return null;
}

async function getSiteInfo(token: string): Promise<MoodleSiteInfoResponse> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json',
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
}

export async function getUserRole(token: string, siteInfo?: MoodleSiteInfoResponse): Promise<MoodleRole> {
    const info = siteInfo ?? await getSiteInfo(token);

    if (info.userissiteadmin || info.username === 'admin') {
        return 'admin';
    }

    try {
        const params = new URLSearchParams({
            wstoken: token,
            wsfunction: 'core_role_assign_get_user_roles',
            moodlewsrestformat: 'json',
            userid: String(info.userid),
        });

        const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
        if (!response.ok) {
            return 'student';
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
            return 'student';
        }

        const resolvedRoles = (data as MoodleUserRoleResponse[])
            .map((role) => mapRoleName(role.shortname ?? role.name))
            .filter((role): role is MoodleRole => !!role);

        if (resolvedRoles.includes('admin')) return 'admin';
        if (resolvedRoles.includes('teacher')) return 'teacher';
    } catch (error) {
        console.warn('Unable to resolve Moodle role, defaulting to student:', error);
    }

    return 'student';
}

export async function getUserSessionContext(token: string): Promise<{ userid: number; username: string; role: MoodleRole }> {
    const siteInfo = await getSiteInfo(token);
    if (siteInfo.exception || !siteInfo.userid) {
        throw new Error(siteInfo.message || 'Unable to fetch user session');
    }

    const role = await getUserRole(token, siteInfo);
    return {
        userid: siteInfo.userid,
        username: siteInfo.username,
        role,
    };
}
