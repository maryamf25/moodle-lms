/**
 * Example: Updated Forgot Password API with Error Handling
 * Demonstrates proper error handling, retry mechanism, and DLQ integration
 */

import { NextRequest } from "next/server";
import { apiSuccess, apiError, retryWithBackoff, addToDeadLetterQueue, ErrorCode, JobType, createAppError } from "@/lib/error-handling";
import { moodleWebservicePost } from "@/lib/moodle/client";
import { getUserByEmail } from "@/lib/moodle/user";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        let { username } = body;

        if (!username) {
            return apiError(createAppError(ErrorCode.VALIDATION_ERROR, {
                customMessage: 'Username or Email is required',
            }));
        }

        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (!adminToken) {
            return apiError(createAppError(ErrorCode.INTERNAL_ERROR, {
                customMessage: 'Server is not properly configured',
            }));
        }

        // Check if input is an email address
        if (username.includes("@")) {
            console.log("[forgot-password] Email provided, looking up username...", username);
            try {
                // This operation might fail if user not found, but we don't want to expose that
                const usersByEmail = await getUserByEmail(username);
                
                if (!usersByEmail || usersByEmail.length === 0) {
                    // Security: Don't reveal if email exists
                    return apiSuccess(
                        { success: true },
                        { message: "If this username or email exists in our system, you will receive password reset instructions via email shortly." }
                    );
                }

                username = usersByEmail[0].username;
                console.log("[forgot-password] Found username:", username);
            } catch (error) {
                console.error("[forgot-password] Error looking up email:", error);
                // Security: Don't reveal if email exists or not
                return apiSuccess(
                    { success: true },
                    { message: "If this username or email exists in our system, you will receive password reset instructions via email shortly." }
                );
            }
        }

        const params = new URLSearchParams();
        params.append("username", username);

        // Use retry mechanism for Moodle API call
        let response: any;
        try {
            response = await retryWithBackoff(
                () => moodleWebservicePost(adminToken, "core_auth_request_password_reset", params),
                {
                    maxRetries: 3,
                    baseDelayMs: 1000,
                    timeoutMs: 30000,
                    onRetry: (attempt) => {
                        console.log(`[forgot-password] Retry attempt ${attempt}`);
                    }
                }
            );
        } catch (retryError) {
            console.error("[forgot-password] Failed after retries:", retryError);
            
            // Add to DLQ for manual retry later
            await addToDeadLetterQueue(
                JobType.EMAIL_SEND,
                { username, operation: 'password_reset' },
                retryError as Error,
                { maxRetries: 5, retryDelayMinutes: 15 }
            );

            // Return error to user
            return apiError(createAppError(ErrorCode.SERVICE_UNAVAILABLE, {
                customMessage: 'Password reset service is temporarily unavailable. Please try again later.',
            }));
        }

        console.log("[forgot-password] Moodle response:", JSON.stringify(response, null, 2));

        if (response?.status === "dataerror") {
            // User not found - security best practice: don't reveal this
            return apiSuccess(
                { success: true },
                { message: "If this username or email exists in our system, you will receive password reset instructions via email shortly." }
            );
        }

        // Check for Moodle API errors
        if (response?.exception || response?.errorcode || response?.error) {
            console.error("[forgot-password] Moodle error:", response);
            return apiError(createAppError(ErrorCode.EXTERNAL_SERVICE_ERROR, {
                context: { moodleResponse: response }
            }));
        }

        return apiSuccess(
            { success: true },
            { message: "A password reset link has been sent to your email address." }
        );
    } catch (error) {
        console.error("[forgot-password] Unexpected error:", error);
        return apiError(error);
    }
}
