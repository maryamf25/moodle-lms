'use client';

import { useState, useActionState, useEffect } from 'react';
import Link from 'next/link';
import { quickEnroll } from '@/app/actions/enroll';
import { enrollExistingUser } from '@/app/actions/enrollExisting';

interface EnrollmentActionProps {
    course: { id: number };
    isEnrolled: boolean;
    price: number;
    isLoggedIn: boolean; // Added
}

export default function EnrollmentAction({ course, isEnrolled, price, isLoggedIn }: EnrollmentActionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewUser, setIsNewUser] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [state, formAction, isPending] = useActionState(quickEnroll, {});

    // Handle redirection to Safepay or Course Page (for modal flow)
    useEffect(() => {
        if (state?.success && state?.redirectUrl) {
            window.location.href = state.redirectUrl;
        }
    }, [state]);

    // Handle existing user enrollment click
    const handleEnrollExisting = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
            const result = await enrollExistingUser(course.id);
            if (result.success && result.redirectUrl) {
                window.location.href = result.redirectUrl;
            } else if (result.error) {
                setErrorMessage(result.error);
                setIsLoading(false);
            }
        } catch (e) {
            console.error(e);
            setErrorMessage('Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    // Scenario 1: User is already enrolled (Paid or Free)
    if (isEnrolled) {
        return (
            <Link
                href={`/course/${course.id}/learn`}
                className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/30"
            >
                Continue Learning
            </Link>
        );
    }

    // Scenario 2: User is Logged In but NOT Enrolled
    if (isLoggedIn) {
        return (
            <div className="space-y-4">
                <button
                    onClick={handleEnrollExisting}
                    disabled={isLoading}
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 flex justify-center items-center"
                >
                    {isLoading ? (
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                        price > 0 ? `Pay PKR ${price.toLocaleString()}` : 'Enroll Now'
                    )}
                </button>
                {errorMessage && (
                    <p className="text-sm text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg">
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    }

    // Scenario 3: User needs to Login/Signup to Enroll
    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
            >
                {price > 0 ? `Enroll & Pay PKR ${price.toLocaleString()}` : 'Enroll Now'}
            </button>

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
                                {price > 0
                                    ? `Complete registration to proceed to payment of PKR ${price}.`
                                    : 'Sign up to start learning for free.'}
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
                                            <input type="text" name="firstname" required className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" placeholder="John" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Last Name</label>
                                            <input type="text" name="lastname" required className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" placeholder="Doe" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Address</label>
                                    <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" placeholder="you@example.com" />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
                                    <input type="password" name="password" required className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" placeholder="••••••••" />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg flex justify-center items-center mt-6"
                                >
                                    {isPending ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    ) : (
                                        isNewUser
                                            ? (price > 0 ? 'Sign Up & Pay' : 'Sign Up & Enroll')
                                            : (price > 0 ? 'Login & Pay' : 'Login & Enroll')
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