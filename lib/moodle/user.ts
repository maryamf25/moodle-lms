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

interface MoodleEnrolledUser {
    id?: number;
    roles?: Array<{ roleid?: number; shortname?: string; name?: string }>;
}

const MOODLE_ROLE_EDITING_TEACHER = 3;
const MOODLE_ROLE_NON_EDITING_TEACHER = 4;
const MOODLE_CONTEXT_SYSTEM = 10;

function isTeacherRoleId(roleid?: number): boolean {
    return roleid === MOODLE_ROLE_EDITING_TEACHER || roleid === MOODLE_ROLE_NON_EDITING_TEACHER;
}

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

async function fetchUserCourseIds(token: string, userid: number, tokenSource: 'admin' | 'user'): Promise<number[]> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_enrol_get_users_courses',
        moodlewsrestformat: 'json',
        userid: String(userid),
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) {
        authLog('failed to fetch enrolled courses', {
            tokenSource,
            userid,
            status: response.status,
        });
        return [];
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        authLog('enrolled courses response is not array', {
            tokenSource,
            userid,
        });
        return [];
    }

    const courseIds = data
        .map((course) => (course as { id?: number }).id)
        .filter((id): id is number => typeof id === 'number');
    authLog('fetched enrolled courses', {
        tokenSource,
        userid,
        courseCount: courseIds.length,
    });
    return courseIds;
}

async function hasTeacherRoleInCourse(token: string, courseid: number, userid: number, tokenSource: 'admin' | 'user'): Promise<boolean> {
    const params = new URLSearchParams({
        wstoken: token,
        wsfunction: 'core_enrol_get_enrolled_users',
        moodlewsrestformat: 'json',
        courseid: String(courseid),
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) {
        authLog('failed to fetch enrolled users for course', {
            tokenSource,
            userid,
            courseid,
            status: response.status,
        });
        return false;
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
        authLog('enrolled users response is not array', {
            tokenSource,
            userid,
            courseid,
        });
        return false;
    }

    const userRow = (data as MoodleEnrolledUser[]).find((row) => row.id === userid);
    if (!userRow || !Array.isArray(userRow.roles)) {
        return false;
    }

    const roleIds = userRow.roles.map((role) => role.roleid).filter((id): id is number => typeof id === 'number');
    const isTeacherInCourse = roleIds.some((roleid) => isTeacherRoleId(roleid));
    authLog('checked course-level roles', {
        tokenSource,
        userid,
        courseid,
        roleIds,
        isTeacherInCourse,
    });

    return isTeacherInCourse;
}

async function hasTeacherRoleInAnyCourse(token: string, userid: number, tokenSource: 'admin' | 'user'): Promise<boolean> {
    const courseIds = await fetchUserCourseIds(token, userid, tokenSource);
    if (courseIds.length === 0) return false;

    for (const courseid of courseIds) {
        if (await hasTeacherRoleInCourse(token, courseid, userid, tokenSource)) {
            authLog('teacher role found in course', {
                tokenSource,
                userid,
                courseid,
            });
            return true;
        }
    }

    return false;
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
        let roleTokenSource: 'admin' | 'user' = 'user';
        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (adminToken) {
            roleToken = adminToken;
            roleTokenSource = 'admin';
        } else {
            roleToken = token;
            roleTokenSource = 'user';
        }

        let assignedRoles: MoodleUserRoleResponse[] | null = null;
        if (roleToken) {
            assignedRoles = await fetchRoleAssignments(roleToken, info.userid, roleTokenSource);
        }

        if (!assignedRoles && roleTokenSource === 'admin') {
            assignedRoles = await fetchRoleAssignments(token, info.userid, 'user');
        }

        const hasSystemTeacherRole = (assignedRoles || []).some(
            (role) => role.contextlevel === MOODLE_CONTEXT_SYSTEM && isTeacherRoleId(role.roleid)
        );
        authLog('system-level teacher role check', {
            userid: info.userid,
            hasSystemTeacherRole,
            rolesChecked: (assignedRoles || []).length,
        });

        let hasCourseTeacherRole = false;
        if (roleToken) {
            hasCourseTeacherRole = await hasTeacherRoleInAnyCourse(roleToken, info.userid, roleTokenSource);
        }
        if (!hasCourseTeacherRole && roleTokenSource === 'admin') {
            hasCourseTeacherRole = await hasTeacherRoleInAnyCourse(token, info.userid, 'user');
        }
        authLog('course-level teacher role check', {
            userid: info.userid,
            hasCourseTeacherRole,
        });

        if (hasSystemTeacherRole || hasCourseTeacherRole) {
            authLog('resolved as teacher from system/course role checks');
            return 'teacher';
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
