'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUserAction } from './actions';
import { MoodleRole } from '@/lib/auth/roles';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        firstname: '',
        lastname: '',
        email: '',
    });
    const [role, setRole] = useState<MoodleRole>('student');
    const [error, setError] = useState('');
    const [errorDetails, setErrorDetails] = useState('');
    const [success, setSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setErrorDetails('');
        setIsLoading(true);

        try {
            const result = await registerUserAction({ ...formData, role });
            if (!result.success) {
                setError(result.message || 'Registration failed');
                setErrorDetails(result.details || '');
                setIsLoading(false);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-blue-100 max-w-md w-full text-center border border-slate-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Registration Successful!</h2>
                    <p className="text-slate-600 leading-relaxed mb-8">{successMessage || 'Please check your email inbox (and spam folder) to confirm your account.'}</p>
                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-200 active:scale-95"
                    >
                        Go To Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 py-12 px-4">
            <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-blue-100 w-full max-w-lg border border-slate-100">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
                    <p className="text-slate-500 mt-2 font-medium">Join our global learning community</p>
                </div>

                <div className="mb-10">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Select Account Type</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['student', 'school', 'parent'] as MoodleRole[]).map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRole(r)}
                                className={`py-4 px-2 rounded-2xl text-sm font-bold transition-all border-2 ${role === r
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100 scale-105'
                                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200 hover:text-blue-500'
                                    }`}
                            >
                                <span className="block text-xl mb-1">
                                    {r === 'student' ? '🎓' : r === 'school' ? '🏫' : '👪'}
                                </span>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-6 flex items-start">
                            <div className="shrink-0 text-red-500 mr-3">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-red-800 text-sm font-bold leading-tight">{error}</p>
                                {errorDetails && (
                                    <pre className="mt-2 text-[10px] text-red-600 whitespace-pre-wrap break-words opacity-70 leading-tight">{errorDetails}</pre>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">First Name</label>
                            <input
                                type="text"
                                name="firstname"
                                placeholder="Enter first name"
                                className="w-full bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:outline-none p-4 rounded-2xl text-slate-900 transition-all font-medium"
                                required
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Last Name</label>
                            <input
                                type="text"
                                name="lastname"
                                placeholder="Enter last name"
                                className="w-full bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:outline-none p-4 rounded-2xl text-slate-900 transition-all font-medium"
                                required
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="yourname@example.com"
                            className="w-full bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:outline-none p-4 rounded-2xl text-slate-900 transition-all font-medium"
                            required
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                        <input
                            type="text"
                            name="username"
                            placeholder="Choose a username"
                            className="w-full bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:outline-none p-4 rounded-2xl text-slate-900 transition-all font-medium"
                            required
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:outline-none p-4 rounded-2xl text-slate-900 transition-all font-medium"
                            required
                            onChange={handleChange}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-blue-600 transition-all hover:shadow-xl hover:shadow-blue-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating Account...
                            </>
                        ) : 'Create My Account'}
                    </button>

                    <p className="mt-8 text-center text-slate-500 font-medium">
                        Already have an account? <a href="/login" className="text-blue-600 hover:text-blue-700 font-bold border-b-2 border-transparent hover:border-blue-600 transition-all">Sign In</a>
                    </p>
                </form>
            </div>
        </div>
    );
}

