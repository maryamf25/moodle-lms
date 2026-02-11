
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCourseContents, getUserCourses, CourseContent } from '@/lib/moodle';
import { getUserId } from '@/app/(auth)/login/actions';
import CoursePlayer from '@/components/CoursePlayer';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CoursePage({ params }: PageProps) {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;
    const courseId = parseInt(id);

    if (!token) {
        redirect('/login');
    }

    let contents: CourseContent[] = [];
    let courseName = '';
    let error = '';

    try {
        // 1. Fetch Course Contents
        contents = await getCourseContents(token, courseId);

        // 2. Fetch Course Name (Optional but good for UX)
        const userId = await getUserId(token);
        const courses = await getUserCourses(token, userId);
        const course = courses.find((c) => c.id === courseId);
        if (course) {
            courseName = course.fullname;
        }

    } catch (err: any) {
        console.error("Course Page Error:", err);
        error = err.message || 'Failed to load course content';
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
            {/* Navbar specific for Course Player */}
            <nav className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 fixed top-0 w-full z-50">
                <Link
                    href={`/course/${courseId}`}
                    className="flex items-center text-gray-500 hover:text-blue-600 transition-colors py-2 px-3 rounded-md hover:bg-gray-50"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="font-medium text-sm">Back to Course Details</span>
                </Link>

                <div className="flex items-center space-x-4">
                    <div className="text-sm font-bold text-gray-800 hidden sm:block truncate max-w-xs" title={courseName}>
                        {courseName}
                    </div>
                    {/* Could add Profile Dropdown here too */}
                </div>
            </nav>

            {/* Main Player Area (offset for fixed navbar) */}
            <div className="mt-16 flex-1">
                {error ? (
                    <div className="max-w-4xl mx-auto py-10 px-4">
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-red-700">{error}</p>
                            <Link href="/dashboard" className="text-red-600 underline mt-2 block text-sm">Return to Dashboard</Link>
                        </div>
                    </div>
                ) : contents.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500">No content found for this course.</p>
                    </div>
                ) : (
                    <CoursePlayer courseId={courseId} courseName={courseName} sections={contents} />
                )}
            </div>
        </div>
    );
}
