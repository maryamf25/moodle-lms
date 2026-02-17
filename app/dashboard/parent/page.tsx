import { requireAppAuth } from '@/lib/auth/server-session';

export default async function ParentDashboardPage() {
    await requireAppAuth('parent');

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Parent Dashboard</h1>
                <p className="mt-2 text-lg text-slate-500">Monitor your child&apos;s learning journey and alerts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Children Profiles</h2>
                    <p className="mt-2 text-sm text-slate-500">View linked student profiles and account details.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Progress & Grades</h2>
                    <p className="mt-2 text-sm text-slate-500">Track course completion, grades, and performance trends.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Alerts & Reports</h2>
                    <p className="mt-2 text-sm text-slate-500">Receive notifications and download progress reports.</p>
                </div>
            </div>
        </div>
    );
}
