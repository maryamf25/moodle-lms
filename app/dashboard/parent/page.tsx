import { requireAppAuth, getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';
import { getFullUserProfile } from '@/lib/moodle/user';
import { getStudentGrades } from '@/lib/moodle/grades';
import AddChildForm from './AddChildForm';
import ChildCard from './ChildCard';

export default async function ParentDashboardPage() {
    await requireAppAuth('parent');
    const session = await getAppAuthContext();

    // 1. Fetch linked children from DB
    const prismaAny = prisma as any;
    const links = await prismaAny.parentChild.findMany({
        where: { parentId: session?.moodleUserId }
    });

    // 2. Fetch Moodle data for each child
    const childrenData = await Promise.all(
        links.map(async (link: any) => {
            // Use Admin Token to bypass user-to-user privacy restrictions in Moodle
            const adminToken = process.env.MOODLE_ADMIN_TOKEN!;
            const profile = await getFullUserProfile(adminToken, link.childId);
            const grades = await getStudentGrades(link.childId);
            return {
                id: link.childId,
                fullname: profile?.fullname || 'Unknown Student',
                email: profile?.email || 'No email',
                grades: grades || []
            };
        })
    );

    return (
        <div className="max-w-7xl mx-auto space-y-10">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Parent Monitoring</h1>
                        <p className="mt-3 text-lg text-slate-500 font-medium max-w-xl">
                            Oversee your children&apos;s educational progress, track grades in real-time, and manage profiles directly linked to Moodle.
                        </p>
                    </div>
                    <div className="w-full md:w-96">
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Link New Child</h3>
                            <AddChildForm />
                        </div>
                    </div>
                </div>
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -tr-y-1/2 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -z-0"></div>
            </div>

            {/* Content Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        Linked Children
                        <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">{childrenData.length}</span>
                    </h2>
                </div>

                {childrenData.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354l1.1-.55a2 2 0 012.79 1.95v12.4a2 2 0 01-2.79 1.95L12 19.646l-1.1.55a2 2 0 01-2.79-1.95V5.754a2 2 0 012.79-1.95L12 4.354z"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No children linked yet</h3>
                        <p className="mt-2 text-slate-500 max-w-md mx-auto">
                            Enter your child&apos;s registered email above to start monitoring their grades and course progress.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {childrenData.map((child) => (
                            <ChildCard key={child.id} child={child} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
