// Dashboard layout with sidebar navigation
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/moodle/user";
import DashboardSidebar from "../../components/DashboardSidebar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("moodle_token")?.value;

    if (!token) {
        redirect("/login");
    }

    let userProfile = null;
    const roleCookie = cookieStore.get("moodle_role")?.value;

    try {
        userProfile = await getUserProfile(token);
        if (userProfile && roleCookie) {
            userProfile.role = roleCookie as any;
        }
    } catch (e) {
        console.error("Dashboard layout profile fetch error:", e);
    }

    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-slate-50">
            {/* Sidebar - Fixed on desktop, scrollable content */}
            <DashboardSidebar userProfile={userProfile} token={token} />

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
                {children}
            </div>
        </div>
    );
}
