
"use client";

import { useState } from "react";
import { getAutoLoginUrlAction } from "@/app/(auth)/login/actions";

interface TeacherSSOLinkProps {
    token: string;
    privateToken: string;
    targetUrl: string;
    label: string;
    className?: string;
    icon?: string;
}

export default function TeacherSSOLink({
    token,
    privateToken,
    targetUrl,
    label,
    className = "",
    icon,
}: TeacherSSOLinkProps) {
    const [isLaunching, setIsLaunching] = useState(false);

    const handleLaunch = async (e: React.MouseEvent) => {
        e.preventDefault();

        if (!privateToken) {
            window.location.href = targetUrl;
            return;
        }

        setIsLaunching(true);
        try {
            const result = await getAutoLoginUrlAction(token, privateToken);
            if (result && result.url) {
                const finalUrl = `${result.url}&urltogo=${encodeURIComponent(targetUrl)}`;
                window.location.href = finalUrl;
            } else {
                window.location.href = targetUrl;
            }
        } catch (error) {
            console.error("SSO Error:", error);
            window.location.href = targetUrl;
        } finally {
            setIsLaunching(false);
        }
    };

    return (
        <button
            onClick={handleLaunch}
            disabled={isLaunching}
            className={`flex items-center justify-center gap-2 transition-all ${className} ${isLaunching ? 'opacity-70 cursor-wait' : ''}`}
        >
            {isLaunching ? (
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : icon ? (
                <span>{icon}</span>
            ) : null}
            <span>{isLaunching ? "Authenticating..." : label}</span>
        </button>
    );
}
