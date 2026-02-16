
import Link from "next/link";
import { cookies } from "next/headers";
import { getUserProfile } from "@/lib/moodle/user";
import { redirect } from "next/navigation";

import MoodleBackgroundLogin from "./MoodleBackgroundLogin";

export default async function Navbar() {
    const cookieStore = await cookies();
    const token = cookieStore.get("moodle_token")?.value;
    const privateToken = cookieStore.get("moodle_private_token")?.value;

    let userProfile = null;
    if (token) {
        try {
            userProfile = await getUserProfile(token);
        } catch (e) {
            console.error("Navbar profile fetch error:", e);
        }
    }

    const logoutAction = async () => {
        "use server";
        const { cookies } = await import("next/headers");
        (await cookies()).delete("moodle_token");
        (await cookies()).delete("moodle_role");
        (await cookies()).delete("moodle_private_token");
        redirect("/login");
    };

    return (
        <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="text-2xl font-extrabold text-blue-600 tracking-tight">
                            EduMeUp<span className="text-gray-900">Clone</span>
                        </Link>
                    </div>

                    {/* Center Links (Desktop) */}
                    <div className="hidden md:flex space-x-8">
                        <Link href="/" className="text-gray-500 hover:text-blue-600 font-medium transition-colors">
                            Home
                        </Link>
                        <Link href="/#courses" className="text-gray-500 hover:text-blue-600 font-medium transition-colors">
                            Courses
                        </Link>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center space-x-4">
                        {token && userProfile ? (
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                                        {userProfile.fullname}
                                    </span>
                                    {userProfile.profileimageurlsmall && (
                                        <Link href="/dashboard" className="h-8 w-8 rounded-full overflow-hidden border border-gray-200 shadow-sm hover:ring-2 hover:ring-blue-100 transition-all block">
                                            <img
                                                src={`${userProfile.profileimageurlsmall}${userProfile.profileimageurlsmall.includes('?') ? '&' : '?'}token=${token}`}
                                                alt={userProfile.fullname}
                                                className="h-full w-full object-cover"
                                            />
                                        </Link>
                                    )}
                                </div>
                                <form action={logoutAction}>
                                    <button
                                        type="submit"
                                        className="text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-md text-sm font-medium"
                                    >
                                        Logout
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <Link
                                    href="/login"
                                    className="text-gray-600 hover:text-blue-600 font-medium px-3 py-2 transition-colors text-sm sm:text-base"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 sm:px-6 rounded-full shadow-md hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
