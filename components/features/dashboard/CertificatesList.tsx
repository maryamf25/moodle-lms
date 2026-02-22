'use client';
import { useState, useEffect } from 'react';

type Certificate = {
  id: string;
  courseName: string;
  completedAt: string;
  grade: string;
  downloadUrl: string;
};

export default function CertificatesList() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const res = await fetch('/api/student/certificates');
        const data = await res.json();
        if (data.success) {
          setCertificates(data.certificates);
        }
      } catch (error) {
        console.error('Error fetching certificates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, []);

  if (loading) return <div className="p-8 text-slate-500 font-bold text-center animate-pulse">Loading certificates...</div>;

  if (certificates.length === 0) {
    return (
        <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <span className="text-4xl mb-4 block">🏆</span>
            <p className="text-slate-400 font-bold">No certificates earned yet. Keep learning!</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {certificates.map((cert) => (
        <div key={cert.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-6 bg-emerald-50 rounded-3xl border border-emerald-100 border-l-8 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow gap-4">
            <div className="flex items-center gap-4">
                <div className="text-4xl">🏅</div>
                <div className="min-w-0">
                    <p className="text-base font-black text-slate-900 line-clamp-2 leading-tight">{cert.courseName}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {new Date(cert.completedAt).toLocaleDateString()}
                        </p>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase">Grade: {cert.grade}</span>
                    </div>
                </div>
            </div>
            <a
                href={cert.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center justify-center text-emerald-600 bg-white border border-emerald-200 hover:bg-emerald-600 hover:text-white font-black text-xs px-4 py-2.5 rounded-xl uppercase tracking-widest transition-colors shadow-sm"
            >
                Get Certificate
            </a>
        </div>
      ))}
    </div>
  );
}
