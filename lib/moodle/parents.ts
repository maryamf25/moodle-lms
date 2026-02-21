import { BASE_URL } from './api';

const AUTH_DEBUG = process.env.AUTH_DEBUG === '1';

function authLog(message: string, data?: Record<string, unknown>) {
    if (!AUTH_DEBUG) return;
    if (data) {
        console.log(`[auth][parent] ${message}`, data);
        return;
    }
    console.log(`[auth][parent] ${message}`);
}

// Moodle's context levels (from Moodle documentation)
const CONTEXT_LEVELS = {
    SYSTEM: 10,
    CATEGORY: 40,
    COURSE: 50,
    MODULE: 70,
    BLOCK: 80,
    USER: 30,
};

const GET_USER_ROLES_WS = 'core_role_assign_get_user_roles';

interface MoodleSiteInfoLike {
    functions?: Array<{ name?: string }>;
    exception?: string;
    message?: string;
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

async function isWsFunctionAvailable(wsToken: string, wsFunction: string): Promise<boolean> {
    const params = new URLSearchParams({
        wstoken: wsToken,
        wsfunction: 'core_webservice_get_site_info',
        moodlewsrestformat: 'json',
    });

    const response = await fetch(`${BASE_URL}/webservice/rest/server.php?${params.toString()}`);
    if (!response.ok) return false;

    const data: MoodleSiteInfoLike = await response.json();
    if (data?.exception || !Array.isArray(data?.functions)) return false;

    return data.functions.some((fn) => fn?.name === wsFunction);
}

async function fetchUserRoleAssignments(userId: number): Promise<unknown[] | null> {
    const adminToken = process.env.MOODLE_ADMIN_TOKEN;
    if (!adminToken) {
        authLog('admin token missing; skipping Moodle parent-role check', { userId });
        return null;
    }

    const hasRolesFunction = await isWsFunctionAvailable(adminToken, GET_USER_ROLES_WS);
    if (!hasRolesFunction) {
        authLog('role assignment wsfunction unavailable on this Moodle instance', {
            userId,
            wsfunction: GET_USER_ROLES_WS,
        });
        return null;
    }

    const params = new URLSearchParams({
        wstoken: adminToken,
        wsfunction: GET_USER_ROLES_WS,
        moodlewsrestformat: 'json',
        userid: String(userId),
    });

    const response = await fetch(
        `${BASE_URL}/webservice/rest/server.php?${params.toString()}`
    );

    if (!response.ok) {
        authLog('role api http error', { status: response.status, userId });
        return null;
    }

    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'exception' in data) {
        authLog('moodle api error response', {
            userId,
            error: (data as Record<string, unknown>).message,
        });
        return null;
    }

    if (!Array.isArray(data)) {
        authLog('unexpected response type', {
            userId,
            type: typeof data,
        });
        return null;
    }

    return data;
}

/**
 * Check if a user has the Parent role in Moodle
 * The Parent role is usually assigned at the USER context level (contextlevel 30)
 */
export async function isUserParentInMoodle(
    token: string,
    userId: number
): Promise<boolean> {
    try {
        authLog('checking if user is parent in Moodle', { userId });

        // Get the parent role ID from environment or use default
        const PARENT_ROLE_ID = process.env.MOODLE_ROLE_PARENT_ID
            ? Number(process.env.MOODLE_ROLE_PARENT_ID)
            : 9; // Default parent role ID

        authLog('using parent role ID', { parentRoleId: PARENT_ROLE_ID });

        const data = await fetchUserRoleAssignments(userId);
        if (!data) {
            return false;
        }

        authLog('moodle role assignments received', {
            userId,
            assignmentCount: data.length,
            assignments: data,
        });

        // Check if user has Parent role assigned at USER context level
        const isParent = data.some((assignment: Record<string, unknown>) => {
            const roleid = toNumber(assignment.roleid);
            const contextlevel = toNumber(assignment.contextlevel);

            authLog('checking assignment', {
                roleid,
                contextlevel,
                expectedRoleId: PARENT_ROLE_ID,
                expectedContextLevel: CONTEXT_LEVELS.USER,
            });

            // Parent role should be assigned at USER context (contextlevel 30)
            return (
                roleid === PARENT_ROLE_ID &&
                contextlevel === CONTEXT_LEVELS.USER
            );
        });

        authLog('parent status result', { userId, isParent });
        return isParent;
    } catch (error) {
        authLog('error checking parent status', {
            userId,
            error: String(error),
        });
        return false;
    }
}

/**
 * Get all children of a parent user in Moodle
 */
export async function getParentChildrenFromMoodle(
    token: string,
    parentUserId: number
): Promise<number[]> {
    try {
        authLog('fetching children for parent', { parentUserId });

        const PARENT_ROLE_ID = process.env.MOODLE_ROLE_PARENT_ID
            ? Number(process.env.MOODLE_ROLE_PARENT_ID)
            : 9;

        const data = await fetchUserRoleAssignments(parentUserId);
        if (!data) {
            authLog('failed to get role assignments', { parentUserId });
            return [];
        }

        // Filter for Parent role assignments at USER context
        const parentAssignments = data.filter((assignment: Record<string, unknown>) => {
            return (
                toNumber(assignment.roleid) === PARENT_ROLE_ID &&
                toNumber(assignment.contextlevel) === CONTEXT_LEVELS.USER
            );
        });

        authLog('parent assignments found', {
            parentUserId,
            count: parentAssignments.length,
        });

        // Extract child user IDs from context IDs
        // For USER context, the instanceid is the user ID
        const childIds = parentAssignments.map((assignment: Record<string, unknown>) => {
            // In user context, instanceid is the child's user ID
            return toNumber(assignment.instanceid);
        });

        authLog('extracted child IDs', { parentUserId, childIds });
        return childIds.filter((id): id is number => id !== null);
    } catch (error) {
        authLog('error getting children', {
            parentUserId,
            error: String(error),
        });
        return [];
    }
}
