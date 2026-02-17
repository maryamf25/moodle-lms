// Dashboard layout with sidebar navigation
import { requireAppAuth } from "@/lib/auth/server-session";
import { getUserProfile } from "@/lib/moodle/user";
import DashboardSidebar from "../../components/DashboardSidebar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const auth = await requireAppAuth();
    const token = auth.token;

    let userProfile = null;

    try {
        userProfile = await getUserProfile(token);
        if (userProfile) {
            userProfile.role = auth.role;
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
