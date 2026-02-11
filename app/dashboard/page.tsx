import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserCourses, getUserProfile, EnrolledCourse, UserProfile } from '@/lib/moodle/index';
import { getUserId } from '@/app/(auth)/login/actions';

export default async function Dashboard() {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;

    if (!token) {
        redirect('/login');
    }

    let courses: EnrolledCourse[] = [];
    let userProfile: UserProfile | null = null;
    let error = '';

    try {
        const userid = await getUserId(token);
        // Fetch courses and profile in parallel
        const [coursesData, profileData] = await Promise.all([
            getUserCourses(token, userid),
            getUserProfile(token)
        ]);
        courses = coursesData;
        userProfile = profileData;

    } catch (err: any) {
        console.error("Dashboard Error:", err);
        error = err.message || 'Failed to load courses';
        if (err.message && err.message.includes('token')) {
            // redirect('/login'); // Optional: force re-login
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link href="/" className="text-2xl font-bold text-blue-600">
                                    EduMeUp Clone
                                </Link>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link
                                    href="/dashboard"
                                    className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/"
                                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                                >
                                    All Courses
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {userProfile && (
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-700 hidden md:block">
                                        {userProfile.fullname}
                                    </span>
                                    <img
                                        src={userProfile.profileimageurlsmall}
                                        alt={userProfile.fullname}
                                        className="h-8 w-8 rounded-full bg-gray-300"
                                    />
                                </div>
                            )}
                            <form action={async () => {
                                'use server';
                                const { cookies } = await import('next/headers');
                                (await cookies()).delete('moodle_token');
                                redirect('/login');
                            }}>
                                <button type="submit" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                                    Sign out
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {userProfile?.username === 'admin' ? 'Admin Dashboard' : 'My Learning'}
                            </h1>
                            {userProfile && (
                                <div className="text-sm text-gray-500 mt-1">
                                    Welcome back, <span className="font-semibold text-gray-900">{userProfile.firstname || userProfile.fullname.split(' ')[0]}</span>!
                                </div>
                            )}
                        </div>

                        {userProfile?.username === 'admin' && (
                            <div className="flex space-x-3">
                                <a href={`${process.env.NEXT_PUBLIC_MOODLE_URL}/course/management.php`} target="_blank" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Manage Courses
                                </a>
                                <a href={`${process.env.NEXT_PUBLIC_MOODLE_URL}/user.php`} target="_blank" className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
                                    Manage Users
                                </a>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        Error loading dashboard: {error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admin Stats Row (Demo) */}
                    {userProfile?.username === 'admin' && (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
                            {[
                                { name: 'Total Users', stat: '120+', icon: '👥', color: 'bg-blue-50 text-blue-700' },
                                { name: 'Active Courses', stat: courses.length.toString(), icon: '📚', color: 'bg-green-50 text-green-700' },
                                { name: 'Enrollments', stat: '850', icon: '📝', color: 'bg-purple-50 text-purple-700' },
                                { name: 'Revenue', stat: '$12k', icon: '💰', color: 'bg-yellow-50 text-yellow-700' },
                            ].map((item) => (
                                <div key={item.name} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden border border-gray-100">
                                    <dt>
                                        <div className={`absolute rounded-md p-3 ${item.color}`}>
                                            <span className="text-xl">{item.icon}</span>
                                        </div>
                                        <p className="ml-16 text-sm font-medium text-gray-500 truncate">{item.name}</p>
                                    </dt>
                                    <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
                                        <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
                                    </dd>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Course Grid */}
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{userProfile?.username === 'admin' ? 'All Courses Overview' : 'Enrolled Courses'}</h2>

                    {courses.length === 0 && !error ? (
                        <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by exploring our course catalog.</p>
                            <div className="mt-6">
                                <Link
                                    href="/"
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Browse Courses
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {courses.map((course) => (
                                <div
                                    key={course.id}
                                    className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 border border-gray-100 flex flex-col"
                                >
                                    <div className="h-40 bg-gray-200 relative">
                                        {course.overviewfiles && course.overviewfiles.length > 0 ? (
                                            <img
                                                src={`${course.overviewfiles[0].fileurl}?token=${token}`}
                                                alt={course.fullname}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-300">
                                                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                            </div>
                                        )}
                                        {course.completed && (
                                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                Completed
                                            </div>
                                        )}
                                        {/* Admin specific: Show Hidden Badge */}
                                        {userProfile?.username === 'admin' && course.visible === 0 && (
                                            <div className="absolute top-2 left-2 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-full">
                                                Hidden
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 truncate" title={course.fullname}>
                                            {course.fullname}
                                        </h3>
                                        <div
                                            className="mt-2 max-w-xl text-sm text-gray-500 line-clamp-2"
                                            dangerouslySetInnerHTML={{ __html: course.summary || '' }}
                                        />

                                        <div className="mt-auto pt-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-500 font-medium">Progress</span>
                                                <span className="text-xs text-blue-600 font-bold">{course.progress?.toFixed(0) || 0}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${course.progress || 0}%` }}
                                                ></div>
                                            </div>

                                            <div className="mt-4 flex gap-2">
                                                <Link
                                                    href={`/course/${course.id}/learn`}
                                                    className="flex-1 block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                                >
                                                    {userProfile?.username === 'admin' ? 'Preview' : 'Continue'}
                                                </Link>
                                                {userProfile?.username === 'admin' && (
                                                    <a
                                                        href={`${process.env.NEXT_PUBLIC_MOODLE_URL}/course/view.php?id=${course.id}`}
                                                        target="_blank"
                                                        className="block text-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                    >
                                                        Edit
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
