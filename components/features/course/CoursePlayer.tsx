'use client';

import { useState } from 'react';
import { CourseContent, Module } from '@/lib/moodle/index';
import { getAutoLoginUrlAction } from '@/app/(auth)/login/actions';

interface CoursePlayerProps {
    courseId: number;
    courseName?: string;
    sections: CourseContent[];
    token: string;
    privateToken: string;
}

export default function CoursePlayer({
    courseId,
    courseName,
    sections,
    token,
    privateToken
}: CoursePlayerProps) {
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [isLaunching, setIsLaunching] = useState(false);

    const handleLaunchActivity = async (module: Module) => {
        // Moodle content usually has a .url or we can construct it from the module id
        const targetUrl = module.url || `${process.env.NEXT_PUBLIC_MOODLE_URL}/mod/${module.modname}/view.php?id=${module.id}`;

        console.log("[Launch] Target URL:", targetUrl);

        // Open window immediately to prevent popup blocker
        const newWindow = window.open('about:blank', '_blank');
        if (!newWindow) {
            alert("Please allow popups for this site to launch activities.");
            return;
        }

        if (!privateToken) {
            newWindow.location.href = targetUrl;
            return;
        }

        setIsLaunching(true);
        try {
            const result = await getAutoLoginUrlAction(token || '', privateToken);
            // console.log("[Launch] Auth result:", result);

            if (result && result.url) {
                // Ensure correct parameter joining (should use & if it's already a full URL)
                const finalUrl = `${result.url}&urltogo=${encodeURIComponent(targetUrl)}`;
                newWindow.location.href = finalUrl;
            } else {
                newWindow.location.href = targetUrl;
            }
        } catch (e) {
            console.error("Launch Error:", e);
            newWindow.location.href = targetUrl;
        } finally {
            setIsLaunching(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
            {/* Sidebar */}
            <aside className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800 line-clamp-1" title={courseName}>
                        {courseName || `Course ${courseId}`}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">{sections.length} Sections</p>

                    <div className="flex space-x-2 mt-4">
                        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-1.5 px-3 rounded text-center transition-colors">
                            📊 Grades
                        </button>
                        <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-1.5 px-3 rounded text-center transition-colors">
                            👥 People
                        </button>
                    </div>
                </div>

                <div className="flex-1 py-2">
                    {sections.map((section) => (
                        <div key={section.id} className="mb-4">
                            <div className="px-4 py-2 bg-gray-100/50 border-y border-gray-200/50">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {section.name || `Section ${section.section}`}
                                </h3>
                            </div>
                            <ul className="mt-1">
                                {section.modules && section.modules.map((module) => (
                                    <li key={module.id}>
                                        <button
                                            onClick={() => setSelectedModule(module)}
                                            className={`w-full text-left px-4 py-3 flex items-start text-sm hover:bg-white hover:text-blue-600 transition-colors ${selectedModule?.id === module.id ? 'bg-white border-l-4 border-blue-600 text-blue-600 shadow-sm' : 'text-gray-700 border-l-4 border-transparent'}`}
                                        >
                                            <span className="mr-3 text-lg leading-none">
                                                {getIcon(module.modname)}
                                            </span>
                                            <span className="line-clamp-2">{module.name}</span>
                                        </button>
                                    </li>
                                ))}
                                {(!section.modules || section.modules.length === 0) && (
                                    <li className="px-4 py-2 text-xs text-gray-400 italic">No content</li>
                                )}
                            </ul>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50 p-8 flex flex-col items-center justify-center">
                {selectedModule ? (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-3xl w-full text-center">
                        <div className="text-6xl mb-6">{getIcon(selectedModule.modname)}</div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">{selectedModule.name}</h1>
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 mb-8 uppercase tracking-wide">
                            {selectedModule.modname} Activity
                        </div>

                        <div className="prose prose-blue mx-auto text-left w-full mb-8">
                            <p className="text-gray-600">
                                This activity is hosted on the LMS. Click below to open it securely.
                            </p>
                        </div>

                        <button
                            onClick={() => handleLaunchActivity(selectedModule)}
                            disabled={isLaunching}
                            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white ${isLaunching ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform ${!isLaunching && 'hover:scale-105'}`}
                        >
                            {isLaunching ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Authenticating...
                                </>
                            ) : (
                                <>Launch Activity &rarr;</>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <div className="bg-blue-50 text-blue-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                            📚
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Course!</h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Select a module from the sidebar to begin learning. Your progress is tracked automatically.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

function getIcon(modname: string) {
    switch (modname) {
        case 'quiz': return '📝';
        case 'resource': return '📄';
        case 'url': return '🔗';
        case 'forum': return '💬';
        case 'assign': return '📤';
        case 'page': return '📃';
        case 'folder': return '📂';
        default: return '📦';
    }
}
