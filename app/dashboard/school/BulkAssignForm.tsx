'use client';

import { useState, useRef } from 'react';
import { bulkAssignSeatsAction } from './actions';

interface BulkAssignFormProps {
    licenseId: string;
    availableSeats: number;
}

export default function BulkAssignForm({ licenseId, availableSeats }: BulkAssignFormProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; summary?: any } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setResult(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            // Simple email extraction from CSV (assumes first column or comma separated)
            const emails = text
                .split(/\r?\n/)
                .map(line => line.split(',')[0].trim())
                .filter(email => email && email.includes('@') && email.length > 5);

            if (emails.length === 0) {
                setResult({ success: false, message: 'No valid emails found in CSV. Ensure emails are in the first column.' });
                setIsUploading(false);
                return;
            }

            if (emails.length > availableSeats) {
                setResult({
                    success: false,
                    message: `Limit exceeded. You have ${availableSeats} seats but CSV contains ${emails.length} emails.`
                });
                setIsUploading(false);
                return;
            }

            try {
                const response = await bulkAssignSeatsAction(licenseId, emails);
                setResult(response);
            } catch (err: any) {
                setResult({ success: false, message: 'Upload failed: ' + err.message });
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsText(file);
    };

    return (
        <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bulk Assignment</h4>
                <a href="#" onClick={(e) => {
                    e.preventDefault();
                    const blob = new Blob(['email\nstudent1@example.com\nstudent2@example.com'], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'seats_template.csv';
                    a.click();
                }} className="text-[10px] font-bold text-blue-600 hover:underline">Download Template</a>
            </div>

            <div className="relative group">
                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    disabled={isUploading || availableSeats <= 0}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${isUploading ? 'bg-slate-50 border-blue-200' : 'border-slate-200 group-hover:border-blue-400 group-hover:bg-blue-50/50'}`}>
                    {isUploading ? (
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-sm font-bold text-slate-600">Processing Batch... Please wait</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-2xl mb-2">📁</div>
                            <p className="text-sm font-bold text-slate-700">Upload CSV for Bulk Entry</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">Click or drag & drop CSV file</p>
                        </>
                    )}
                </div>
            </div>

            {result && (
                <div className={`mt-4 p-4 rounded-2xl border ${result.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-xs font-bold ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
                        {result.message}
                    </p>
                    {result.summary && (
                        <div className="mt-2 text-[10px] font-medium space-y-1">
                            <div className="flex justify-between text-emerald-700">
                                <span>Successfully Assigned:</span>
                                <span className="font-black">{result.summary.success}</span>
                            </div>
                            <div className="flex justify-between text-red-700">
                                <span>Failed/Skipped:</span>
                                <span className="font-black">{result.summary.failed}</span>
                            </div>
                            {result.summary.errors.length > 0 && (
                                <div className="mt-2 max-h-24 overflow-y-auto bg-white/50 p-2 rounded-lg border border-red-100">
                                    {result.summary.errors.map((err: string, i: number) => (
                                        <div key={i} className="text-red-600 py-0.5">• {err}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
