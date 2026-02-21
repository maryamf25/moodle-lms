'use server';

import { registerUser, RegisterUserError } from '@/lib/moodle/index';
import { prisma } from '@/lib/db/prisma';
import { MoodleRole } from '@/lib/auth/roles';

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

    const requestedRole = input.role as MoodleRole;
    const allowedRoles: MoodleRole[] = ['student', 'parent', 'school', 'admin'];
    if (!allowedRoles.includes(requestedRole)) {
        return { success: false, message: 'Invalid role selected' };
    }

    console.log(`[register] Initiating registration for role: ${requestedRole}`, { username: payload.username });

    if (!payload.username || !payload.password || !payload.firstname || !payload.lastname || !payload.email) {
        return { success: false, message: 'All fields are required' };
    }

    try {
        // 1. Store intended role so first login resolves to same role in app DB
        await (prisma as any).registrationRole.upsert({
            where: { username: payload.username },
            update: { role: requestedRole as any },
            create: {
                username: payload.username,
                role: requestedRole as any,
            },
        });

        // 2. Register user via signup token flow (auth_email_signup_user)
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
