'use client';

import { CourseContent } from '@/lib/moodle/index';
import CourseHero from './CourseHero';
import Curriculum from './Curriculum';
import EnrollmentAction from './EnrollmentAction';

interface CourseLandingPageProps {
    course: {
        id: number;
        fullname: string;
        shortname: string;
        summary: string;
        imageurl?: string;
        startdate?: number;
    };
    sections: CourseContent[];
    isEnrolled: boolean;
    price: number;
    isLoggedIn: boolean; // Added isLoggedIn
}

export default function CourseLandingPage({ course, sections, isEnrolled, price, isLoggedIn }: CourseLandingPageProps) {
    const isPaid = price > 0;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
            <CourseHero course={course} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900">About This Course</h2>
                            <div
                                className="prose prose-blue max-w-none text-gray-600"
                                dangerouslySetInnerHTML={{ __html: course.summary || '<p>No description available.</p>' }}
                            />
                        </div>

                        <Curriculum sections={sections} isEnrolled={isEnrolled} courseId={course.id} />

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Instructor</h2>
                            <div className="flex items-center">
                                <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 mr-4 overflow-hidden">
                                    <img src={`https://ui-avatars.com/api/?name=Admin+User&background=random`} alt="Instructor" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Course Instructor</h3>
                                    <p className="text-gray-500 text-sm">Expert in the field</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 p-6 overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>

                                <div className="relative z-10">
                                    {/* Dynamic Price Display */}
                                    <div className="flex items-baseline mb-6">
                                        <span className="text-3xl font-extrabold text-gray-900">
                                            {isPaid ? `PKR ${price.toLocaleString()}` : 'Free'}
                                        </span>
                                        {isPaid && (
                                            <span className="ml-2 text-sm text-gray-500 line-through opacity-60">
                                                PKR {(price * 1.2).toLocaleString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Button (Now handles redirect logic) */}
                                    <EnrollmentAction
                                        course={course}
                                        isEnrolled={isEnrolled}
                                        price={price}
                                        isLoggedIn={isLoggedIn} // <--- ADD THIS LINE
                                    />
                                    <p className="text-xs text-center text-gray-400 mt-4">
                                        {isPaid ? 'Secure Payment via Safepay' : 'Instant Access'}
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
        </div>
    );
}