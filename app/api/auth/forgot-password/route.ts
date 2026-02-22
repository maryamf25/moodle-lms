import { NextRequest, NextResponse } from "next/server";
import { moodleWebservicePost } from "@/lib/moodle/client";
import { getUserByEmail } from "@/lib/moodle/user";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        let { username } = body;

        if (!username) {
            return NextResponse.json({ error: "Username or Email is required" }, { status: 400 });
        }

        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (!adminToken) {
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        // Check if input is an email address
        if (username.includes("@")) {
            console.log("[forgot-password] Email provided, looking up username...", username);
            try {
                const usersByEmail = await getUserByEmail(username);
                
                if (!usersByEmail || usersByEmail.length === 0) {
                    return NextResponse.json({ 
                        success: true, 
                        message: "If this username or email exists in our system, you will receive password reset instructions via email shortly." 
                    });
                }

                // Get the username from the first matching user
                username = usersByEmail[0].username;
                console.log("[forgot-password] Found username:", username);
            } catch (error) {
                console.error("[forgot-password] Error looking up email:", error);
                // Don't reveal if email exists or not - security best practice
                return NextResponse.json({ 
                    success: true, 
                    message: "If this username or email exists in our system, you will receive password reset instructions via email shortly." 
                });
            }
        }

        const params = new URLSearchParams();
        params.append("username", username);

        // core_auth_request_password_reset will trigger Moodle's native password reset email
        const response: any = await moodleWebservicePost(adminToken, "core_auth_request_password_reset", params);

        console.log("[forgot-password] Moodle response:", JSON.stringify(response, null, 2));

        if (response?.status === "dataerror") {
            return NextResponse.json({ 
                success: true, 
                message: "If this username or email exists in our system, you will receive password reset instructions via email shortly." 
            });
        }

        // Check if response contains error or exception
        if (response?.exception || response?.errorcode || response?.error) {
            console.error("[forgot-password] Moodle error:", response);
            return NextResponse.json({ error: response?.message || "Failed to send reset email" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "A password reset link has been sent to your email address." });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "Failed to process forgot password request", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
