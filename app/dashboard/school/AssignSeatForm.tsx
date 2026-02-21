'use client';

import { useActionState } from 'react';
import { assignSeatAction } from './actions';

export default function AssignSeatForm({ licenseId }: { licenseId: string }) {
    const [state, formAction, isPending] = useActionState(
        assignSeatAction,
        null
    );

    return (
        <div className="bg-slate-50 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-800 mb-4">Quick Assign Seat</h4>
            <form action={formAction} className="flex flex-col sm:flex-row gap-3">
                <input type="hidden" name="licenseId" value={licenseId} />
                <input
                    type="email"
                    name="email"
                    placeholder="student@example.com"
                    required
                    suppressHydrationWarning={true}
                    className="flex-grow bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="bg-slate-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors text-sm whitespace-nowrap disabled:opacity-50"
                >
                    {isPending ? 'Assigning...' : 'Assign Seat'}
                </button>
            </form>

            {state?.message && (
                <div className={`mt-3 p-3 rounded-xl text-[10px] font-bold ${state.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {state.message}
                </div>
            )}

            <p className="text-[10px] text-slate-400 mt-2 px-2">
                Student must already have an account in the system to be assigned.
            </p>
        </div>
    );
}
