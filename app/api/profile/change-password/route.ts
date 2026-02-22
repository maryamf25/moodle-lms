import { NextRequest, NextResponse } from "next/server";
import { getAppAuthContext } from "@/lib/auth/server-session";
import { moodleWebserviceGet, moodleWebservicePost } from "@/lib/moodle/client";

export async function POST(request: NextRequest) {
    const auth = await getAppAuthContext();
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (!adminToken) {
            return NextResponse.json({ error: "Server error: missing admin token" }, { status: 500 });
        }

        // 1. Verify Current Password by attempting to get a new token in Moodle
        try {
            const moodleUrl = process.env.NEXT_PUBLIC_MOODLE_URL || "";
            const service = process.env.MOODLE_SERVICE_NAME || "moodle_mobile_app";
            const tokenRes = await fetch(`${moodleUrl}/login/token.php?username=${encodeURIComponent(auth.username)}&password=${encodeURIComponent(currentPassword)}&service=${encodeURIComponent(service)}`);
            const tokenData = await tokenRes.json();

            if (tokenData.error || !tokenData.token) {
                return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
            }
        } catch (error) {
            console.error("Password verification failed", error);
            return NextResponse.json({ error: "Failed to verify current password" }, { status: 500 });
        }

        // 2. Update to new password via API
        const params = new URLSearchParams();
        params.append("users[0][id]", String(auth.moodleUserId));
        params.append("users[0][password]", newPassword);

        const response = await moodleWebservicePost(adminToken, "core_user_update_users", params);

        return NextResponse.json({ success: true, response });
    } catch (error) {
        console.error("Failed to change password", error);
        return NextResponse.json({ error: "Failed to change password", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
