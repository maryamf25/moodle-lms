
"use client";

import { useState } from "react";
import Link from "next/link";
import TeacherSSOLink from "./TeacherSSOLink";
import StudentListModal from "./StudentListModal";

interface Student {
    id: number;
    fullname: string;
    email: string;
    profileimageurl?: string;
    firstname?: string;
    lastname?: string;
}

interface TeacherCourseCardProps {
    course: {
        id: number;
        fullname: string;
        visible: number;
        overviewfiles?: { fileurl: string }[];
    };
    students: Student[];
    token: string;
    privateToken: string;
    moodleUrl: string;
}

export default function TeacherCourseCard({
    course,
    students,
    token,
    privateToken,
    moodleUrl,
}: TeacherCourseCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow group">
                <div className="sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        {course.overviewfiles && course.overviewfiles.length > 0 ? (
                            <div className="h-16 w-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                                <img
                                    src={`${course.overviewfiles[0].fileurl}?token=${token}`}
                                    alt={course.fullname}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="h-16 w-16 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl shrink-0">
                                {course.fullname.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {course.fullname}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${course.visible ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {course.visible ? 'Published' : 'Draft'}
                                </span>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                    👥 {students.length} Students
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 sm:mt-0 flex items-center gap-2">
                        <Link
                            href={`/course/${course.id}/learn`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                        >
                            View Player
                        </Link>
                        <TeacherSSOLink
                            token={token}
                            privateToken={privateToken}
                            label="Manage Enrollment"
                            targetUrl={`${moodleUrl}/user/index.php?id=${course.id}`}
                            className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50"
                        />
                        <TeacherSSOLink
                            token={token}
                            privateToken={privateToken}
                            label="Edit Content"
                            targetUrl={`${moodleUrl}/course/view.php?id=${course.id}`}
                            className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50"
                        />
                        <TeacherSSOLink
                            token={token}
                            privateToken={privateToken}
                            label="Grades"
                            targetUrl={`${moodleUrl}/grade/report/grader/index.php?id=${course.id}`}
                            className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50"
                        />
                    </div>
                </div>
            </div>

            <StudentListModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                courseName={course.fullname}
                students={students}
            />
        </>
    );
}
