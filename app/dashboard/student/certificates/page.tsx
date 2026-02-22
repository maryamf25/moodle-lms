import { requireAppAuth } from "@/lib/auth/server-session";
import CertificatesList from '@/components/features/dashboard/CertificatesList';

export default async function StudentCertificatesPage() {
    // Only allow students to view this page
    await requireAppAuth('student');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        My Certificates 🎓
                    </h1>
                    <p className="mt-3 text-lg text-slate-500 font-medium">
                        View and download certificates for your completed courses.
                    </p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] opacity-40 -mr-20 -mt-20"></div>
            </div>

            <section className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                <CertificatesList />
            </section>
        </div>
    );
}
