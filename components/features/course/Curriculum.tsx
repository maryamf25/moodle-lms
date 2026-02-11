import Link from 'next/link';
import { CourseContent } from '@/lib/moodle/index';

interface CurriculumProps {
    sections: CourseContent[];
    isEnrolled: boolean;
    courseId: number;
}

export default function Curriculum({ sections, isEnrolled, courseId }: CurriculumProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4">Course Curriculum</h2>
            <div className="space-y-4">
                {sections.map((section) => (
                    <div key={section.id} className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors">
                        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center cursor-default">
                            <h3 className="font-semibold text-gray-800">{section.name || `Section ${section.section}`}</h3>
                            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {section.modules?.length || 0} Lessons
                            </span>
                        </div>
                        {/* Module List (Preview) */}
                        <ul className="divide-y divide-gray-100">
                            {section.modules && section.modules.map(mod => (
                                <li key={mod.id} className="px-6 py-3 flex items-center justify-between text-sm group hover:bg-blue-50/50 transition-colors">
                                    <div className="flex items-center text-gray-600">
                                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100 transition-opacity">
                                            {mod.modname === 'quiz' ? '📝' : mod.modname === 'assign' ? '📤' : '📄'}
                                        </span>
                                        <span className="group-hover:text-blue-700 font-medium transition-colors">{mod.name}</span>
                                    </div>
                                    {isEnrolled ? (
                                        <Link href={`/course/${courseId}/learn`} className="text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all">
                                            View &rarr;
                                        </Link>
                                    ) : (
                                        <span className="text-gray-400">🔒</span>
                                    )}
                                </li>
                            ))}
                            {(!section.modules || section.modules.length === 0) && (
                                <li className="px-6 py-3 text-xs text-gray-400 italic">No content in this section.</li>
                            )}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
