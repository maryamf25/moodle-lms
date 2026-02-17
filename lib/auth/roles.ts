export type MoodleRole = 'admin' | 'student' | 'parent' | 'school';

const ROLE_FALLBACK: MoodleRole = 'student';

const ROLE_TO_DASHBOARD: Record<MoodleRole, string> = {
    admin: '/dashboard/admin',
    parent: '/dashboard/parent',
    school: '/dashboard/school',
    student: '/dashboard/student',
};

export function normalizeRole(value?: string | null): MoodleRole {
    if (!value) return ROLE_FALLBACK;

    if (value in ROLE_TO_DASHBOARD) {
        return value as MoodleRole;
    }

    return ROLE_FALLBACK;
}

export function getDashboardPathForRole(role: MoodleRole): string {
    return ROLE_TO_DASHBOARD[role] ?? ROLE_TO_DASHBOARD[ROLE_FALLBACK];
}

export function roleFromDashboardPath(pathname: string): MoodleRole | null {
    if (pathname.startsWith('/dashboard/admin')) return 'admin';
    if (pathname.startsWith('/dashboard/parent')) return 'parent';
    if (pathname.startsWith('/dashboard/school')) return 'school';
    if (pathname.startsWith('/dashboard/student')) return 'student';
    return null;
}
