
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDashboardPathForRole, normalizeRole, roleFromDashboardPath } from '@/lib/auth/roles';
const AUTH_DEBUG = process.env.AUTH_DEBUG === '1';

function authLog(message: string, data?: Record<string, unknown>) {
    if (process.env.AUTH_DEBUG !== '1') return;
    // Skip noisy request logging unless specifically asked
    if (message === 'request' && !process.env.DEBUG_MIDDLEWARE) return;

    if (data) {
        console.log(`[auth][middleware] ${message}`, data);
        return;
    }
    console.log(`[auth][middleware] ${message}`);
}

export function middleware(request: NextRequest) {
    const token = request.cookies.get('moodle_token')?.value;
    const roleCookie = request.cookies.get('moodle_role')?.value;
    const role = roleCookie ? normalizeRole(roleCookie) : null;
    const { pathname } = request.nextUrl;

    // Paths that require authentication
    // Paths that require authentication
    // We want /course/[id] to be public, but /course/[id]/learn to be protected
    // Better logic for course/learn
    const isProtected =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/profile') ||
        pathname.includes('/learn'); // This covers /course/[id]/learn

    // Paths that are for guests only (like login/register)
    const authPaths = ['/login', '/register'];
    const isAuthPath = authPaths.some((path) => pathname.startsWith(path));
    authLog('request', {
        pathname,
        hasToken: Boolean(token),
        roleCookie: roleCookie ?? null,
        normalizedRole: role,
    });

    if (isProtected && !token) {
        authLog('redirecting unauthenticated user to login', { pathname });
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname); // Optional: remember where user wanted to go
        return NextResponse.redirect(loginUrl);
    }

    if (token) {
        if (pathname === '/dashboard' && role) {
            authLog('redirecting /dashboard to role dashboard', {
                role,
                target: getDashboardPathForRole(role),
            });
            return NextResponse.redirect(new URL(getDashboardPathForRole(role), request.url));
        }

        const requiredRoleForPath = roleFromDashboardPath(pathname);
        if (requiredRoleForPath && !role) {
            authLog('missing role cookie for role path, redirecting to /dashboard', {
                pathname,
                requiredRoleForPath,
            });
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        if (requiredRoleForPath && role && requiredRoleForPath !== role) {
            authLog('role mismatch redirect', {
                pathname,
                requiredRoleForPath,
                actualRole: role,
                target: getDashboardPathForRole(role),
            });
            return NextResponse.redirect(new URL(getDashboardPathForRole(role), request.url));
        }
    }

    if (isAuthPath && token) {
        if (!role) {
            authLog('authenticated user without role on auth page, redirecting to /dashboard');
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        authLog('authenticated user on auth page, redirecting by role', {
            role,
            target: getDashboardPathForRole(role),
        });
        return NextResponse.redirect(new URL(getDashboardPathForRole(role), request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder content
         */
        '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
    ],
};
