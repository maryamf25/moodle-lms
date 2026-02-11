'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { quickEnroll } from '@/app/actions/enroll';
import { CourseContent } from '@/lib/moodle';

interface CourseLandingPageProps {
    course: {
        id: number;
        fullname: string;
        shortname: string;
        summary: string; // HTML allowed
        imageurl?: string;
        startdate?: number;
    };
    sections: CourseContent[];
    isEnrolled: boolean;
}

export default function CourseLandingPage({ course, sections, isEnrolled }: CourseLandingPageProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewUser, setIsNewUser] = useState(true);

    // Server Action Hook
    // In React 19, useActionState returns [state, action, isPending]
    const [state, formAction, isPending] = useActionState(quickEnroll, {});

    if (state?.success && state?.redirectUrl) {
        window.location.href = state.redirectUrl;
    }

    const EnrollButton = () => {
        if (isEnrolled) {
            return (
                <Link href={`/course/${course.id}/learn`} className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30">
                    Continue Learning
                </Link>
            );
        }
        return (
            <button
                onClick={() => setIsModalOpen(true)}
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
            >
                Enroll Now
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
            {/* --- Hero Section --- */}
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
                                <span>Starts {new Date(course.startdate * 1000).toLocaleDateString()}</span>
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

            {/* --- Main Content Grid --- */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Details (2/3 width) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Summary Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900">About This Course</h2>
                            <div
                                className="prose prose-blue max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: course.summary || '<p>No description available.</p>' }}
                            />
                        </div>

                        {/* Syllabus / Curriculum */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4">Course Curriculum</h2>
                            <div className="space-y-4">
                                {sections.map((section) => (
                                    <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors">
                                        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center cursor-default">
                                            <h3 className="font-semibold text-gray-800">{section.name || `Section ${section.section}`}</h3>
                                            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                                {section.modules?.length || 0} Lessons
                                            </span>
                                        </div>
                                        {/* Module List (Preview) */}
                                        <ul className="divide-y divide-gray-100">
                                            {section.modules && section.modules.map(mod => (
                                                <li key={mod.id} className="px-6 py-3 flex items-center justify-between text-sm group hover:bg-blue-50/50 transition-colors">
                                                    <div className="flex items-center text-gray-600">
                                                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100 transition-opacity">
                                                            {mod.modname === 'quiz' ? '📝' : mod.modname === 'assign' ? '📤' : '📄'}
                                                        </span>
                                                        <span className="group-hover:text-blue-700 font-medium transition-colors">{mod.name}</span>
                                                    </div>
                                                    {isEnrolled ? (
                                                        <Link href={`/course/${course.id}/learn`} className="text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all">
                                                            View &rarr;
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400">🔒</span>
                                                    )}
                                                </li>
                                            ))}
                                            {(!section.modules || section.modules.length === 0) && (
                                                <li className="px-6 py-3 text-xs text-gray-400 italic">No content in this section.</li>
                                            )}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Instructor (Placeholder for now as API might not give it easily) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Instructor</h2>
                            <div className="flex items-center">
                                <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 mr-4 overflow-hidden">
                                    <img src="https://ui-avatars.com/api/?name=Admin+User&background=random" alt="Instructor" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Course Instructor</h3>
                                    <p className="text-gray-500 text-sm">Expert in the field</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Sticky Sidebar (1/3 width) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">

                            {/* Enrollment Card */}
                            <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 p-6 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>

                                <div className="relative z-10">
                                    <div className="flex items-baseline mb-6">
                                        <span className="text-3xl font-extrabold text-gray-900">Free</span>
                                        <span className="ml-2 text-sm text-gray-500 line-through opacity-60">$99.00</span>
                                    </div>

                                    <EnrollButton />

                                    <p className="text-xs text-center text-gray-400 mt-4">
                                        30-Day Money-Back Guarantee
                                    </p>

                                    <div className="mt-6 space-y-3">
                                        <h4 className="font-bold text-sm text-gray-900">This course includes:</h4>
                                        <ul className="space-y-2 text-sm text-gray-600">
                                            <li className="flex items-start">
                                                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                <span>Full lifetime access</span>
                                            </li>
                                            <li className="flex items-start">
                                                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                <span>Access on mobile and TV</span>
                                            </li>
                                            <li className="flex items-start">
                                                <svg className="w-5 h-5 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                <span>Certificate of completion</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>

            {/* --- Quick Enroll Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {isNewUser ? 'Create your account' : 'Welcome back'}
                            </h2>
                            <p className="text-gray-500 mb-6 text-sm">
                                {isNewUser ? 'Sign up to enroll in this course.' : 'Log in to continue your enrollment.'}
                            </p>

                            {state?.error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                                    {state.error}
                                </div>
                            )}

                            <form action={formAction} className="space-y-4">
                                <input type="hidden" name="courseId" value={course.id} />
                                <input type="hidden" name="isNewUser" value={isNewUser.toString()} />

                                {isNewUser && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">First Name</label>
                                            <input type="text" name="firstname" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="John" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Last Name</label>
                                            <input type="text" name="lastname" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="Doe" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
                                    <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="you@example.com" />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
                                    <input type="password" name="password" required className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="••••••••" />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 flex justify-center items-center mt-6"
                                >
                                    {isPending ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        isNewUser ? 'Sign Up & Enroll' : 'Login & Enroll'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center text-sm">
                                <p className="text-gray-500">
                                    {isNewUser ? 'Already have an account?' : "Don't have an account?"}
                                    <button
                                        type="button"
                                        onClick={() => setIsNewUser(!isNewUser)}
                                        className="ml-1 text-blue-600 font-semibold hover:underline"
                                    >
                                        {isNewUser ? 'Log in' : 'Sign up'}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
