
"use client";

import { useEffect, useState } from "react";
import { getAutoLoginUrlAction } from "@/app/(auth)/login/actions";

interface MoodleBackgroundLoginProps {
    token: string;
    privateToken: string;
}

export default function MoodleBackgroundLogin({
    token,
    privateToken,
}: MoodleBackgroundLoginProps) {
    const [loginUrl, setLoginUrl] = useState<string | null>(null);
    const [attempted, setAttempted] = useState(false);

    useEffect(() => {
        if (attempted || !token || !privateToken) return;

        async function initBackgroundLogin() {
            try {
                const result = await getAutoLoginUrlAction(token, privateToken);

                if (result.url) {
                    setLoginUrl(result.url);
                } else if (result.error) {
                    // Moodle rate limit errors are expected if page is refreshed often
                    if (!result.error.includes("wait")) {
                        console.error("[MoodleBackgroundLogin] SSO Error:", result.error);
                    }
                }
            } catch (e) {
                console.error("[MoodleBackgroundLogin] Catch error:", e);
            } finally {
                setAttempted(true);
            }
        }

        initBackgroundLogin();
    }, [token, privateToken, attempted]);

    if (!loginUrl) return null;

    return (
        <iframe
            src={loginUrl}
            style={{
                display: "none",
                width: 0,
                height: 0,
                border: "none",
                position: "absolute",
                visibility: "hidden",
            }}
            title="Background Moodle Login"
            aria-hidden="true"
        />
    );
}
