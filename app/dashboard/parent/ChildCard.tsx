'use client';

import { useActionState } from 'react';
import { unlinkChildAction } from './actions';

interface ChildCardProps {
    child: {
        id: number;
        fullname: string;
        email: string;
        grades: any[];
    }
}

export default function ChildCard({ child }: ChildCardProps) {
    const [state, action, isPending] = useActionState(() => unlinkChildAction(child.id), null);

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{child.fullname}</h3>
                        <p className="text-sm text-slate-500 font-medium">{child.email}</p>
                    </div>
                    <form action={action}>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                        >
                            {isPending ? 'Unlinking...' : 'Unlink'}
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                        Course Progress
                    </h4>

                    {child.grades.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-sm text-slate-400 font-medium">No enrolled courses found.</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {child.grades.map((item) => (
                                <div key={item.courseId} className="group">
                                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                                        <span className="truncate pr-4">{item.courseName}</span>
                                        <span className="text-indigo-600">{Math.round(item.progress)}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${item.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Current Grade</span>
                                        <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${parseFloat(item.grade) > 80 ? 'bg-emerald-100 text-emerald-700' :
                                                parseFloat(item.grade) > 50 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-200 text-slate-700'
                                            }`}>
                                            {item.grade}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center">
                <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                    Download Report
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                </button>
                <span className="text-[10px] text-slate-400 font-medium italic">Auto-syncs with Moodle</span>
            </div>
        </div>
    );
}
