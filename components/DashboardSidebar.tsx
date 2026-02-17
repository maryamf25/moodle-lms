"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserProfile } from "@/lib/moodle/types";

interface DashboardSidebarProps {
    userProfile: UserProfile | null;
    token: string;
}

export default function DashboardSidebar({ userProfile, token }: DashboardSidebarProps) {
    const pathname = usePathname();

    const menuItems = [
        {
            name: "Dashboard",
            href: "/dashboard",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
        },
        {
            name: "Profile",
            href: "/dashboard/profile", // Add real profile link later if available
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
        ...(userProfile?.role === "admin"
            ? [{
                name: "Admin Management",
                href: "/dashboard/admin",
                icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
            }]
            : []),
    ];

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 fixed top-16 bottom-0 left-0 z-30 shadow-sm">
            <div className="flex-1 overflow-y-auto py-8 px-4">
                {/* User Brief Info */}
                <div className="mb-10 px-2 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm">
                        {userProfile?.profileimageurl ? (
                            <img
                                src={`${userProfile.profileimageurl}${userProfile.profileimageurl.includes('?') ? '&' : '?'}token=${token}`}
                                alt={userProfile.fullname}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold">
                                {userProfile?.fullname.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{userProfile?.fullname}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{userProfile?.role}</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = item.name === "Dashboard"
                            ? (
                                pathname === "/dashboard" ||
                                pathname.startsWith("/dashboard/student") ||
                                pathname.startsWith("/dashboard/parent") ||
                                pathname.startsWith("/dashboard/school")
                            )
                            : pathname === item.href;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                                    }`}
                            >
                                {item.icon}
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-slate-50">
                <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Support</p>
                    <p className="text-xs text-slate-500 text-center">Need help? Contact our support team for assistance.</p>
                </div>
            </div>
        </aside>
    );
}
