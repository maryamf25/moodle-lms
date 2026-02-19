'use client';

import { useActionState, useEffect } from 'react';
import { linkChildAction } from './actions';

export default function AddChildForm() {
    const [state, action, isPending] = useActionState(linkChildAction, null);

    return (
        <form action={action} className="space-y-4">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Student Email Address
                </label>
                <div className="flex gap-2">
                    <input
                        type="email"
                        name="email"
                        required
                        placeholder="e.g. child@example.com"
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        suppressHydrationWarning={true}
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
                    >
                        {isPending ? 'Linking...' : 'Add Child'}
                    </button>
                </div>
            </div>

            {state?.success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                    {state.message}
                </div>
            )}
            {state?.success === false && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-1">
                    {state.message}
                </div>
            )}
        </form>
    );
}
