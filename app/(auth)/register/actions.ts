'use server';

import { registerUser, RegisterUserError } from '@/lib/moodle/index';
import { prisma } from '@/lib/db/prisma';

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
    role: string;
}): Promise<RegisterActionResult> {
    const payload = {
        username: input.username.trim(),
        password: input.password,
        firstname: input.firstname.trim(),
        lastname: input.lastname.trim(),
        email: input.email.trim().toLowerCase(),
    };

    console.log(`[register] Initiating registration for role: ${input.role}`, { username: payload.username });

    if (!payload.username || !payload.password || !payload.firstname || !payload.lastname || !payload.email) {
        return { success: false, message: 'All fields are required' };
    }

    try {
        // 1. Store the intended role locally by username
        // We do this BEFORE Moodle registration to ensure we have the intent captured.
        // If Moodle registration fails, this won't hurt. 
        // If it succeeds but needs email confirmation, we'll have it ready for when they first login.
        await (prisma as any).registrationRole.upsert({
            where: { username: payload.username },
            update: { role: input.role as any }, // Cast to any to handle UserRole enum
            create: {
                username: payload.username,
                role: input.role as any
            },
        });

        // 2. Register in Moodle
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
