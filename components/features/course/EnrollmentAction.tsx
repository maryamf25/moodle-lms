'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { quickEnroll } from '@/app/actions/enroll';

interface EnrollmentActionProps {
    course: {
        id: number;
    };
    isEnrolled: boolean;
}

export default function EnrollmentAction({ course, isEnrolled }: EnrollmentActionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewUser, setIsNewUser] = useState(true);

    // Server Action Hook
    const [state, formAction, isPending] = useActionState(quickEnroll, {});

    if (state?.success && state?.redirectUrl) {
        window.location.href = state.redirectUrl;
    }

    if (isEnrolled) {
        return (
            <Link href={`/course/${course.id}/learn`} className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30">
                Continue Learning
            </Link>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
            >
                Enroll Now
            </button>

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
        </>
    );
}
