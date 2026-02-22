'use client';
import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Area, AreaChart, BarChart, Bar, Legend,
    PieChart, Pie, Cell,
} from 'recharts';

type Stats = { totalStudents: number; totalEnrollments: number; totalRevenue: number; totalOrders: number; completedOrders: number; pendingOrders: number; refundedOrders: number };
type Recent = { id: string; studentName: string; email: string; courseName: string; price: number; date: string };
type RecentOrder = { id: string; status: string; totalAmount: number; transactionId: string | null; createdAt: string; user: { email: string | null; firstName: string | null; lastName: string | null; username: string }; items: { course: { fullname: string } }[] };
type ChartData = { name: string; revenue: number; enrollments: number; tickets: number; newUsers: number; formSubmissions: number; orders: number };

export default function SystemAnalytics() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recent, setRecent] = useState<Recent[]>([]);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'enrollments' | 'orders'>('enrollments');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [analyticsRes, ordersRes] = await Promise.all([
                    fetch('/api/admin/analytics'),
                    fetch('/api/admin/orders'),
                ]);
                const analyticsData = await analyticsRes.json();
                const ordersData = await ordersRes.json();

                if (analyticsData.success) {
                    setStats({
                        ...analyticsData.stats,
                        totalOrders: ordersData.stats?.total || 0,
                        completedOrders: ordersData.stats?.completed || 0,
                        pendingOrders: ordersData.stats?.pending || 0,
                        refundedOrders: ordersData.stats?.refunded || 0,
                    });
                    setRecent(analyticsData.recentEnrollments);
                    setChartData(analyticsData.chartData || []);
                }
                if (ordersData.success) {
                    setRecentOrders(ordersData.orders.slice(0, 10));
                }
            } catch (error) {
                console.error('Error fetching analytics', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="p-8 text-slate-500 font-medium bg-white rounded-3xl border border-slate-200">Loading System Analytics...</div>;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Analytics</h2>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Overview of active students, platform revenue, and recent course purchases.</p>
                </div>
                <a
                    href="/api/admin/analytics/export"
                    download
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export CSV Report
                </a>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Total Active Students</p>
                    <h2 className="text-4xl font-black text-slate-900">{stats?.totalStudents || 0}</h2>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Course Enrollments</p>
                    <h2 className="text-4xl font-black text-slate-900">{stats?.totalEnrollments || 0}</h2>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 border-l-[6px] border-l-emerald-500">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Total System Revenue</p>
                    <h2 className="text-4xl font-black text-emerald-600">Rs {stats?.totalRevenue.toLocaleString() || 0}</h2>
                </div>
            </div>

            {/* Graphs Section */}
            {chartData && chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Revenue Area Chart */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6">Revenue Growth</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs ${v}`} width={60} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Users & Enrollments Line Chart */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6">Users & Enrollments</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={40} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                                    <Line type="monotone" dataKey="newUsers" name="New Registrations" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="enrollments" name="Course Enrollments" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Support Tickets & Form Submissions Bar Chart */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:col-span-2">
                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6">Support & Forms Activity</h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={8}>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={40} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                                    <Bar dataKey="tickets" name="Support Tickets" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Bar dataKey="formSubmissions" name="Form Submissions" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                {/* Pie Chart: Order Status Distribution */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6">Order Status Distribution</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Completed', value: stats?.completedOrders || 0 },
                                        { name: 'Pending', value: stats?.pendingOrders || 0 },
                                        { name: 'Refunded', value: stats?.refundedOrders || 0 },
                                        { name: 'Failed', value: (stats?.totalOrders || 0) - (stats?.completedOrders || 0) - (stats?.pendingOrders || 0) - (stats?.refundedOrders || 0) },
                                    ].filter(d => d.value > 0)}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {['#10b981', '#f59e0b', '#3b82f6', '#ef4444'].map((color, i) => (
                                        <Cell key={i} fill={color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number | undefined) => [value ?? 0, 'Orders']}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Center text */}
                    <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                        Total: {stats?.totalOrders || 0} Orders
                    </p>
                </div>

                {/* Bar Chart: Orders & Revenue over time (from recentOrders) */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-6">Orders & Revenue Over Time</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={(() => {
                                    // Group recentOrders by month
                                    const grouped: Record<string, { orders: number; revenue: number }> = {};
                                    recentOrders.forEach(o => {
                                        const month = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                                        if (!grouped[month]) grouped[month] = { orders: 0, revenue: 0 };
                                        grouped[month].orders += 1;
                                        if (o.status === 'COMPLETED') grouped[month].revenue += Number(o.totalAmount);
                                    });
                                    return Object.entries(grouped).map(([name, v]) => ({ name, ...v }));
                                })()}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                barGap={6}
                            >
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={35} />
                                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={55} tickFormatter={v => `Rs ${v}`} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                    formatter={(value: number | undefined, name: string | undefined) => [
                                        name === 'revenue' ? `PKR ${(value ?? 0).toLocaleString()}` : (value ?? 0),
                                        name === 'revenue' ? 'Revenue' : 'Orders'
                                    ]}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex gap-4">
                    <button
                        onClick={() => setActiveTab('enrollments')}
                        className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeTab === 'enrollments' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-600'
                            }`}
                    >
                        📋 Recent Enrollments
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-indigo-600'
                            }`}
                    >
                        🧾 Recent Orders
                    </button>
                </div>

                {activeTab === 'enrollments' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Student Name</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Course Name</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Pricing</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Purchase Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recent.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            {item.studentName} <br /><span className="text-xs text-slate-500 font-medium">{item.email}</span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-700">{item.courseName}</td>
                                        <td className="px-6 py-4 font-black text-emerald-600">Rs {item.price}</td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">{new Date(item.date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {recent.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No recent enrollments found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Order ID</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Course</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">#{order.id.substring(0, 10).toUpperCase()}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{[order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || order.user.username}</p>
                                            <p className="text-xs text-slate-400">{order.user.email}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 text-xs">{order.items[0]?.course.fullname || 'N/A'}</td>
                                        <td className="px-6 py-4 font-black text-emerald-600">PKR {Number(order.totalAmount).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                    order.status === 'REFUNDED' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>{order.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {recentOrders.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No orders found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
