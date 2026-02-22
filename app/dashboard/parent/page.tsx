'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AddChildForm from './AddChildForm';

type Course = {
    id: string;
    courseName: string;
    progress: number;
    grade: string;
    percentage: number;
    lastUpdated: string
};
type Child = {
    id: string;
    moodleUserId: number;
    name: string;
    email: string;
    courses: Course[]
};

// Colors for the bar chart
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ParentDashboardPage() {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChildrenData = async () => {
            try {
                const res = await fetch('/api/parent/children-progress');
                const data = await res.json();
                if (data.success) {
                    setChildren(data.children);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchChildrenData();
    }, []);

    const downloadPDFReport = (child: Child) => {
        const doc = new jsPDF();

        // Theme colors
        const primaryColor: [number, number, number] = [30, 64, 175]; // Blue
        const textDark: [number, number, number] = [31, 41, 55]; // Gray-800

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('ACADEMIC REPORT CARD', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Official Progress Record', 105, 30, { align: 'center' });

        // Student Info
        doc.setTextColor(...textDark);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Student Details', 14, 55);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${child.name}`, 14, 65);
        doc.text(`Email: ${child.email}`, 14, 72);
        doc.text(`Moodle ID: ${child.moodleUserId}`, 14, 79);
        doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 140, 65);

        // Line separator
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 85, 196, 85);

        // Prepare table data
        const tableData = child.courses.map((c, i) => [
            i + 1,
            c.courseName,
            `${Math.round(c.progress)}%`,
            `${Math.round(c.percentage)}%`,
            c.grade !== 'N/A' && c.grade !== '-' ? c.grade : 'Not Graded'
        ]);

        // Table
        autoTable(doc, {
            startY: 95,
            head: [['#', 'Course Name', 'Progress (%)', 'Raw Score (%)', 'Final Grade']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: { fillColor: [249, 250, 251] }, // Gray-50
            styles: {
                font: 'helvetica',
                fontSize: 10,
                cellPadding: 5
            }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setTextColor(156, 163, 175);
        doc.text('This is an auto-generated report from the Moodle LMS System.', 105, finalY, { align: 'center' });

        // Save
        doc.save(`${child.name.replace(/\s+/g, '_')}_Result_Card.pdf`);
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h1 className="text-4xl font-extrabold mb-3 tracking-tight">Parent Dashboard</h1>
                        <p className="text-blue-100 text-lg opacity-90 max-w-2xl">
                            Monitor your children's real-time academic progress directly fetched from Moodle and generate official PDF result cards.
                        </p>
                    </div>
                    <div className="w-full md:w-96 text-gray-900">
                        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Link New Child</h3>
                            <AddChildForm />
                        </div>
                    </div>
                </div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 hidden md:block"></div>
            </div>

            {children.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
                    <div className="mx-auto w-24 h-24 mb-6 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354l1.1-.55a2 2 0 012.79 1.95v12.4a2 2 0 01-2.79 1.95L12 19.646l-1.1.55a2 2 0 01-2.79-1.95V5.754a2 2 0 012.79-1.95L12 4.354z"></path></svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">No Children Linked</h3>
                    <p className="text-gray-500 max-w-md mx-auto">You haven't linked any children to your account yet. Please add a child using their Moodle ID.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {children.map((child) => (
                        <div key={child.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden transform transition hover:-translate-y-1 duration-300">

                            {/* Child Header */}
                            <div className="bg-white px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md">
                                        {child.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{child.name}</h2>
                                        <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                            {child.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Download PDF Button */}
                                <button
                                    onClick={() => downloadPDFReport(child)}
                                    className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                    <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Generate Result Card (PDF)
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                                {/* Courses Table / List */}
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <span className="w-2 h-6 bg-blue-600 rounded-full inline-block"></span>
                                        Enrolled Courses & Grades
                                    </h3>

                                    {child.courses.length === 0 ? (
                                        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
                                            <p className="text-gray-500 font-medium">Not enrolled in any courses yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {child.courses.map((course, idx) => (
                                                <div key={course.id} className="group bg-white border border-gray-100 hover:border-blue-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{course.courseName}</h4>
                                                            <p className="text-xs text-gray-400 mt-1 font-medium">Raw Percentage: {Math.round(course.percentage)}%</p>
                                                        </div>
                                                        <div className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-lg text-sm border border-blue-100 shadow-sm">
                                                            {course.grade !== 'N/A' && course.grade !== '-' ? `Grade: ${course.grade}` : 'Pending'}
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar inside Card */}
                                                    <div className="w-full">
                                                        <div className="flex justify-between text-xs font-bold mb-1.5">
                                                            <span className="text-gray-600">Course Progress</span>
                                                            <span className={course.progress === 100 ? "text-green-600" : "text-blue-600"}>{Math.round(course.progress)}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${course.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                                style={{ width: `${course.progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Progress Chart */}
                                {child.courses.length > 0 && (
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                            <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block"></span>
                                            Progress Visualization
                                        </h3>
                                        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={child.courses}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                                    <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                                    <YAxis
                                                        dataKey="courseName"
                                                        type="category"
                                                        width={120}
                                                        stroke="#6b7280"
                                                        fontSize={11}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                                                    />
                                                    <Tooltip
                                                        cursor={{ fill: '#f3f4f6' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                        formatter={(value: any) => [`${Math.round(Number(value))}%`, 'Progress']}
                                                    />
                                                    <Bar
                                                        dataKey="progress"
                                                        radius={[0, 8, 8, 0]}
                                                        barSize={32}
                                                        animationDuration={1500}
                                                    >
                                                        {child.courses.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
