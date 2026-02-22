import Link from 'next/link';
import { getUserCourses, getUserProfile, EnrolledCourse, UserProfile } from '@/lib/moodle';
import { requireAppAuth } from '@/lib/auth/server-session';
import { getStudentActivityTimeline, getStudentCertificates } from '@/lib/moodle/activities';

import { getStudentGrades, CourseGrade } from '@/lib/moodle/grades';

function calculateAverageProgress(courses: EnrolledCourse[]): number {
    if (courses.length === 0) return 0;
    const total = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
    return Math.round(total / courses.length);
}

function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

export default async function StudentDashboardPage() {
    const auth = await requireAppAuth('student');
    const token = auth.token;

    let courses: (EnrolledCourse & { gradeData?: CourseGrade })[] = [];
    let userProfile: UserProfile | null = null;
    let timeline: any[] = [];
    let certificates: any[] = [];
    let error = '';

    try {
        const [coursesData, profileData, timelineData, certificatesData, gradesData] = await Promise.all([
            getUserCourses(token, auth.moodleUserId),
            getUserProfile(token),
            getStudentActivityTimeline(token, auth.moodleUserId),
            getStudentCertificates(token, auth.moodleUserId),
            getStudentGrades(auth.moodleUserId)
        ]);

        // Merge grades into courses
        courses = coursesData.map(course => ({
            ...course,
            gradeData: gradesData.find(g => g.courseId === course.id)
        }));

        userProfile = profileData;
        timeline = timelineData.slice(0, 5);
        certificates = certificatesData;

        if (userProfile) {
            userProfile.role = auth.role;
        }
    } catch (err: unknown) {
        error = err instanceof Error ? err.message : 'Failed to load student dashboard';
    }

    const completedCourses = courses.filter((course) => course.completed).length;
    const avgProgress = calculateAverageProgress(courses);

    return (
        <div className="space-y-10 pb-16">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        {userProfile ? `Welcome back, ${userProfile.firstname || userProfile.fullname}! 👋` : 'Student Dashboard'}
                    </h1>
                    <p className="mt-3 text-lg text-slate-500 font-medium">
                        Track your learning progress and continue your education journey.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] opacity-40 -mr-20 -mt-20"></div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl shadow-sm">
                    <p className="text-sm text-red-700 font-bold">⚠️ {error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {[
                    { label: 'Enrolled Courses', value: courses.length, icon: '📚', color: 'indigo' },
                    { label: 'Completed', value: completedCourses, icon: '✅', color: 'emerald' },
                    { label: 'Avg. Progress', value: `${avgProgress}%`, icon: '📈', color: 'blue' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-3xl border border-slate-100 p-8 flex items-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-4 rounded-2xl bg-indigo-50 text-2xl mr-5 shrink-0">
                            {stat.icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="mt-1 text-3xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main: My Learning Path */}
                <div className="lg:col-span-2 space-y-10">
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Learning Path</h2>
                            <Link href="/" className="text-sm font-black text-indigo-600 hover:text-indigo-500 uppercase tracking-widest">Browse More &rarr;</Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {courses.length === 0 ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center col-span-full">
                                    <p className="text-slate-400 font-extrabold text-lg">You are not enrolled in any course yet.</p>
                                </div>
                            ) : (
                                courses.map((course) => (
                                    <div key={course.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col border-b-[6px] border-b-indigo-500">
                                        <div className="h-48 bg-slate-100 relative overflow-hidden shrink-0">
                                            {course.overviewfiles && course.overviewfiles.length > 0 ? (
                                                <img
                                                    src={`${course.overviewfiles[0].fileurl}${course.overviewfiles[0].fileurl.includes('?') ? '&' : '?'}token=${token}`}
                                                    alt={course.fullname}
                                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200 text-6xl font-black">
                                                    {course.fullname.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8 flex-1 flex flex-col">
                                            <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3.5rem] text-xl leading-tight">{course.fullname}</h3>

                                            <div className="mt-8 space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course Progress</span>
                                                        <span className="text-xs font-black text-indigo-600">{Math.round(course.progress || 0)}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${course.progress || 0}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Current Grade</span>
                                                        <span className="text-sm font-black text-slate-900">{course.gradeData?.grade || 'N/A'}</span>
                                                    </div>
                                                    {course.gradeData && course.gradeData.percentage > 0 && (
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Overall Score</span>
                                                            <span className="block text-sm font-black text-emerald-600">{course.gradeData.percentage}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <Link
                                                href={`/course/${course.id}/learn`}
                                                className="mt-8 w-full text-center text-xs font-black text-white bg-indigo-600 hover:bg-slate-900 px-6 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-100 uppercase tracking-widest active:scale-95"
                                            >
                                                Continue Learning
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                </div>

                {/* Sidebar: Activity Timeline (SRS 4.6) */}
                <div className="space-y-10">
                    <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
                        <h2 className="text-xl font-black mb-8 relative z-10 flex items-center gap-2">
                            Recent Activity
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        </h2>

                        <div className="space-y-6 relative z-10">
                            {timeline.length === 0 ? (
                                <p className="text-slate-400 text-sm italic font-medium">No recent activities found.</p>
                            ) : (
                                timeline.map((item, idx) => (
                                    <div key={idx} className="relative pl-6 border-l border-slate-700 pb-2">
                                        <div className="absolute -left-[5px] top-0 w-[9px] h-[9px] bg-indigo-500 rounded-full ring-4 ring-slate-900"></div>
                                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">{formatDate(item.timeCompleted)}</p>
                                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.moduleName || 'Completed Module'}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold truncate tracking-tight">{item.courseName}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Background decor */}
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-600 rounded-full blur-[100px] opacity-10"></div>
                    </section>

                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100">
                        <h3 className="text-lg font-black mb-2">Learning Tip 💡</h3>
                        <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-90">
                            Regular study sessions are more effective than cramming. Try to spend at least 30 minutes every day.
                        </p>
                    </div>
                </div>
            </div>
        </div >
    );
}
