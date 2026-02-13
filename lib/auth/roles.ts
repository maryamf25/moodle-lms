export type MoodleRole = 'admin' | 'teacher' | 'student';

export function normalizeRole(value?: string | null): MoodleRole {
    if (value === 'admin' || value === 'teacher' || value === 'student') {
        return value;
    }
    return 'student';
}

export function getDashboardPathForRole(role: MoodleRole): string {
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'teacher') return '/dashboard/teacher';
    return '/dashboard/student';
}

export function roleFromDashboardPath(pathname: string): MoodleRole | null {
    if (pathname.startsWith('/dashboard/admin')) return 'admin';
    if (pathname.startsWith('/dashboard/teacher')) return 'teacher';
    if (pathname.startsWith('/dashboard/student')) return 'student';
    return null;
}
