import { NextRequest, NextResponse } from "next/server";
import { moodleWebservicePost } from "@/lib/moodle/client";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json({ error: "Username or Email is required" }, { status: 400 });
        }

        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (!adminToken) {
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const params = new URLSearchParams();
        params.append("username", username);

        // core_auth_request_password_reset will trigger Moodle's native password reset email
        const response: any = await moodleWebservicePost(adminToken, "core_auth_request_password_reset", params);

        if (response?.status === "dataerror") {
            return NextResponse.json({ error: response.warnings?.[0]?.message || "Could not find a user with this username/email" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "A password reset link has been sent to your email address." });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Failed to process forgot password request", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
