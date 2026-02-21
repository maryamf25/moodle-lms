'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SchoolAnalyticsProps {
    licenses: any[];
    schoolName: string;
}

export default function SchoolAnalytics({ licenses, schoolName }: SchoolAnalyticsProps) {
    const totalSeats = licenses.reduce((acc, curr) => acc + curr.totalSeats, 0);
    const usedSeats = licenses.reduce((acc, curr) => acc + curr.usedSeats, 0);
    const utilizationRate = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
    const totalLicenses = licenses.length;

    const downloadFullReport = async () => {
        const doc = new jsPDF() as any;
        const date = new Date().toLocaleDateString();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('Institution Progress Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Institution: ${schoolName}`, 14, 30);
        doc.text(`Generated on: ${date}`, 14, 35);

        // Summary Stats
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 40, 196, 40);

        doc.setFontSize(14);
        doc.setTextColor(51, 65, 85);
        doc.text('Executive Summary', 14, 50);

        const summaryData = [
            ['Total Course Licenses', totalLicenses.toString()],
            ['Total Seats Purchased', totalSeats.toString()],
            ['Total Seats Assigned', usedSeats.toString()],
            ['Utilization Rate', `${utilizationRate}%`],
        ];

        autoTable(doc, {
            startY: 55,
            head: [['Metric', 'Value']],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // blue-500
        });

        // License Details
        const nextY = (doc as any).lastAutoTable.finalY + 15;
        doc.text('License Breakdown', 14, nextY);

        const licenseData = licenses.map(l => [
            l.id.substring(0, 8),
            `Course ID: ${l.moodleCourseId}`,
            l.totalSeats.toString(),
            l.usedSeats.toString(),
            `${Math.round((l.usedSeats / l.totalSeats) * 100)}%`
        ]);

        autoTable(doc, {
            startY: nextY + 5,
            head: [['License ID', 'Course', 'Total Seats', 'Assigned', 'Usage']],
            body: licenseData,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }, // slate-800
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Elite Solutions LMS - Confidential Report - Page ${i} of ${pageCount}`, 14, 285);
        }

        doc.save(`${schoolName.replace(/\s+/g, '_')}_Progress_Report.pdf`);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Licenses</p>
                <h4 className="text-2xl font-black text-slate-900">{totalLicenses}</h4>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Enrollment Rate</p>
                <h4 className="text-2xl font-black text-blue-600">{utilizationRate}%</h4>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Seats</p>
                <h4 className="text-2xl font-black text-slate-900">{totalSeats}</h4>
            </div>
            <div className="bg-indigo-600 p-1 rounded-3xl shadow-lg shadow-indigo-100 flex items-center justify-center">
                <button
                    onClick={downloadFullReport}
                    className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-[1.4rem] transition-colors flex flex-col items-center justify-center p-4"
                >
                    <span className="text-lg">📊</span>
                    <span className="text-[10px] uppercase tracking-tighter">Download PDF Report</span>
                </button>
            </div>
        </div>
    );
}
