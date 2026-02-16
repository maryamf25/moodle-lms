import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getDashboardPathForRole, normalizeRole } from '@/lib/auth/roles';
import { getUserCourses, getUserProfile, EnrolledCourse, UserProfile, getEnrolledUsers, canUserCreateCourse, getCategories } from '@/lib/moodle';
import { getUserId } from '@/app/(auth)/login/actions';
import TeacherSSOLink from '@/components/features/dashboard/TeacherSSOLink';
import TeacherCourseCard from '@/components/features/dashboard/TeacherCourseCard';

interface CourseWithStudents extends EnrolledCourse {
    students: any[];
}

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
    const privateToken = cookieStore.get('moodle_private_token')?.value || '';
    const roleCookie = cookieStore.get('moodle_role')?.value;
    const roleFromCookie = roleCookie ? normalizeRole(roleCookie) : null;

    if (!token) redirect('/login');
    if (!roleFromCookie) redirect('/dashboard');
    if (roleFromCookie !== 'teacher') {
        redirect(getDashboardPathForRole(roleFromCookie));
    }

    let courses: CourseWithStudents[] = [];
    let userProfile: UserProfile | null = null;
    let canCreateCourse = false;
    let categories: any[] = [];
    let error = '';

    try {
        const userid = await getUserId(token);
        const [coursesData, profileData, createPerm, categoriesData] = await Promise.all([
            getUserCourses(token, userid),
            getUserProfile(token),
            canUserCreateCourse(token),
            getCategories(token),
        ]);

        userProfile = profileData;
        canCreateCourse = createPerm || profileData.role === 'admin';
        categories = categoriesData;

        // Fetch students for each course in parallel
        courses = await Promise.all(coursesData.map(async (course) => {
            const students = await getEnrolledUsers(token, course.id);
            return {
                ...course,
                students: students.filter((s: any) => s.id !== userid)
            };
        }));

    } catch (err: unknown) {
        error = err instanceof Error ? err.message : 'Failed to load teacher dashboard';
    }

    // Group courses by category
    const coursesByCategory = courses.reduce((acc: Record<string, CourseWithStudents[]>, course) => {
        const cat = categories.find(c => c.id === course.category);
        const catName = cat ? cat.name : 'Uncategorized';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(course);
        return acc;
    }, {});

    const totalStudents = courses.reduce((acc, c) => acc + (c.enrolledusercount || 0), 0);
    const hiddenCourses = courses.filter((course) => course.visible === 0).length;
    const avgProgress = calculateAverageProgress(courses);

    const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};
    const flashRaw = resolvedSearchParams.flash;
    const typeRaw = resolvedSearchParams.type;
    const flash = typeof flashRaw === 'string' ? flashRaw : '';
    const flashType = typeRaw === 'error' ? 'error' : 'success';

    return (
        <div className="space-y-8">
            {/* Header / Hero Section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="px-4">
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl sm:truncate">
                                {userProfile ? `Welcome back, ${userProfile.firstname || userProfile.fullname}! 👋` : 'Teacher Dashboard'}
                            </h1>
                            <p className="mt-2 text-lg text-slate-500">
                                Manage your courses, track student performance, and create engaging learning experiences.
                            </p>
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <TeacherSSOLink
                                token={token}
                                privateToken={privateToken}
                                label="Manage Courses"
                                targetUrl={`${process.env.NEXT_PUBLIC_MOODLE_URL}/my/courses.php`}
                                icon=""
                                className="inline-flex items-center px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                            />
                            {canCreateCourse && (
                                <TeacherSSOLink
                                    token={token}
                                    privateToken={privateToken}
                                    label="Create New Course"
                                    targetUrl={`${process.env.NEXT_PUBLIC_MOODLE_URL}/course/edit.php?category=0`}
                                    icon="➕"
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Active Courses', value: courses.length - hiddenCourses, icon: '', color: 'blue' },
                    { label: 'Total Students', value: totalStudents, icon: '', color: 'indigo' },
                    { label: 'Hidden Courses', value: hiddenCourses, icon: '', color: 'orange' },
                    { label: 'Avg. Progress', value: `${avgProgress}%`, icon: '', color: 'green' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white overflow-hidden shadow-sm rounded-2xl border border-slate-100 p-6 flex items-center">
                        <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 text-2xl mr-4`}>
                            {stat.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-500 truncate">{stat.label}</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900 truncate">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0 text-red-400">⚠️</div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {flash && (
                <div className={`border-l-4 p-4 rounded-r-lg shadow-sm ${flashType === 'error' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
                    <div className="flex">
                        <div className="flex-shrink-0">{flashType === 'error' ? '❌' : '✅'}</div>
                        <div className="ml-3">
                            <p className="text-sm font-medium">{flash}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Course Workspace */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Project Workspaces</h2>
                    <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">View Public Catalog &rarr;</Link>
                </div>

                <div className="space-y-12">
                    {courses.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                            <div className="text-4xl mb-4 text-slate-300">📁</div>
                            <h3 className="text-lg font-medium text-slate-900">No courses yet</h3>
                            <p className="mt-1 text-slate-500">Create your first course to get started.</p>
                        </div>
                    ) : (
                        Object.entries(coursesByCategory).map(([categoryName, categoryCourses]) => (
                            <div key={categoryName} className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                    <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">{categoryName}</h3>
                                    <span className="text-sm text-slate-400 font-medium">({categoryCourses.length})</span>
                                </div>
                                <div className="space-y-4">
                                    {categoryCourses.map((course) => (
                                        <TeacherCourseCard
                                            key={course.id}
                                            course={course}
                                            students={course.students}
                                            token={token!}
                                            privateToken={privateToken}
                                            moodleUrl={process.env.NEXT_PUBLIC_MOODLE_URL!}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
