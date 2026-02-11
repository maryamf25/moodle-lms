
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('moodle_token')?.value;
    const { pathname } = request.nextUrl;

    // Paths that require authentication
    // Paths that require authentication
    // We want /course/[id] to be public, but /course/[id]/learn to be protected
    const protectedPaths = ['/dashboard', '/profile', '/learn']; // simplistic match for now, or regex

    // Better logic for course/learn
    const isProtected =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/profile') ||
        pathname.includes('/learn'); // This covers /course/[id]/learn

    // Paths that are for guests only (like login/register)
    const authPaths = ['/login', '/register'];
    const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

    if (isProtected && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname); // Optional: remember where user wanted to go
        return NextResponse.redirect(loginUrl);
    }

    if (isAuthPath && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
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
