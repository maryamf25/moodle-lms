'use server';

import { prisma } from '@/lib/db/prisma';
import { getAppAuthContext } from '@/lib/auth/server-session';
import { revalidatePath } from 'next/cache';

export async function purchaseLicenseAction(prevState: any, formData: FormData) {
    try {
        if (!formData) return { success: false, message: 'Invalid form data' };
        const session = await getAppAuthContext();
        if (!session || session.role !== 'school') {
            return { success: false, message: 'Unauthorized session' };
        }

        const moodleCourseId = parseInt(formData.get('courseId') as string);
        const seatCount = parseInt(formData.get('seats') as string);

        if (isNaN(moodleCourseId) || isNaN(seatCount) || seatCount <= 0) {
            return { success: false, message: 'Invalid input' };
        }

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
    } catch (error: any) {
        console.error('Purchase error:', error);
        return { success: false, message: error.message || 'Failed to complete purchase' };
    }
}

export async function assignSeatAction(prevState: any, formData: FormData) {
    try {
        if (!formData) return { success: false, message: 'Invalid form data' };
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

        let student: any;
        if (!Array.isArray(moodleUsers) || moodleUsers.length === 0) {
            // AUTO-REGISTRATION for Single Assignment
            try {
                const { registerDirectlyViaAdmin } = await import('@/lib/moodle/auth');
                const usernameHandle = studentEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                const newUser = await (registerDirectlyViaAdmin as any)({
                    username: usernameHandle,
                    password: '', // Moodle will generate this
                    firstname: studentEmail.split('@')[0],
                    lastname: 'Student',
                    email: studentEmail
                });
                student = { id: newUser.id, email: studentEmail, fullname: `${studentEmail.split('@')[0]} Student` };
                console.log(`Seat Assignment: Auto-registered new student ${studentEmail}`);
            } catch (regErr: any) {
                return { success: false, message: `Student not found and auto-creation failed: ${regErr.message}` };
            }
        } else {
            student = moodleUsers[0];
        }

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

export async function bulkAssignSeatsAction(licenseId: string, emails: string[]) {
    try {
        const session = await getAppAuthContext();
        if (!session || session.role !== 'school') return { success: false, message: 'Unauthorized' };

        if (!licenseId || !emails || emails.length === 0) {
            return { success: false, message: 'Invalid data' };
        }

        const prismaAny = prisma as any;
        const license = await prismaAny.schoolLicense.findUnique({ where: { id: licenseId } });
        if (!license || license.schoolId !== session.moodleUserId) {
            return { success: false, message: 'License not found' };
        }

        const availableSeats = license.totalSeats - license.usedSeats;
        if (emails.length > availableSeats) {
            return { success: false, message: `Insufficient seats. You have ${availableSeats} seats left but tried to assign ${emails.length}.` };
        }

        const { getUserByEmail } = await import('@/lib/moodle/user');
        const { enrolUserInCourse } = await import('@/lib/moodle/auth');
        const { getUserCourses } = await import('@/lib/moodle/courses');
        const results = { success: 0, failed: 0, errors: [] as string[] };

        for (const rawEmail of emails) {
            const email = rawEmail.trim().toLowerCase();
            if (!email) continue;

            try {
                // Check Moodle User
                let mUsers = await getUserByEmail(email);
                let student: any;

                if (!Array.isArray(mUsers) || mUsers.length === 0) {
                    // AUTO-REGISTRATION: User doesn't exist, let's create them
                    try {
                        const { registerDirectlyViaAdmin } = await import('@/lib/moodle/auth');
                        // Use email as username for predictable login
                        const username = email.toLowerCase();
                        const newUser = await (registerDirectlyViaAdmin as any)({
                            username: username,
                            password: 'Welcome@123', // Professional default password
                            firstname: email.split('@')[0], // Fallback firstname
                            lastname: 'Student',
                            email: email
                        });
                        student = { id: newUser.id, email: email, fullname: `${email.split('@')[0]} Student` };
                    } catch (regErr: any) {
                        results.failed++;
                        results.errors.push(`${email}: Creation failed: ${regErr.message}`);
                        continue;
                    }
                } else {
                    student = mUsers[0];
                }

                // Check Assignment in DB
                const existing = await prismaAny.licenseSeatAssignment.findUnique({
                    where: { licenseId_studentId: { licenseId, studentId: student.id } }
                });
                if (existing) {
                    results.failed++;
                    results.errors.push(`${email}: Already assigned`);
                    continue;
                }

                // Check Moodle Enrollment
                const adminToken = process.env.MOODLE_ADMIN_TOKEN;
                if (adminToken) {
                    const sCourses = await getUserCourses(adminToken, student.id);
                    if (sCourses.some((c: any) => c.id === license.moodleCourseId)) {
                        results.failed++;
                        results.errors.push(`${email}: Already enrolled in course`);
                        continue;
                    }
                }

                // Enroll and Record
                await enrolUserInCourse(student.id, license.moodleCourseId);
                await prismaAny.licenseSeatAssignment.create({
                    data: { licenseId, studentId: student.id }
                });
                await prismaAny.schoolLicense.update({
                    where: { id: licenseId },
                    data: { usedSeats: { increment: 1 } }
                });

                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`${email}: ${err.message || 'System error'}`);
            }
        }

        revalidatePath('/dashboard/school');
        return {
            success: true,
            message: `Processed ${emails.length} emails.`,
            summary: results
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
