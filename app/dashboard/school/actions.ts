'use server';

import { prisma } from '@/lib/db/prisma';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { revalidatePath } from 'next/cache';

export async function purchaseLicenseAction(formData: FormData) {
    const session = await getAppAuthContext();
    if (!session || session.role !== 'school') {
        throw new Error('Unauthorized');
    }

    const moodleCourseId = parseInt(formData.get('courseId') as string);
    const seatCount = parseInt(formData.get('seats') as string);

    if (isNaN(moodleCourseId) || isNaN(seatCount) || seatCount <= 0) {
        return { success: false, message: 'Invalid input' };
    }

    try {
        // In a real app, this would integrate with a payment gateway (Safepay)
        // Here we simulate a successful purchase

        if (!(prisma as any).schoolLicense) {
            return { success: false, message: 'System initialization in progress. Please refresh.' };
        }

        await (prisma as any).schoolLicense.upsert({
            where: {
                schoolId_moodleCourseId: {
                    schoolId: session.moodleUserId,
                    moodleCourseId: moodleCourseId,
                }
            },
            update: {
                totalSeats: { increment: seatCount }
            },
            create: {
                schoolId: session.moodleUserId,
                moodleCourseId: moodleCourseId,
                totalSeats: seatCount,
            }
        });

        revalidatePath('/dashboard/school');
        return { success: true, message: `Successfully purchased ${seatCount} seats.` };
    } catch (error) {
        console.error('Purchase error:', error);
        return { success: false, message: 'Failed to complete purchase' };
    }
}

export async function assignSeatAction(formData: FormData) {
    try {
        const session = await getAppAuthContext();
        if (!session || session.role !== 'school') {
            return { success: false, message: 'Unauthorized session' };
        }

        const licenseId = formData.get('licenseId') as string;
        const studentEmail = (formData.get('email') as string)?.trim().toLowerCase();

        if (!licenseId || !studentEmail) {
            return { success: false, message: 'License and email are required' };
        }

        const prismaAny = prisma as any;
        if (!prismaAny.schoolLicense || !prismaAny.licenseSeatAssignment) {
            return { success: false, message: 'Database initialization pending. Re-syncing...' };
        }

        // 1. Get the license and check availability
        const license = await prismaAny.schoolLicense.findUnique({
            where: { id: licenseId },
        });

        if (!license) {
            return { success: false, message: 'License record not found' };
        }

        if (license.schoolId !== session.moodleUserId) {
            return { success: false, message: 'Unauthorized license access' };
        }

        if (license.usedSeats >= license.totalSeats) {
            return { success: false, message: 'No seats available in this license' };
        }

        // 2. Find student in Moodle
        const { getUserByEmail } = await import('@/lib/moodle/user');
        let moodleUsers: any;
        try {
            moodleUsers = await getUserByEmail(studentEmail);
        } catch (err: any) {
            console.error('Seat Assignment: Student lookup failed', err);
            return { success: false, message: `Could not verify student email: ${err.message}` };
        }

        if (!Array.isArray(moodleUsers) || moodleUsers.length === 0) {
            return { success: false, message: `No registered student found with email: ${studentEmail}` };
        }

        const student = moodleUsers[0];

        // 2.5 Check if already enrolled in Moodle (SRS logic)
        const { getUserCourses } = await import('@/lib/moodle/courses');
        const adminToken = process.env.MOODLE_ADMIN_TOKEN;
        if (adminToken) {
            try {
                const studentCourses = await getUserCourses(adminToken, student.id);
                const isEnrolled = Array.isArray(studentCourses) && studentCourses.some((c: any) => c.id === license.moodleCourseId);

                if (isEnrolled) {
                    return {
                        success: false,
                        message: `Student is already enrolled in this course. Seat saved.`
                    };
                }
            } catch (courseErr) {
                console.warn('Seat Assignment: Could not verify existing courses, skipping check.', courseErr);
            }
        }

        // 3. Check if already assigned in our DB record
        const existingAssignment = await prismaAny.licenseSeatAssignment.findUnique({
            where: {
                licenseId_studentId: {
                    licenseId: license.id,
                    studentId: student.id,
                }
            }
        });

        if (existingAssignment) {
            return { success: false, message: 'Student is already assigned to this license plan' };
        }

        // 4. Enroll in Moodle
        const { enrolUserInCourse } = await import('@/lib/moodle/auth');
        try {
            await enrolUserInCourse(student.id, license.moodleCourseId);
        } catch (moodleError: any) {
            console.error('Seat Assignment: Moodle enrollment error', moodleError);
            return {
                success: false,
                message: `Enrollment failed: ${moodleError.message || 'Moodle API Error'}`
            };
        }

        // 5. Record assignment and update count
        await prisma.$transaction([
            prismaAny.licenseSeatAssignment.create({
                data: {
                    licenseId: license.id,
                    studentId: student.id,
                }
            }),
            prismaAny.schoolLicense.update({
                where: { id: license.id },
                data: { usedSeats: { increment: 1 } }
            })
        ]);

        revalidatePath('/dashboard/school');
        return { success: true, message: `Seat successfully assigned to ${student.fullname || studentEmail}.` };
    } catch (error: any) {
        console.error('Seat assignment CRITICAL error:', error);
        return { success: false, message: `System error: ${error.message || 'Please try again later'}` };
    }
}
