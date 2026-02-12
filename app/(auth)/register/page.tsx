'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUserAction } from './actions';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        firstname: '',
        lastname: '',
        email: '',
    });
    const [error, setError] = useState('');
    const [errorDetails, setErrorDetails] = useState('');
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setErrorDetails('');

        try {
            const result = await registerUserAction(formData);
            if (!result.success) {
                setError(result.message || 'Registration failed');
                setErrorDetails(result.details || '');
                return;
            }
            setSuccessMessage(
                result.message ||
                (result.requiresEmailConfirmation
                    ? 'Registration submitted. Please confirm your email before logging in.'
                    : 'Registration successful.')
            );
            setSuccess(true);
        } catch (err: unknown) {
            setError('Registration failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
                    <h2 className="text-2xl font-bold text-green-600 mb-4">Registration Successful!</h2>
                    <p className="text-black">{successMessage || 'Please check your email inbox (and spam folder) to confirm your account.'}</p>
                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className="mt-5 w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                    >
                        Go To Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96 text-black">
                <h1 className="text-2xl font-bold mb-6 text-center text-black">REGISTER</h1>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                        <p className="text-red-700 text-sm font-semibold">{error}</p>
                        {errorDetails && (
                            <pre className="mt-2 text-xs text-red-800 whitespace-pre-wrap break-words">{errorDetails}</pre>
                        )}
                    </div>
                )}

                {['username', 'password', 'firstname', 'lastname', 'email'].map((field) => (
                    <div className="mb-4" key={field}>
                        <label className="block text-sm font-medium mb-1 capitalize text-black">{field}</label>
                        <input
                            type={field === 'password' || field === 'email' ? field : 'text'}
                            name={field}
                            className="w-full border p-2 rounded text-black"
                            required
                            onChange={handleChange}
                        />
                    </div>
                ))}

                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                    REGISTER
                </button>

                <p className="mt-4 text-center text-sm">
                    Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
                </p>
            </form>
        </div>
    );
}
