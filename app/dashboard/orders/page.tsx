'use client';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type OrderItem = { id: string; price: number; quantity: number; course: { fullname: string } };
type Order = { id: string; totalAmount: number; status: string; transactionId: string; createdAt: string; items: OrderItem[] };

const STATUS_STYLES: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    REFUNDED: 'bg-blue-100 text-blue-700',
    FAILED: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, string> = {
    COMPLETED: '✅',
    PENDING: '⏳',
    REFUNDED: '↩️',
    FAILED: '❌',
};

export default function OrderHistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/orders');
                const data = await res.json();
                if (data.success) setOrders(data.orders);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const downloadInvoice = (order: Order) => {
        const doc = new jsPDF();

        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("EDUMEUP LMS", 14, 20);
        doc.setFontSize(10);
        doc.text("INVOICE", 170, 20);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Order ID: ${order.id.substring(0, 8).toUpperCase()}`, 14, 45);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 52);
        doc.text(`Transaction Ref: ${order.transactionId || 'N/A'}`, 14, 59);
        doc.text(`Status: ${order.status}`, 14, 66);

        const tableColumn = ["Description", "Qty", "Unit Price", "Total"];
        const tableRows: any[] = [];

        order.items.forEach(item => {
            tableRows.push([
                item.course.fullname,
                item.quantity,
                `PKR ${Number(item.price).toLocaleString()}`,
                `PKR ${Number(item.price * item.quantity).toLocaleString()}`
            ]);
        });

        const tableResult = autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
        });

        const finalY = (tableResult as any)?.finalY || (doc as any).lastAutoTable?.finalY || 100;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Grand Total: PKR ${Number(order.totalAmount).toLocaleString()}`, 125, finalY + 15);
        doc.save(`Invoice_${order.id.substring(0, 8)}.pdf`);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">Loading order history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl shadow-lg text-white">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Order History</h1>
                        <p className="text-indigo-100 mt-1 font-medium">
                            {orders.length} order{orders.length !== 1 ? 's' : ''} found • Download invoices any time
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            {orders.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['COMPLETED', 'PENDING', 'REFUNDED', 'FAILED'] as const).map(status => {
                        const count = orders.filter(o => o.status === status).length;
                        return (
                            <div key={status} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-center">
                                <span className="text-2xl">{STATUS_ICONS[status]}</span>
                                <p className="text-2xl font-black text-slate-900 mt-1">{count}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{status}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-slate-100 text-center shadow-sm">
                    <span className="text-6xl mb-4 block">🧾</span>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Orders Yet</h3>
                    <p className="text-slate-400 font-medium">Your purchase history will appear here once you buy a course.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <span className="font-black text-slate-900 text-base">
                                        Order #{order.id.substring(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600'}`}>
                                        {STATUS_ICONS[order.status]} {order.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 font-medium mb-3">
                                    📅 {new Date(order.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    &nbsp;•&nbsp; 🧾 Ref: {order.transactionId ? order.transactionId.substring(0, 24) : 'N/A'}
                                </p>
                                <div className="space-y-1">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className="text-indigo-400">📚</span>
                                            <span className="font-medium truncate">{item.course.fullname}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-400 whitespace-nowrap">PKR {Number(item.price).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                                <p className="text-2xl font-black text-slate-900">
                                    PKR {Number(order.totalAmount).toLocaleString()}
                                </p>
                                <button
                                    onClick={() => downloadInvoice(order)}
                                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm flex items-center gap-2 w-full justify-center md:w-auto shadow-md shadow-indigo-200"
                                >
                                    📥 Download Invoice
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
