'use server';

import { registerUser, RegisterUserError } from '@/lib/moodle/index';

interface RegisterActionResult {
    success: boolean;
    message?: string;
    details?: string;
    userId?: number;
    username?: string;
    requiresEmailConfirmation?: boolean;
}

export async function registerUserAction(input: {
    username: string;
    password: string;
    firstname: string;
    lastname: string;
    email: string;
}): Promise<RegisterActionResult> {
    const payload = {
        username: input.username.trim(),
        password: input.password,
        firstname: input.firstname.trim(),
        lastname: input.lastname.trim(),
        email: input.email.trim().toLowerCase(),
    };

    if (!payload.username || !payload.password || !payload.firstname || !payload.lastname || !payload.email) {
        return { success: false, message: 'All fields are required' };
    }

    try {
        const created = await registerUser(payload);
        return {
            success: true,
            userId: created.id,
            username: created.username,
            message: created.nextStepMessage,
            requiresEmailConfirmation: created.requiresEmailConfirmation,
        };
    } catch (error: unknown) {
        if (error instanceof RegisterUserError) {
            return {
                success: false,
                message: error.message,
                details: [
                    `stage: ${error.details.stage || 'unknown'}`,
                    `function: ${error.details.wsfunction || 'unknown'}`,
                    error.details.status ? `httpStatus: ${error.details.status}` : null,
                    error.details.moodleException ? `moodleException: ${error.details.moodleException}` : null,
                    error.details.moodleErrorCode ? `moodleErrorCode: ${error.details.moodleErrorCode}` : null,
                    error.details.moodleMessage ? `moodleMessage: ${error.details.moodleMessage}` : null,
                    error.details.rawResponse ? `rawResponse: ${error.details.rawResponse}` : null,
                ].filter(Boolean).join('\n'),
            };
        }

        return {
            success: false,
            message: error instanceof Error ? error.message : 'Registration failed',
            details: 'stage: unknown',
        };
    }
}
