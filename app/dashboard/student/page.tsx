import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDashboardPathForRole, normalizeRole } from '@/lib/auth/roles';
import { getUserCourses, getUserProfile, EnrolledCourse, UserProfile } from '@/lib/moodle';
import { getUserId } from '@/app/(auth)/login/actions';

function calculateAverageProgress(courses: EnrolledCourse[]): number {
    if (courses.length === 0) return 0;
    const total = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
    return Math.round(total / courses.length);
}

export default async function StudentDashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;
    const roleCookie = cookieStore.get('moodle_role')?.value;
    const roleFromCookie = roleCookie ? normalizeRole(roleCookie) : null;

    if (!token) redirect('/login');
    if (!roleFromCookie) redirect('/dashboard');
    if (roleFromCookie !== 'student') {
        redirect(getDashboardPathForRole(roleFromCookie));
    }

    let courses: EnrolledCourse[] = [];
    let userProfile: UserProfile | null = null;
    let error = '';

    try {
        const userid = await getUserId(token);
        const [coursesData, profileData] = await Promise.all([
            getUserCourses(token, userid),
            getUserProfile(token),
        ]);
        courses = coursesData;
        userProfile = profileData;
    } catch (err: unknown) {
        error = err instanceof Error ? err.message : 'Failed to load student dashboard';
    }

    const completedCourses = courses.filter((course) => course.completed).length;
    const avgProgress = calculateAverageProgress(courses);

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-blue-600">EduMeUp Clone</Link>
                    <form action={async () => {
                        'use server';
                        const { cookies } = await import('next/headers');
                        (await cookies()).delete('moodle_token');
                        (await cookies()).delete('moodle_role');
                        redirect('/login');
                    }}>
                        <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">Sign out</button>
                    </form>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-gray-600 mt-1">
                    {userProfile ? `Welcome back, ${userProfile.firstname || userProfile.fullname}.` : 'Track your learning progress.'}
                </p>

                {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        {error}
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-lg p-5">
                        <p className="text-sm text-gray-500">Enrolled Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{courses.length}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-5">
                        <p className="text-sm text-gray-500">Completed</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{completedCourses}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-5">
                        <p className="text-sm text-gray-500">Average Progress</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{avgProgress}%</p>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
                    <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">Browse More Courses</Link>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {courses.length === 0 ? (
                        <div className="bg-white border rounded-lg p-10 text-center text-gray-500 col-span-full">
                            You are not enrolled in any course yet.
                        </div>
                    ) : (
                        courses.map((course) => (
                            <div key={course.id} className="bg-white border rounded-lg p-5">
                                <h3 className="font-semibold text-gray-900">{course.fullname}</h3>
                                <p className="text-xs text-gray-500 mt-2">Progress: {Math.round(course.progress || 0)}%</p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${course.progress || 0}%` }}
                                    />
                                </div>
                                <Link
                                    href={`/course/${course.id}/learn`}
                                    className="inline-block mt-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md"
                                >
                                    Continue Learning
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
