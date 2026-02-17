
import Link from "next/link";
import { cookies } from "next/headers";
import { getUserProfile } from "@/lib/moodle/user";
import { getUserSessionContext } from "@/lib/moodle/user";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";

import MoodleBackgroundLogin from "./MoodleBackgroundLogin";

export default async function Navbar() {
    const cookieStore = await cookies();
    const token = cookieStore.get("moodle_token")?.value;
    const privateToken = cookieStore.get("moodle_private_token")?.value;

    let userProfile = null;
    let cartCount = 0;

    if (token) {
        try {
            userProfile = await getUserProfile(token);
            // Get cart count for logged-in user
            const session = await getUserSessionContext(token);
            
            // Get the user's internal ID
            const user = await prisma.user.findUnique({
                where: { moodleUserId: session.userid },
            });

            if (user) {
                const cartItems = await prisma.cartItem.count({
                    where: { userId: user.id },
                });
                cartCount = cartItems;
            }
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
                                {/* Cart Icon */}
                                <Link
                                    href="/cart"
                                    className="relative text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                    title="Shopping Cart"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    {cartCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                            {cartCount > 99 ? '99+' : cartCount}
                                        </span>
                                    )}
                                </Link>

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
