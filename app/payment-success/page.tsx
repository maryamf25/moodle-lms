
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const courseId = searchParams.get('courseId');
    const tracker = searchParams.get('tracker'); // Safepay returns a tracker code

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your payment...');

    useEffect(() => {
        if (!courseId) {
            setStatus('error');
            setMessage('Invalid payment return data.');
            return;
        }

        // Simulating backend verification call
        // In a real app, you would verify the payment with Safepay using the tracker token
        // and then call enrolUser on the backend.

        async function completeEnrollment() {
            try {
                // Call a server action to verify and enroll would be better, 
                // but since we don't have a backend endpoint set up for this yet,
                // we will assume success for this demo if we have a tracker.

                // Note: The actual enrollment should happen securely on the server
                // via a webhook or a secure server action called here.
                // For now, let's call a server action or API route.

                const res = await fetch('/api/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseId, tracker })
                });

                if (res.ok) {
                    setStatus('success');
                } else {
                    const data = await res.json();
                    setStatus('error');
                    setMessage(data.error || 'Payment verification failed.');
                }

            } catch (e) {
                console.error(e);
                setStatus('error');
                setMessage('An unexpected error occurred.');
            }
        }

        completeEnrollment();

    }, [courseId, tracker]);

    if (status === 'verifying') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                <h1 className="text-xl font-bold text-gray-800">Verifying Payment...</h1>
                <p className="text-gray-500">Please wait while we confirm your enrollment.</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
                <p className="text-gray-600 text-center max-w-md mb-8">{message}</p>

                <div className="space-x-4">
                    <Link href={`/course/${courseId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        Try Again
                    </Link>
                    <Link href="/" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors">
                        Go Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enrollment Successful!</h1>
            <p className="text-gray-600 text-center max-w-md mb-8">
                Thank you for your purchase. You have been successfully enrolled in the course.
            </p>

            <Link
                href={`/course/${courseId}/learn`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-1"
            >
                Start Learning Now
            </Link>
        </div>
    );
}
