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
        <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="px-4">
                    <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                        {userProfile ? `Welcome back, ${userProfile.firstname || userProfile.fullname}! 👋` : 'Student Dashboard'}
                    </h1>
                    <p className="mt-2 text-lg text-slate-500">
                        Track your learning progress and continue where you left off.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg shadow-sm">
                    <p className="text-sm text-red-700 font-medium">⚠️ {error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: 'Enrolled Courses', value: courses.length, icon: '📚', color: 'indigo' },
                    { label: 'Completed', value: completedCourses, icon: '✅', color: 'green' },
                    { label: 'Avg. Progress', value: `${avgProgress}%`, icon: '📈', color: 'blue' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white overflow-hidden shadow-sm rounded-2xl border border-slate-100 p-6 flex items-center">
                        <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 text-2xl mr-4 shrink-0`}>
                            {stat.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-500 truncate">{stat.label}</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900 truncate">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8 px-2">
                    <h2 className="text-2xl font-extrabold text-slate-900">My Learning Path</h2>
                    <Link href="/" className="text-sm font-bold text-indigo-600 hover:text-indigo-500 transition-colors">Browse More &rarr;</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {courses.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center col-span-full">
                            <p className="text-slate-400 font-bold">You are not enrolled in any course yet.</p>
                        </div>
                    ) : (
                        courses.map((course) => (
                            <div key={course.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
                                <div className="h-44 bg-slate-100 relative overflow-hidden shrink-0">
                                    {course.overviewfiles && course.overviewfiles.length > 0 ? (
                                        <img
                                            src={`${course.overviewfiles[0].fileurl}?token=${token}`}
                                            alt={course.fullname}
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200 text-5xl font-bold">
                                            {course.fullname.charAt(0)}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3rem] text-lg leading-tight">{course.fullname}</h3>

                                    <div className="mt-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Course Progress</span>
                                            <span className="text-xs font-bold text-indigo-600">{Math.round(course.progress || 0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                                                style={{ width: `${course.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    <Link
                                        href={`/course/${course.id}/learn`}
                                        className="mt-8 w-full text-center text-sm font-bold text-white bg-indigo-600 hover:bg-slate-900 px-4 py-3 rounded-xl transition-all shadow-lg shadow-indigo-100 hover:shadow-slate-200 active:scale-95"
                                    >
                                        Continue Learning
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
