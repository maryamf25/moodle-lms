'use client';

import { useActionState } from 'react';
import { purchaseLicenseAction } from './actions';

export default function PurchaseForm({ courses }: { courses: any[] }) {
    const [state, formAction, isPending] = useActionState(
        async (prevState: any, formData: FormData) => {
            return await purchaseLicenseAction(formData);
        },
        null
    );

    return (
        <section className="bg-white rounded-[2rem] border border-blue-100 p-8 shadow-xl shadow-blue-50 sticky top-8">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">💳</span>
                Purchase Seats
            </h2>
            <form action={formAction} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Select Course</label>
                    <select
                        name="courseId"
                        required
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                    >
                        <option value="">Choose a course...</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.moodleCourseId}>
                                {course.fullname}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Number of Seats</label>
                    <input
                        type="number"
                        name="seats"
                        min="1"
                        defaultValue="10"
                        required
                        suppressHydrationWarning={true}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                {state?.message && (
                    <div className={`p-4 rounded-xl text-xs font-bold ${state.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {state.message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                    {isPending ? 'Processing...' : 'Purchase Licenses'}
                </button>

                <p className="text-[10px] text-center text-slate-400 font-medium px-4 leading-relaxed">
                    Bulk purchases provide discounted rates for institutions and organizations.
                </p>
            </form>
        </section>
    );
}
