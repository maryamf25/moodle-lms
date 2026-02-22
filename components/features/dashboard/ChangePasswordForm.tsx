'use client';
import { useState } from 'react';

import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

export default function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (newPassword !== confirmPassword) {
            setStatus("error");
            setMessage("New passwords do not match.");
            return;
        }

        // Moodle Password Policy Validation
        if (newPassword.length < 8) {
            setStatus("error");
            setMessage("Password must be at least 8 characters long.");
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            setStatus("error");
            setMessage("Password must have at least 1 digit(s).");
            return;
        }
        if (!/[a-z]/.test(newPassword)) {
            setStatus("error");
            setMessage("Password must have at least 1 lower case letter(s).");
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            setStatus("error");
            setMessage("Password must have at least 1 upper case letter(s).");
            return;
        }
        if (!/[^a-zA-Z0-9]/.test(newPassword)) {
            setStatus("error");
            setMessage("Password must have at least 1 non-alphanumeric character(s) such as *, -, or #.");
            return;
        }

        setStatus("loading");

        try {
            const res = await fetch("/api/profile/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setStatus("error");
                setMessage(data.error || "Failed to change password. Make sure current password is correct.");
                return;
            }

            setStatus("success");
            setMessage("Password successfully updated! Please use your new password next time you login.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error(error);
            setStatus("error");
            setMessage("An unexpected error occurred.");
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm mt-8">
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">🔐</div>
                <h2 className="text-xl font-extrabold text-slate-900">Change Password</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {message && (
                    <div className={`p-4 rounded-2xl text-sm font-bold border ${status === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {message}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Current Password</label>
                    <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                        placeholder="Enter current password"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                            placeholder="Min 8 characters"
                        />
                        {newPassword.length > 0 && <PasswordStrengthIndicator password={newPassword} />}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                            placeholder="Repeat new password"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                        {status === "loading" ? "Updating..." : "Update Password"}
                    </button>
                </div>
            </form>
        </div>
    );
}
