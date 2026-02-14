import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDashboardPathForRole, normalizeRole } from '@/lib/auth/roles';
import { getUserCourses, getUserProfile, EnrolledCourse, UserProfile } from '@/lib/moodle';
import { getUserId } from '@/app/(auth)/login/actions';
import { addCourseContentAction, createTeacherCourseAction } from './actions';

function calculateAverageProgress(courses: EnrolledCourse[]): number {
    if (courses.length === 0) return 0;
    const total = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
    return Math.round(total / courses.length);
}

interface TeacherDashboardPageProps {
    searchParams?:
        | Promise<Record<string, string | string[] | undefined>>
        | Record<string, string | string[] | undefined>;
}

export default async function TeacherDashboardPage({ searchParams }: TeacherDashboardPageProps) {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;
    const roleCookie = cookieStore.get('moodle_role')?.value;
    const roleFromCookie = roleCookie ? normalizeRole(roleCookie) : null;

    if (!token) redirect('/login');
    if (!roleFromCookie) redirect('/dashboard');
    if (roleFromCookie !== 'teacher') {
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
        error = err instanceof Error ? err.message : 'Failed to load teacher dashboard';
    }

    const hiddenCourses = courses.filter((course) => course.visible === 0).length;
    const avgProgress = calculateAverageProgress(courses);
    const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};
    const flashRaw = resolvedSearchParams.flash;
    const typeRaw = resolvedSearchParams.type;
    const flash = typeof flashRaw === 'string' ? flashRaw : '';
    const flashType = typeRaw === 'error' ? 'error' : 'success';

    return (
        <div className="min-h-screen bg-slate-50">
            <nav className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-indigo-600">EduMeUp Clone</Link>
                    <div className="flex items-center gap-3">
                        <a
                            href={`${process.env.NEXT_PUBLIC_MOODLE_URL}/course/management.php`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                            Course Management
                        </a>
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
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
                <p className="text-gray-600 mt-1">
                    {userProfile ? `Welcome, ${userProfile.firstname || userProfile.fullname}.` : 'Manage your teaching space.'}
                </p>

                {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        {error}
                    </div>
                )}
                {flash && (
                    <div
                        className={`mt-6 border px-4 py-3 rounded-md ${
                            flashType === 'error'
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                        }`}
                    >
                        {flash}
                    </div>
                )}

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-lg p-5">
                        <p className="text-sm text-gray-500">Teaching Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{courses.length}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-5">
                        <p className="text-sm text-gray-500">Hidden Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{hiddenCourses}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-5">
                        <p className="text-sm text-gray-500">Avg Learner Progress</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{avgProgress}%</p>
                    </div>
                </div>

                <div className="mt-8 bg-white border rounded-lg p-5">
                    <h2 className="text-lg font-semibold text-gray-900">Instructor Actions</h2>
                    <div className="mt-3 flex flex-wrap gap-3">
                        <a
                            href={`${process.env.NEXT_PUBLIC_MOODLE_URL}/grade/report/grader/index.php`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Open Gradebook
                        </a>
                    </div>
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <form action={createTeacherCourseAction} className="border rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-gray-900">Create Course</h3>
                            <input
                                type="text"
                                name="fullname"
                                required
                                placeholder="Course full name"
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <input
                                type="text"
                                name="shortname"
                                required
                                placeholder="Course short name (e.g. WEB101)"
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <textarea
                                name="summary"
                                placeholder="Course summary (optional)"
                                rows={3}
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <input
                                type="number"
                                name="categoryId"
                                min={1}
                                placeholder="Category ID (optional)"
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Create Course
                            </button>
                        </form>

                        <form action={addCourseContentAction} className="border rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-gray-900">Add Course Content</h3>
                            <select
                                name="courseId"
                                required
                                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                                defaultValue=""
                            >
                                <option value="" disabled>Select a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.fullname}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                name="sectionName"
                                required
                                placeholder="Section title"
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <textarea
                                name="sectionSummary"
                                placeholder="Section content/summary (optional)"
                                rows={3}
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <input
                                type="number"
                                name="sectionNumber"
                                min={0}
                                placeholder="Section number (optional)"
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                                disabled={courses.length === 0}
                            >
                                Add Content
                            </button>
                        </form>
                    </div>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mt-8">Course Workspace</h2>
                <div className="mt-4 space-y-3">
                    {courses.length === 0 ? (
                        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
                            No teaching courses found for this account.
                        </div>
                    ) : (
                        courses.map((course) => (
                            <div key={course.id} className="bg-white border rounded-lg p-4 flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{course.fullname}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Visibility: {course.visible === 0 ? 'Hidden' : 'Visible'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/course/${course.id}/learn`}
                                        className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Open Classroom
                                    </Link>
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_MOODLE_URL}/course/view.php?id=${course.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Edit Course
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
