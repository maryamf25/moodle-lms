import Link from 'next/link';

interface CourseHeroProps {
    course: {
        fullname: string;
        shortname: string;
        imageurl?: string;
        startdate?: number;
    };
}

export default function CourseHero({ course }: CourseHeroProps) {
    // Mature approach: Format the date with a fixed locale to prevent hydration mismatches
    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    return (
        <div className="relative bg-gray-900 text-white overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                {course.imageurl ? (
                    <img src={course.imageurl} alt={course.fullname} className="w-full h-full object-cover opacity-30" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-gray-900 opacity-50"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                {/* Breadcrumbs */}
                <nav className="flex text-sm font-medium text-gray-400 mb-6">
                    <Link href="/" className="hover:text-white transition-colors">Home</Link>
                    <span className="mx-2">/</span>
                    <Link href="/#courses" className="hover:text-white transition-colors">Courses</Link>
                    <span className="mx-2">/</span>
                    <span className="text-white truncate">{course.shortname}</span>
                </nav>

                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                    {course.fullname}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-sm md:text-base text-gray-300">
                    {course.startdate ? (
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {/* suppressHydrationWarning handles any remaining micro-differences */}
                            <span suppressHydrationWarning>
                                Starts {formatDate(course.startdate)}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Self-Paced</span>
                        </div>
                    )}
                    <div className="flex items-center">
                        <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-blue-500/30">
                            Certified
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}