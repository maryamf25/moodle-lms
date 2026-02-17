import { requireAppAuth } from '@/lib/auth/server-session';

export default async function SchoolDashboardPage() {
    await requireAppAuth('school');

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">School Dashboard</h1>
                <p className="mt-2 text-lg text-slate-500">Manage bulk licenses, seats, students, and usage reports.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Bulk Licenses</h2>
                    <p className="mt-2 text-sm text-slate-500">Purchase and manage organization license plans.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">Seat Assignment</h2>
                    <p className="mt-2 text-sm text-slate-500">Assign and revoke seats for student accounts.</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">CSV & Reports</h2>
                    <p className="mt-2 text-sm text-slate-500">Upload students via CSV and generate usage reports.</p>
                </div>
            </div>
        </div>
    );
}
