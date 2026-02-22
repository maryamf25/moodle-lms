'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const [username, setUsername] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setStatus("loading");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setStatus("error");
                setMessage(data.error || "Failed to process request. Please try again.");
                return;
            }

            setStatus("success");
            setMessage("If this username or email exists in our system, you will receive password reset instructions via email shortly.");
            setUsername("");
        } catch (error) {
            console.error(error);
            setStatus("error");
            setMessage("An unexpected error occurred.");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-2 text-center text-blue-600">Reset Password</h1>
                <p className="text-sm text-gray-500 text-center mb-6">Enter your username or email address and we'll send you a link to reset your password.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {message && (
                        <div className={`p-4 rounded-md text-sm font-medium border ${status === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                            {message}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-blue-600">Username or Email</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full border p-2 rounded text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                            placeholder="e.g. sam123 or sam@example.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50"
                    >
                        {status === "loading" ? "Sending..." : "Send Reset Link"}
                    </button>

                    <div className="text-center mt-6 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500 font-medium">
                            Remember your password?{" "}
                            <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
