/**
 * Example: Enrollment Server Action with Error Handling
 * Demonstrates error handling, DLQ for background operations, and graceful degradation
 */

'use server';

import { retryWithBackoff, addToDeadLetterQueue, serverActionError, serverActionSuccess, ErrorCode, JobType, ActionResult, createAppError } from '@/lib/error-handling';
import { requireAppAuth } from '@/lib/auth/server-session';
import { enrolUser } from '@/lib/moodle/index';
import { prisma } from '@/lib/db/prisma';
import { sendNotification } from '@/lib/notifications';

interface EnrollmentResult extends ActionResult {
  data?: {
    enrollmentId: string;
    courseId: string;
  };
}

export async function enrollUserInCourseAction(
  courseId: string
): Promise<EnrollmentResult> {
  try {
    // Verify authentication
    const auth = await requireAppAuth();
    if (!auth) {
      return serverActionError(ErrorCode.UNAUTHORIZED);
    }

    // Validate input
    if (!courseId) {
      return serverActionError(
        createAppError(ErrorCode.VALIDATION_ERROR, {
          customMessage: 'Course ID is required',
        })
      );
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        user: { moodleUserId: auth.moodleUserId },
        courseId: parseInt(courseId),
      },
    });

    if (existingEnrollment) {
      return serverActionError(
        createAppError(ErrorCode.VALIDATION_ERROR, {
          customMessage: 'You are already enrolled in this course',
        })
      );
    }

    // Enroll with retry mechanism
    let enrollment: any;
    try {
      enrollment = await retryWithBackoff(
        () => enrolUser(auth.moodleUserId, parseInt(courseId)),
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          timeoutMs: 30000,
          onRetry: (attempt) => {
            console.log(`[enrollment] Retry attempt ${attempt} for user ${auth.moodleUserId}, course ${courseId}`);
          },
        }
      );
    } catch (enrollmentError) {
      console.error('[enrollment] Failed to enroll after retries:', enrollmentError);

      // Add to DLQ for manual retry
      await addToDeadLetterQueue(
        JobType.ENROLLMENT,
        {
          userId: auth.id,
          moodleUserId: auth.moodleUserId,
          courseId: parseInt(courseId),
          timestamp: new Date(),
        },
        enrollmentError as Error,
        { maxRetries: 5, retryDelayMinutes: 30 }
      );

      return serverActionError(
        createAppError(ErrorCode.ENROLLMENT_FAILED, {
          context: {
            courseId,
            originalError: (enrollmentError as Error).message,
          },
        })
      );
    }

    // Save to local database
    try {
      const localEnrollment = await prisma.enrollment.create({
        data: {
          userId: auth.id,
          courseId: parseInt(courseId),
        },
      });

      // Send notification (with DLQ fallback - don't fail enrollment if notification fails)
      try {
        await sendNotification({
          userId: auth.id,
          title: 'Course Enrollment Successful 🎉',
          message: `You have been successfully enrolled in the course. Start learning now!`,
          type: 'SYSTEM',
          actionUrl: `/dashboard/courses/${courseId}`,
        });
      } catch (notificationError) {
        // Log but don't fail the entire operation
        console.warn('[enrollment] Failed to send notification:', notificationError);

        // Queue it for retry
        await addToDeadLetterQueue(
          JobType.NOTIFICATION,
          {
            userId: auth.id,
            enrollmentId: localEnrollment.id,
            type: 'ENROLLMENT_SUCCESS',
          },
          notificationError as Error,
          { maxRetries: 3, retryDelayMinutes: 5 }
        );
      }

      return serverActionSuccess({
        enrollmentId: localEnrollment.id,
        courseId,
      });
    } catch (dbError) {
      console.error('[enrollment] Database error:', dbError);
      return serverActionError(
        createAppError(ErrorCode.DATABASE_ERROR, {
          originalError: dbError instanceof Error ? dbError : undefined,
        })
      );
    }
  } catch (error) {
    console.error('[enrollment] Unexpected error:', error);
    return serverActionError(
      error instanceof Error ? error : new Error('Unknown error')
    );
  }
}
