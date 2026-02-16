
"use client";

import { Fragment } from "react";

interface Student {
    id: number;
    fullname: string;
    email: string;
    profileimageurl?: string;
    firstname?: string;
    lastname?: string;
}

interface StudentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseName: string;
    students: Student[];
}

export default function StudentListModal({
    isOpen,
    onClose,
    courseName,
    students,
}: StudentListModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />

                {/* Modal Content */}
                <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                    <div className="bg-white px-6 py-8 sm:p-10">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">
                                    Enrolled Students
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">
                                    {courseName} • {students.length} Learners
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {students.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <p className="text-slate-400 font-medium">No students enrolled in this course yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {students.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all group"
                                        >
                                            <div className="h-12 w-12 rounded-full overflow-hidden bg-white border-2 border-slate-200 group-hover:border-indigo-100 shrink-0">
                                                {student.profileimageurl ? (
                                                    <img src={student.profileimageurl} alt={student.fullname} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-sm font-bold text-indigo-300">
                                                        {student.firstname?.charAt(0)}{student.lastname?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                    {student.fullname}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                                    {student.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-4 flex justify-end">
                        <button
                            type="button"
                            className="inline-flex justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
