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

        // Query Moodle to get user role assignments (using ADMIN token for permissions)
        const params = new URLSearchParams({
            wstoken: process.env.MOODLE_ADMIN_TOKEN!,
            wsfunction: 'core_role_assign_get_user_roles',
            moodlewsrestformat: 'json',
            userid: String(userId),
        });

        const response = await fetch(
            `${BASE_URL}/webservice/rest/server.php?${params.toString()}`
        );

        if (!response.ok) {
            authLog('role api http error', { status: response.status, userId });
            return false;
        }

        const data: unknown = await response.json();

        // Check if response is an error
        if (
            data &&
            typeof data === 'object' &&
            'exception' in data
        ) {
            authLog('moodle api error response', {
                userId,
                error: (data as Record<string, unknown>).message,
            });
            return false;
        }

        // Should be an array of role assignments
        if (!Array.isArray(data)) {
            authLog('unexpected response type', {
                userId,
                type: typeof data,
            });
            return false;
        }

        authLog('moodle role assignments received', {
            userId,
            assignmentCount: data.length,
            assignments: data,
        });

        // Check if user has Parent role assigned at USER context level
        const isParent = data.some((assignment: Record<string, unknown>) => {
            const roleid = assignment.roleid;
            const contextlevel = assignment.contextlevel;

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

        // Get all role assignments for the parent user (using ADMIN token)
        const params = new URLSearchParams({
            wstoken: process.env.MOODLE_ADMIN_TOKEN!,
            wsfunction: 'core_role_assign_get_user_roles',
            moodlewsrestformat: 'json',
            userid: String(parentUserId),
        });

        const response = await fetch(
            `${BASE_URL}/webservice/rest/server.php?${params.toString()}`
        );

        if (!response.ok || !response.ok) {
            authLog('failed to get role assignments', { parentUserId });
            return [];
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
            authLog('unexpected role assignments response', { parentUserId });
            return [];
        }

        // Filter for Parent role assignments at USER context
        const parentAssignments = data.filter((assignment: Record<string, unknown>) => {
            return (
                assignment.roleid === PARENT_ROLE_ID &&
                assignment.contextlevel === CONTEXT_LEVELS.USER
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
            return assignment.instanceid;
        });

        authLog('extracted child IDs', { parentUserId, childIds });
        return childIds as number[];
    } catch (error) {
        authLog('error getting children', {
            parentUserId,
            error: String(error),
        });
        return [];
    }
}
