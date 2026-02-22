'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const pathname = usePathname();

    // API se unread count fetch karein
    useEffect(() => {
        let isMounted = true;
        const fetchNotifications = async () => {
            try {
                const res = await fetch('/api/notifications');
                const data = await res.json();
                if (data.success && isMounted) {
                    const unread = data.notifications.filter((n: any) => !n.isRead).length;
                    setUnreadCount(unread);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };
        fetchNotifications();

        // Option: Poll every 30 seconds for new notifications
        const intervalId = setInterval(fetchNotifications, 30000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [pathname]); // Refresh when pathname changes (e.g. after marking as read on the page)

    const isActive = pathname === "/dashboard/notifications";

    return (
        <Link
            href="/dashboard/notifications"
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all w-full ${isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                }`}
        >
            <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="truncate">Notifications</span>
            </div>

            {unreadCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'}`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
