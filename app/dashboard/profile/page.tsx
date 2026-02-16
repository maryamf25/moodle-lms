import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFullUserProfile, getUserProfile } from "@/lib/moodle/user";
import { getUserId } from "@/app/(auth)/login/actions";

export default async function ProfilePage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("moodle_token")?.value;

    if (!token) redirect("/login");

    const roleCookie = cookieStore.get("moodle_role")?.value;
    let userDetails = null;
    let basicProfile = null;

    try {
        const userid = await getUserId(token);
        const [full, basic] = await Promise.all([
            getFullUserProfile(token, userid),
            getUserProfile(token)
        ]);
        userDetails = full;
        basicProfile = basic;

        if (basicProfile && roleCookie) {
            basicProfile.role = roleCookie as any;
        }
    } catch (e) {
        console.error("Profile load error:", e);
    }

    if (!userDetails) {
        return (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200">
                <p className="text-slate-500 font-bold">Failed to load profile details.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Profile Header Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-600 to-blue-500 opacity-10" />

                <div className="relative flex flex-col md:flex-row items-center gap-8 px-4">
                    <div className="h-32 w-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-100 bg-slate-50 shrink-0">
                        {userDetails.profileimageurl ? (
                            <img
                                src={`${userDetails.profileimageurl}${userDetails.profileimageurl.includes('?') ? '&' : '?'}token=${token}`}
                                alt={userDetails.fullname}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-indigo-50 text-indigo-500 font-bold text-4xl">
                                {userDetails.fullname.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="text-center md:text-left min-w-0">
                        <h1 className="text-3xl font-extrabold text-slate-900 truncate">{userDetails.fullname}</h1>
                        <p className="text-lg text-slate-500 font-medium">@{userDetails.username}</p>
                        <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest ring-1 ring-indigo-100 shadow-sm">
                                {basicProfile?.role || 'User'}
                            </span>
                            {userDetails.city && (
                                <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-bold ring-1 ring-slate-200 shadow-sm">
                                    📍 {userDetails.city}, {userDetails.country}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Personal Information */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">👤</div>
                            <h2 className="text-xl font-extrabold text-slate-900">Personal Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name</p>
                                <p className="text-base font-bold text-slate-700">{userDetails.firstname}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</p>
                                <p className="text-base font-bold text-slate-700">{userDetails.lastname}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                <p className="text-base font-bold text-slate-700">{userDetails.email || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Language</p>
                                <p className="text-base font-bold text-slate-700 uppercase">{userDetails.lang || 'en'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">📝</div>
                            <h2 className="text-xl font-extrabold text-slate-900">About Me</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed italic">
                            {userDetails.description ? (
                                <span dangerouslySetInnerHTML={{ __html: userDetails.description }} />
                            ) : (
                                "No description provided."
                            )}
                        </p>
                    </div>
                </div>

                {/* Account Stats / Sidebar */}
                <div className="space-y-8">
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 px-2">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">🔒</div>
                            <h2 className="text-xl font-extrabold text-slate-900">Account Status</h2>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moodle ID</p>
                                <p className="text-sm font-black text-slate-900">#{userDetails.id}</p>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timezone</p>
                                <p className="text-sm font-black text-slate-900">{userDetails.timezone === '99' ? 'Default' : userDetails.timezone}</p>
                            </div>
                            <div className="pt-4">
                                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Active Account</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
