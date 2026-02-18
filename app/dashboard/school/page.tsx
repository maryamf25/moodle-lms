import { requireAppAuth, getAppAuthContext } from '@/lib/auth/server-session';
import { prisma } from '@/lib/db/prisma';
import PurchaseForm from './PurchaseForm';
import AssignSeatForm from './AssignSeatForm';

export default async function SchoolDashboardPage() {
    await requireAppAuth('school');
    const session = await getAppAuthContext();

    // Safe models access to prevent runtime crashes during HMR/Prisma generation
    const prismaAny = prisma as any;

    // Fetch courses available for purchase
    const rawCourses = prismaAny.courseCatalog
        ? await prismaAny.courseCatalog.findMany({ where: { isVisible: true }, orderBy: { fullname: 'asc' } })
        : [];

    // Serialize courses (convert Decimal price to string for Client Components)
    const courses = rawCourses.map((c: any) => ({
        ...c,
        price: c.price?.toString() || '0'
    }));

    // Fetch school's existing licenses
    const rawLicenses = prismaAny.schoolLicense
        ? await prismaAny.schoolLicense.findMany({
            where: { schoolId: session?.moodleUserId },
            include: { assignments: true }
        })
        : [];

    // Serialize licenses for Client Components
    const licenses = rawLicenses.map((l: any) => ({
        ...l,
        purchaseDate: l.purchaseDate?.toISOString(),
        expiresAt: l.expiresAt?.toISOString() || null,
        assignments: l.assignments?.map((a: any) => ({
            ...a,
            assignedAt: a.assignedAt?.toISOString()
        })) || []
    }));

    if (!prismaAny.schoolLicense) {
        console.warn('CRITICAL: prisma.schoolLicense is undefined. Restart your dev server.');
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-blue-900 rounded-[2.5rem] p-10 text-white shadow-2xl">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black tracking-tight mb-2">School Management</h1>
                    <p className="text-blue-100 text-lg max-w-2xl opacity-80">
                        Manage your institution's learning resources, bulk licenses, and student seat assignments from one central hub.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Licenses & Assignments */}
                <div className="lg:col-span-2 space-y-12">
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Active Licenses</h2>
                            <span className="bg-blue-100 text-blue-700 font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest">
                                {licenses.length} Plans
                            </span>
                        </div>

                        {licenses.length === 0 ? (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                                <div className="text-4xl mb-4">🎟️</div>
                                <h3 className="font-bold text-slate-800">No licenses yet</h3>
                                <p className="text-slate-500 text-sm mt-1">Start by purchasing seats for a course below.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {licenses.map((license: any) => {
                                    const course = courses.find((c: any) => c.moodleCourseId === license.moodleCourseId);
                                    const progress = (license.usedSeats / license.totalSeats) * 100;

                                    return (
                                        <div key={license.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100">
                                                        <span className="text-2xl">📚</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-xl text-slate-900">{course?.fullname || 'Unknown Course'}</h3>
                                                        <p className="text-sm text-slate-400 font-medium">Course ID: {license.moodleCourseId}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-center">
                                                        <span className="block text-2xl font-black text-slate-900">{license.totalSeats}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Seats</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="block text-2xl font-black text-blue-600">{license.totalSeats - license.usedSeats}</span>
                                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Available</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-8">
                                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                                    <span>Seat Utilization</span>
                                                    <span>{license.usedSeats}/{license.totalSeats} Assigned ({Math.round(progress)}%)</span>
                                                </div>
                                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-1000 shadow-sm"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Quick Assign Form Component */}
                                            <AssignSeatForm licenseId={license.id} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Pending Assignments / Students list could go here */}
                </div>

                {/* Sidebar: Purchase New Seats Component */}
                <div className="space-y-8">
                    <PurchaseForm courses={courses} />

                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                            <p className="text-slate-400 text-sm mb-4 leading-relaxed">Contact our support team for customized enterprise plans and pricing.</p>
                            <button className="text-xs font-black uppercase tracking-widest bg-white text-slate-900 px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                                Contact Support
                            </button>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
