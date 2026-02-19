'use server';

import { prisma } from '@/lib/db/prisma';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { revalidatePath } from 'next/cache';
import { getUserByEmail } from '@/lib/moodle/user';

export async function linkChildAction(prevState: any, formData: FormData) {
    try {
        if (!formData) {
            return { success: false, message: 'Invalid form submission' };
        }

        const session = await getAppAuthContext();
        if (!session || session.role !== 'parent') {
            return { success: false, message: 'Unauthorized session' };
        }

        const email = (formData.get('email') as string)?.trim().toLowerCase();
        if (!email) {
            return { success: false, message: 'Student email is required' };
        }

        // 1. Find the student in Moodle
        const moodleUsers = await getUserByEmail(email);
        if (!Array.isArray(moodleUsers) || moodleUsers.length === 0) {
            return { success: false, message: 'No student found with this email in Moodle.' };
        }

        const child = moodleUsers[0];

        // 2. Prevent self-linking (just in case)
        if (child.id === session.moodleUserId) {
            return { success: false, message: 'You cannot link yourself as a child.' };
        }

        // 3. Save relationship in local DB
        const prismaAny = prisma as any;
        await prismaAny.parentChild.upsert({
            where: {
                parentId_childId: {
                    parentId: session.moodleUserId,
                    childId: child.id
                }
            },
            update: {}, // No change needed if exists
            create: {
                parentId: session.moodleUserId,
                childId: child.id
            }
        });

        revalidatePath('/dashboard/parent');
        return { success: true, message: `Successfully linked with ${child.fullname || email}.` };
    } catch (error: any) {
        console.error('Link child error:', error);
        return { success: false, message: error.message || 'Failed to link child' };
    }
}

export async function unlinkChildAction(childId: number) {
    try {
        const session = await getAppAuthContext();
        if (!session || session.role !== 'parent') {
            return { success: false, message: 'Unauthorized' };
        }

        const prismaAny = prisma as any;
        await prismaAny.parentChild.delete({
            where: {
                parentId_childId: {
                    parentId: session.moodleUserId,
                    childId: childId
                }
            }
        });

        revalidatePath('/dashboard/parent');
        return { success: true, message: 'Child unlinked successfully.' };
    } catch (error) {
        console.error('Unlink error:', error);
        return { success: false, message: 'Failed to unlink child' };
    }
}
