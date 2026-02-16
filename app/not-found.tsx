import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="text-6xl font-black text-indigo-600">404</div>
                <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
                <p className="text-slate-500">The page you're looking for doesn't exist or has been moved.</p>
                <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-slate-900 transition-all"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
