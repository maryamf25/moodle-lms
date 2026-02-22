import { requireAppAuth } from "@/lib/auth/server-session";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default async function NotificationsPage() {
    const auth = await requireAppAuth();

    // Fetch user's notifications
    const notifications = await prisma.notification.findMany({
        where: { user: { moodleUserId: auth.moodleUserId } },
        orderBy: { createdAt: "desc" },
        take: 50, // Get up to 50 latest 
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Server action to mark all notifications as read
    async function markAllAsRead() {
        "use server";
        const sessionAuth = await requireAppAuth();
        await prisma.notification.updateMany({
            where: { user: { moodleUserId: sessionAuth.moodleUserId }, isRead: false },
            data: { isRead: true },
        });
        revalidatePath("/dashboard/notifications");
    }

    // Server action to mark a single notification as read and optional deep-linking redirect
    async function handleNotificationClick(formData: FormData) {
        "use server";
        const id = formData.get("id") as string;
        const actionUrl = formData.get("actionUrl") as string;

        if (id) {
            await prisma.notification.update({
                where: { id },
                data: { isRead: true },
            });
        }

        revalidatePath("/dashboard/notifications");

        if (actionUrl && actionUrl !== "null") {
            redirect(actionUrl);
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}.
                    </p>
                </div>

                {unreadCount > 0 && (
                    <form action={markAllAsRead}>
                        <button type="submit" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm">
                            Mark all as read
                        </button>
                    </form>
                )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">No notifications yet</h2>
                        <p className="text-slate-500">We'll let you know when something important happens.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notif) => (
                            <form action={handleNotificationClick} key={notif.id} className="block group">
                                <input type="hidden" name="id" value={notif.id} />
                                <input type="hidden" name="actionUrl" value={notif.actionUrl || "null"} />

                                <button type="submit" className={`w-full text-left p-6 transition-all hover:bg-slate-50 flex items-start gap-4 ${!notif.isRead ? 'bg-indigo-50/30' : 'bg-white'}`}>
                                    <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notif.isRead ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {notif.type === 'COURSE_UPDATE' ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        ) : notif.type === 'SYSTEM' ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-4">
                                            <h3 className={`font-bold truncate ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>{notif.title}</h3>
                                            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className={`mt-1 text-sm ${!notif.isRead ? 'text-slate-700' : 'text-slate-500'}`}>{notif.message}</p>

                                        {notif.actionUrl && (
                                            <span className="inline-block mt-3 text-sm font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                                                View Action &rarr;
                                            </span>
                                        )}
                                    </div>
                                    {!notif.isRead && (
                                        <div className="flex-shrink-0 self-center">
                                            <span className="block w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-sm shadow-indigo-200" />
                                        </div>
                                    )}
                                </button>
                            </form>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
