'use client';
import { useState } from 'react';
import { registerUser } from '@/lib/moodle';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        firstname: '',
        lastname: '',
        email: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await registerUser(formData);
            setSuccess(true);
            // Optional: Redirect to login after short delay
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            setError('Registration failed: ' + (err.message || 'Unknown error'));
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
                    <p>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Register</h1>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                {['username', 'password', 'firstname', 'lastname', 'email'].map((field) => (
                    <div className="mb-4" key={field}>
                        <label className="block text-sm font-medium mb-1 capitalize">{field}</label>
                        <input
                            type={field === 'password' || field === 'email' ? field : 'text'}
                            name={field}
                            className="w-full border p-2 rounded"
                            required
                            onChange={handleChange}
                        />
                    </div>
                ))}

                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                    Create Account
                </button>

                <p className="mt-4 text-center text-sm">
                    Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
                </p>
            </form>
        </div>
    );
}
