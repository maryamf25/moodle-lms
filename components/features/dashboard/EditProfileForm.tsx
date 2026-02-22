"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EditProfileFormProps {
    initialData: {
        firstname: string;
        lastname: string;
        email: string;
        city: string;
        country: string;
        phone1: string;
        description: string;
    };
}

export default function EditProfileForm({ initialData }: EditProfileFormProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(initialData);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/profile/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert("Failed to update profile.");
            }
        } catch (error) {
            console.error("Error updating profile", error);
            alert("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-6 bg-indigo-50 text-indigo-600 font-bold px-6 py-3 rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-300"
            >
                Edit Profile Details
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Edit Profile</h3>
                <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                    Cancel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">First Name</label>
                    <input
                        type="text"
                        name="firstname"
                        value={formData.firstname || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Last Name</label>
                    <input
                        type="text"
                        name="lastname"
                        value={formData.lastname || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                    <input
                        type="text"
                        name="phone1"
                        value={formData.phone1 || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        placeholder="+1 234 567 890"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">City</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Country</label>
                    <input
                        type="text"
                        name="country"
                        value={formData.country || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                </div>
            </div>

            <div className="space-y-1 pb-4 border-b border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">About Me (Bio)</label>
                <textarea
                    name="description"
                    value={formData.description || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-32 resize-none"
                    placeholder="Tell us a bit about yourself..."
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-900 transition-all duration-300 shadow-md shadow-indigo-200 disabled:opacity-50"
            >
                {loading ? "Saving Changes..." : "Save Profile Details"}
            </button>
        </form>
    );
}
