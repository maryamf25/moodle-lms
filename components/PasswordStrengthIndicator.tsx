export default function PasswordStrengthIndicator({ password }: { password: string }) {
    if (!password) return null;

    const requirements = [
        { label: "At least 8 characters long", met: password.length >= 8 },
        { label: "At least 1 digit (0-9)", met: /[0-9]/.test(password) },
        { label: "At least 1 lowercase letter (a-z)", met: /[a-z]/.test(password) },
        { label: "At least 1 uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
        { label: "At least 1 special character (*, -, #, @, etc.)", met: /[^a-zA-Z0-9]/.test(password) },
    ];

    return (
        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Password Requirements</p>
            <ul className="space-y-2">
                {requirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                        {req.met ? (
                            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        )}
                        <span className={`text-xs font-bold transition-colors ${req.met ? 'text-green-700' : 'text-slate-400'}`}>
                            {req.label}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
