'use client';

import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalyticsClientProps {
    initialLicenses: any[];
    schoolName: string;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsClient({ initialLicenses, schoolName }: AnalyticsClientProps) {
    const [licenses] = useState(initialLicenses);

    // Prepare data for visualizations
    const barData = initialLicenses.map(l => ({
        name: l.courseName || `Course ${l.moodleCourseId}`,
        total: l.totalSeats,
        assigned: l.usedSeats,
        remaining: l.totalSeats - l.usedSeats
    }));

    const pieData = [
        { name: 'Used Seats', value: licenses.reduce((sum, l) => sum + l.usedSeats, 0) },
        { name: 'Available Seats', value: licenses.reduce((sum, l) => sum + (l.totalSeats - l.usedSeats), 0) },
    ];

    const generatePDF = async () => {
        const doc = new jsPDF() as any;
        const date = new Date().toLocaleDateString();

        // Header Style
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('ANALYTICS REPORT', 14, 25);

        doc.setFontSize(10);
        doc.text(`INSTITUTION: ${schoolName.toUpperCase()}`, 14, 33);
        doc.text(`DATE: ${date}`, 170, 33);

        // Summary Stats
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(16);
        doc.text('Key Performance Indicators', 14, 55);

        const totalSeats = licenses.reduce((s, l) => s + l.totalSeats, 0);
        const assignedSeats = licenses.reduce((s, l) => s + l.usedSeats, 0);

        autoTable(doc, {
            startY: 60,
            head: [['Indicator', 'Status', 'Count']],
            body: [
                ['Total License Portfolio', 'Active', licenses.length.toString()],
                ['Total Capacity', 'Allocated', totalSeats.toString()],
                ['Current Enrollment', 'Active', assignedSeats.toString()],
                ['Seat Utilization', assignedSeats >= totalSeats ? 'Full' : 'Available', `${Math.round((assignedSeats / totalSeats) * 100)}%`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }
        });

        // Course Breakdown
        const courseBody = licenses.map(l => [
            l.courseName || `CID-${l.moodleCourseId}`,
            l.totalSeats.toString(),
            l.usedSeats.toString(),
            (l.totalSeats - l.usedSeats).toString(),
            `${Math.round((l.usedSeats / l.totalSeats) * 100)}%`
        ]);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Course Name', 'Total Seats', 'Assigned', 'Remaining', 'Utilization']],
            body: courseBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }
        });

        // Detailed Student Lists (NEW SECTION)
        doc.addPage();
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('DETAILED STUDENT ENROLLMENT & PROGRESS', 14, 13);

        let currentY = 30;

        licenses.forEach((license: any, index: number) => {
            // Course Sub-header
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(14);
            doc.text(`${index + 1}. ${license.courseName || 'Unnamed Course'}`, 14, currentY);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Moodle ID: ${license.moodleCourseId} | License: ${license.id.substring(0, 8)}...`, 14, currentY + 6);

            const studentData = (license.students || []).map((s: any) => [
                s.fullname,
                s.email,
                `${Math.round(s.progress)}%`,
                s.lastaccess > 0 ? new Date(s.lastaccess * 1000).toLocaleDateString() : 'Never'
            ]);

            autoTable(doc, {
                startY: currentY + 12,
                head: [['Student Name', 'Email Address', 'Progress', 'Last Access']],
                body: studentData.length > 0 ? studentData : [['-', 'No students assigned yet', '-', '-']],
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] },
                margin: { left: 14, right: 14 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 20;

            // Page break if near bottom
            if (currentY > 250 && index < licenses.length - 1) {
                doc.addPage();
                currentY = 20;
            }
        });

        doc.save(`${schoolName}_Full_Institution_Report_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Action Bar */}
            <div className="flex justify-end">
                <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:scale-105 transition-all text-sm"
                >
                    <span>📥</span> Download Detailed Report
                </button>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Seat Distribution Chart */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        Seat Allocation Overview
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{ fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar dataKey="assigned" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Assigned Seats" />
                                <Bar dataKey="remaining" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Available Seats" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Utilization Pie Chart */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Overall Utilization Rate
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {licenses.map((l, i) => (
                    <div key={l.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{l.courseName || `Course ${l.moodleCourseId}`}</p>
                            <h4 className="text-lg font-bold text-slate-900 mb-4">License Overview</h4>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-2xl font-black text-slate-900">{Math.round((l.usedSeats / l.totalSeats) * 100)}%</p>
                                <p className="text-xs text-slate-400 font-bold uppercase">Seat Utilization</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">
                                📈
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
