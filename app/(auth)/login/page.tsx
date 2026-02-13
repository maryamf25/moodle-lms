'use client';
import { useState, Suspense } from 'react';
import { loginWithCredentialsAction } from './actions';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const result = await loginWithCredentialsAction(
                formData.username,
                formData.password,
                callbackUrl
            );

            if (!result.success || !result.redirectPath) {
                setError(result.error || 'Invalid credentials');
                return;
            }

            console.log('[auth][client] login result', {
                username: formData.username,
                resolvedRole: result.role,
                redirectPath: result.redirectPath,
            });
            router.push(result.redirectPath);

        } catch (err) {
            setError('Login failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">LMS Login</h1>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1 text-blue-600">Username</label>
                    <input
                        type="text"
                        className="w-full border p-2 rounded text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-1 text-blue-600">Password</label>
                    <input
                        type="password"
                        className="w-full border p-2 rounded text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">
                    Login
                </button>
            </form>
        </div>
    );
}
