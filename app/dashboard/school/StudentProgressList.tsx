
'use client';

import { useState, useEffect } from 'react';

interface StudentProgress {
    id: number;
    fullname: string;
    email: string;
    progress: number;
    grade: string | number;
    lastaccess: number;
}

export default function StudentProgressList({
    courseId,
    assignedStudentIds
}: {
    courseId: number,
    assignedStudentIds: number[]
}) {
    const [students, setStudents] = useState<StudentProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProgress() {
            if (assignedStudentIds.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // We'll use a server action or a helper to fetch these details efficiently
                const response = await fetch(`/api/school/student-progress?courseId=${courseId}&studentIds=${assignedStudentIds.join(',')}`);
                const data = await response.json();
                setStudents(data);
            } catch (error) {
                console.error("Failed to fetch student progress", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProgress();
    }, [courseId, assignedStudentIds]);

    if (loading) return (
        <div className="mt-6 flex items-center gap-3 animate-pulse">
            <div className="h-4 w-4 bg-slate-200 rounded-full"></div>
            <div className="h-3 w-32 bg-slate-200 rounded-lg"></div>
        </div>
    );

    if (students.length === 0) return null;

    return (
        <div className="mt-10 border-t border-slate-100 pt-8">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Assigned Students Progress
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map((student) => (
                    <div key={student.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                                    {student.fullname.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{student.fullname}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{student.email}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-black text-blue-600">{Math.round(student.progress)}%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-1000 group-hover:bg-indigo-500"
                                    style={{ width: `${student.progress}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-slate-400">Current Grade</span>
                                <span className={`px-2 py-0.5 rounded ${parseFloat(student.grade.toString()) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {student.grade || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
