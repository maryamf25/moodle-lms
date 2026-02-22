'use server';

import { prisma } from '@/lib/db/prisma';
import { FormType, FieldType } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { sendNotification } from '@/lib/notifications';

interface FormFieldInput {
  fieldType: FieldType;
  label: string;
  placeholder?: string;
  isRequired: boolean;
  order: number;
  options?: string[];
  validation?: Record<string, any>;
}

interface CreateFormInput {
  title: string;
  description?: string;
  type: FormType;
  fields: FormFieldInput[];
}

interface FormSubmissionInput {
  formId: string;
  email?: string;
  data: Record<string, any>;
  files?: Array<{
    fieldName: string;
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
  }>;
}

// CREATE FORM
export async function createForm(input: CreateFormInput, createdByUserId: string) {
  try {
    const form = await prisma.form.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        createdBy: createdByUserId,
        fields: {
          create: input.fields.map(field => ({
            fieldType: field.fieldType,
            label: field.label,
            placeholder: field.placeholder,
            isRequired: field.isRequired,
            order: field.order,
            options: field.options ? JSON.stringify(field.options) : null,
            validation: field.validation ? JSON.stringify(field.validation) : null,
          })),
        },
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return { success: true, form };
  } catch (error) {
    console.error('Error creating form:', error);
    return { success: false, error: 'Failed to create form' };
  }
}

// GET FORM WITH FIELDS
export async function getForm(formId: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (form && form.fields) {
      return {
        ...form,
        fields: form.fields.map(f => ({
          ...f,
          options: f.options ? JSON.parse(f.options) : undefined,
          validation: f.validation ? JSON.parse(f.validation) : undefined,
        })),
      };
    }

    return form;
  } catch (error) {
    console.error('Error fetching form:', error);
    return null;
  }
}

// LIST FORMS BY TYPE
export async function getFormsByType(type: FormType) {
  try {
    const forms = await prisma.form.findMany({
      where: {
        type,
        isActive: true,
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return forms.map(form => ({
      ...form,
      fields: form.fields.map(f => ({
        ...f,
        options: f.options ? JSON.parse(f.options) : undefined,
        validation: f.validation ? JSON.parse(f.validation) : undefined,
      })),
    }));
  } catch (error) {
    console.error('Error fetching forms:', error);
    return [];
  }
}

// UPDATE FORM
export async function updateForm(formId: string, input: Partial<CreateFormInput>) {
  try {
    const form = await prisma.form.update({
      where: { id: formId },
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        fields: input.fields
          ? {
            deleteMany: {},
            create: input.fields.map(field => ({
              fieldType: field.fieldType,
              label: field.label,
              placeholder: field.placeholder,
              isRequired: field.isRequired,
              order: field.order,
              options: field.options ? JSON.stringify(field.options) : null,
              validation: field.validation ? JSON.stringify(field.validation) : null,
            })),
          }
          : undefined,
      },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return { success: true, form };
  } catch (error) {
    console.error('Error updating form:', error);
    return { success: false, error: 'Failed to update form' };
  }
}

// DELETE FORM
export async function deleteForm(formId: string) {
  try {
    await prisma.form.delete({
      where: { id: formId },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting form:', error);
    return { success: false, error: 'Failed to delete form' };
  }
}

// SUBMIT FORM WITH FILES
export async function submitForm(input: FormSubmissionInput) {
  try {
    // Validate form exists and is active
    const form = await prisma.form.findUnique({
      where: { id: input.formId },
    });

    if (!form || !form.isActive) {
      return { success: false, error: 'Form not found or inactive' };
    }

    // Create submission
    const submission = await prisma.formSubmission.create({
      data: {
        formId: input.formId,
        email: input.email,
        data: input.data,
      },
    });

    // Admins ko dhoondein aur form submission ka alert bhejein
    const adminUsers = await prisma.user.findMany({
      where: { role: 'admin' }
    });

    for (const admin of adminUsers) {
      await sendNotification({
        userId: admin.id,
        title: 'New Form Submission 📝',
        message: `Ek naya form / teacher application submit hua hai. Review ke liye click karein.`,
        type: 'SYSTEM',
        actionUrl: `/dashboard/admin/forms`,
      });
    }

    // Handle file uploads if present
    if (input.files && input.files.length > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'forms');
      await fs.mkdir(uploadsDir, { recursive: true });

      for (const file of input.files) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const storageName = `${timestamp}-${random}-${file.originalName}`;
        const filePath = path.join(uploadsDir, storageName);

        // Save file to disk
        await fs.writeFile(filePath, file.fileBuffer);

        // Create submission file record
        await prisma.submissionFile.create({
          data: {
            submissionId: submission.id,
            originalName: file.originalName,
            storageName,
            mimeType: file.mimeType,
            size: file.fileBuffer.length,
          },
        });
      }
    }

    return { success: true, submissionId: submission.id };
  } catch (error) {
    console.error('Error submitting form:', error);
    return { success: false, error: 'Failed to submit form' };
  }
}

// GET FORM SUBMISSIONS
export async function getFormSubmissions(formId: string) {
  try {
    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      include: {
        files: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return submissions;
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
}

// UPDATE SUBMISSION STATUS
export async function updateSubmissionStatus(
  submissionId: string,
  status: string,
  notes?: string
) {
  try {
    const submission = await prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        notes,
      },
    });

    return { success: true, submission };
  } catch (error) {
    console.error('Error updating submission:', error);
    return { success: false, error: 'Failed to update submission' };
  }
}

// EXPORT SUBMISSIONS TO CSV
export async function exportSubmissionsAsCSV(formId: string) {
  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        submissions: {
          include: {
            files: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!form) {
      return { success: false, error: 'Form not found' };
    }

    // Build CSV header
    const headers = ['Submission ID', 'Email', 'Status', 'Submitted At'];
    form.fields.forEach(field => {
      headers.push(field.label);
    });
    headers.push('Files');

    // Build CSV rows
    const rows = form.submissions.map(submission => {
      const row = [
        submission.id,
        submission.email || submission.submitBy || 'Guest',
        submission.status,
        new Date(submission.createdAt).toLocaleString(),
      ];

      // Add field values
      form.fields.forEach(field => {
        const value = (submission.data as Record<string, any>)[field.id] || '';
        // Escape CSV values
        const escaped = String(value)
          .replace(/"/g, '""')
          .replace(/\n/g, ' ');
        row.push(`"${escaped}"`);
      });

      // Add file info
      const fileInfo = submission.files
        .map(f => `${f.originalName} (${(f.size / 1024).toFixed(2)}KB)`)
        .join('; ');
      row.push(`"${fileInfo}"`);

      return row;
    });

    // Combine headers and rows
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    return {
      success: true,
      csv: csvContent,
      filename: `${form.title.replace(/\s+/g, '_')}_submissions_${Date.now()}.csv`,
    };
  } catch (error) {
    console.error('Error exporting submissions:', error);
    return { success: false, error: 'Failed to export submissions' };
  }
}

// GET ALL FORMS (Admin)
export async function getAllForms() {
  try {
    const forms = await prisma.form.findMany({
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
        submissions: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return forms.map(form => ({
      ...form,
      submissionCount: form.submissions.length,
      submissions: undefined,
    }));
  } catch (error) {
    console.error('Error fetching all forms:', error);
    return [];
  }
}

// DELETE SUBMISSION
export async function deleteSubmission(submissionId: string) {
  try {
    // Get files to delete from filesystem
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: { files: true },
    });

    if (submission?.files) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'forms');
      for (const file of submission.files) {
        try {
          await fs.unlink(path.join(uploadsDir, file.storageName));
        } catch (err) {
          console.error(`Failed to delete file: ${file.storageName}`, err);
        }
      }
    }

    // Delete submission record (cascades to files)
    await prisma.formSubmission.delete({
      where: { id: submissionId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting submission:', error);
    return { success: false, error: 'Failed to delete submission' };
  }
}
