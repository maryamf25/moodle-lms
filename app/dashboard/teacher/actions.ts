'use server';

import { getUserId } from '@/app/(auth)/login/actions';
import { addCourseContent, createTeacherCourse } from '@/lib/moodle/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

function redirectWithMessage(message: string, type: 'success' | 'error'): never {
    const params = new URLSearchParams({
        flash: message,
        type,
    });
    redirect(`/dashboard/teacher?${params.toString()}`);
}

export async function createTeacherCourseAction(formData: FormData): Promise<never> {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;
    const role = cookieStore.get('moodle_role')?.value;

    if (!token || role !== 'teacher') {
        redirect('/login');
    }

    const fullname = String(formData.get('fullname') || '').trim();
    const shortname = String(formData.get('shortname') || '').trim();
    const summary = String(formData.get('summary') || '').trim();
    const categoryIdRaw = String(formData.get('categoryId') || '').trim();

    if (!fullname || !shortname) {
        redirectWithMessage('Course name and short name are required.', 'error');
    }

    const categoryId = categoryIdRaw ? Number.parseInt(categoryIdRaw, 10) : undefined;
    if (categoryIdRaw && (categoryId === undefined || Number.isNaN(categoryId) || categoryId <= 0)) {
        redirectWithMessage('Category ID must be a valid number.', 'error');
    }

    try {
        const teacherId = await getUserId(token);
        const course = await createTeacherCourse({
            teacherId,
            fullname,
            shortname,
            summary: summary || undefined,
            categoryId,
        });

        redirectWithMessage(`Course created: ${course.fullname} (ID ${course.id}).`, 'success');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create course';
        redirectWithMessage(message, 'error');
    }
}

export async function addCourseContentAction(formData: FormData): Promise<never> {
    const cookieStore = await cookies();
    const token = cookieStore.get('moodle_token')?.value;
    const role = cookieStore.get('moodle_role')?.value;

    if (!token || role !== 'teacher') {
        redirect('/login');
    }

    const courseIdRaw = String(formData.get('courseId') || '').trim();
    const sectionName = String(formData.get('sectionName') || '').trim();
    const sectionSummary = String(formData.get('sectionSummary') || '').trim();
    const sectionNumberRaw = String(formData.get('sectionNumber') || '').trim();

    const courseId = Number.parseInt(courseIdRaw, 10);
    if (Number.isNaN(courseId) || courseId <= 0) {
        redirectWithMessage('Please select a valid course.', 'error');
    }
    if (!sectionName) {
        redirectWithMessage('Section title is required.', 'error');
    }

    const sectionNumber = sectionNumberRaw ? Number.parseInt(sectionNumberRaw, 10) : undefined;
    if (sectionNumberRaw && (sectionNumber === undefined || Number.isNaN(sectionNumber) || sectionNumber < 0)) {
        redirectWithMessage('Section number must be 0 or greater.', 'error');
    }

    try {
        const result = await addCourseContent({
            courseId,
            sectionName,
            sectionSummary: sectionSummary || undefined,
            sectionNumber,
        });

        const createdSection = typeof result.section === 'number' ? result.section : 'new';
        redirectWithMessage(`Content section added (${createdSection}): ${result.name}.`, 'success');
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to add content';
        redirectWithMessage(message, 'error');
    }
}
