'use client';
import { useState, useEffect, useCallback } from 'react';

type OrderItem = { id: string; price: number; quantity: number; course: { fullname: string; moodleCourseId: number } };
type OrderUser = { id: string; email: string | null; firstName: string | null; lastName: string | null; username: string; moodleUserId: number };
type Order = { id: string; totalAmount: number; status: string; transactionId: string | null; paymentMethod: string; createdAt: string; user: OrderUser; items: OrderItem[] };
type Stats = { total: number; completed: number; pending: number; refunded: number; failed: number; totalRevenue: number };

const STATUS_STYLES: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
    REFUNDED: 'bg-blue-100 text-blue-700 border border-blue-200',
    FAILED: 'bg-red-100 text-red-700 border border-red-200',
};

const STATUS_ICONS: Record<string, string> = {
    COMPLETED: '✅', PENDING: '⏳', REFUNDED: '↩️', FAILED: '❌',
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const url = filterStatus ? `/api/admin/orders?status=${filterStatus}` : '/api/admin/orders';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setOrders(data.orders);
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch admin orders:', err);
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch('/api/admin/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: newStatus }),
            });
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
                if (stats) {
                    const old = orders.find(o => o.id === orderId);
                    if (old) {
                        setStats(prev => prev ? {
                            ...prev,
                            [old.status.toLowerCase()]: prev[old.status.toLowerCase() as keyof Stats] as number - 1,
                            [newStatus.toLowerCase()]: prev[newStatus.toLowerCase() as keyof Stats] as number + 1,
                        } : prev);
                    }
                }
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = orders.filter(o => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            o.id.toLowerCase().includes(term) ||
            (o.user.email || '').toLowerCase().includes(term) ||
            o.user.username.toLowerCase().includes(term) ||
            (o.transactionId || '').toLowerCase().includes(term) ||
            o.items.some(i => i.course.fullname.toLowerCase().includes(term))
        );
    });

    const getUserName = (user: OrderUser) =>
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-2xl">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Orders Management</h1>
                        <p className="text-slate-300 mt-1">All course purchases • Manage payment statuses & refunds</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="col-span-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                        <p className="text-3xl font-black">PKR {stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-indigo-200 text-xs mt-1">{stats.total} total orders</p>
                    </div>
                    {[
                        { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
                        { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏳' },
                        { label: 'Refunded', value: stats.refunded, color: 'text-blue-600', bg: 'bg-blue-50', icon: '↩️' },
                        { label: 'Failed', value: stats.failed, color: 'text-red-600', bg: 'bg-red-50', icon: '❌' },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-slate-100 shadow-sm text-center`}>
                            <span className="text-2xl">{s.icon}</span>
                            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="🔍  Search by user, course, order ID, transaction..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                    <option value="">All Statuses</option>
                    <option value="COMPLETED">✅ Completed</option>
                    <option value="PENDING">⏳ Pending</option>
                    <option value="REFUNDED">↩️ Refunded</option>
                    <option value="FAILED">❌ Failed</option>
                </select>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3">
                        <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-slate-500 font-medium">Loading orders...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="text-5xl mb-3 block">🧾</span>
                        <p className="text-slate-500 font-medium">No orders found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Order</th>
                                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Customer</th>
                                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Course(s)</th>
                                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Amount</th>
                                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-black text-slate-800 font-mono text-xs">#{order.id.substring(0, 10).toUpperCase()}</p>
                                            <p className="text-slate-400 text-xs mt-0.5">{order.paymentMethod}</p>
                                            {order.transactionId && (
                                                <p className="text-slate-300 text-[10px] font-mono mt-0.5 truncate max-w-[120px]">{order.transactionId}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-slate-700">{getUserName(order.user)}</p>
                                            <p className="text-slate-400 text-xs">{order.user.email || 'N/A'}</p>
                                            <p className="text-slate-300 text-[10px]">@{order.user.username}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            {order.items.map(item => (
                                                <div key={item.id} className="text-slate-600 text-xs mb-0.5">
                                                    📚 <span className="font-medium">{item.course.fullname}</span>
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-black text-slate-900 text-base">
                                                PKR {Number(order.totalAmount).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                                                {STATUS_ICONS[order.status]} {order.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                                            {new Date(order.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-4">
                                            <select
                                                value={order.status}
                                                disabled={updatingId === order.id}
                                                onChange={e => updateStatus(order.id, e.target.value)}
                                                className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                                            >
                                                <option value="COMPLETED">✅ Completed</option>
                                                <option value="PENDING">⏳ Pending</option>
                                                <option value="REFUNDED">↩️ Refunded</option>
                                                <option value="FAILED">❌ Failed</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">Showing {filtered.length} of {orders.length} orders</p>
        </div>
    );
}
