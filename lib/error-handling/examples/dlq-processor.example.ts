/**
 * Example: Background Job Processor
 * Demonstrates processing dead letter queue jobs with retry and cleanup
 */

import { retryWithBackoff, getAllDeadLetterJobs, removeDeadLetterJob, markDeadLetterJobFailed, getDeadLetterJobStats, JobType, cleanupOldDeadLetterJobs } from '@/lib/error-handling';
import { sendEnrollmentEmail } from '@/lib/support/email';
import { sendNotification } from '@/lib/notifications';
import { prisma } from '@/lib/db/prisma';

/**
 * Process a single DLQ job
 * Called by background queue processor (Bull, RabbitMQ, etc.)
 */
export async function processDLQJob(jobId: string): Promise<boolean> {
  const job = await prisma.deadLetterQueue.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    console.warn('[DLQ Processor] Job not found:', jobId);
    return false;
  }

  console.log(`[DLQ Processor] Processing job ${job.id} (${job.jobType}), attempt ${job.retryCount + 1}/${job.maxRetries}`);

  try {
    // Route to appropriate handler based on job type
    switch (job.jobType) {
      case JobType.EMAIL_SEND:
        await handleEmailSendJob(job.payload);
        break;
      case JobType.NOTIFICATION:
        await handleNotificationJob(job.payload);
        break;
      case JobType.ENROLLMENT:
        await handleEnrollmentJob(job.payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }

    // Job succeeded, remove from DLQ
    await removeDeadLetterJob(jobId);
    console.log(`[DLQ Processor] Job succeeded and removed: ${jobId}`);
    return true;
  } catch (error) {
    console.error(`[DLQ Processor] Job failed:`, error);
    await markDeadLetterJobFailed(jobId);
    return false;
  }
}

async function handleEmailSendJob(payload: any): Promise<void> {
  const { userId, email, subject, html } = payload;

  if (!email) {
    throw new Error('Email address is required');
  }

  // Use retry for email sending (transient failure is common)
  await retryWithBackoff(
    () => sendEnrollmentEmail({
      to: email,
      subject,
      html,
    }),
    {
      maxRetries: 3,
      baseDelayMs: 2000,
      onRetry: (attempt) => {
        console.log(`[DLQ] Email send retry ${attempt}`);
      },
    }
  );
}

async function handleNotificationJob(payload: any): Promise<void> {
  const { userId, title, message, type } = payload;

  if (!userId) {
    throw new Error('User ID is required');
  }

  await sendNotification({
    userId,
    title: title || 'Notification',
    message: message || '',
    type: type || 'SYSTEM',
  });
}

async function handleEnrollmentJob(payload: any): Promise<void> {
  const { userId, moodleUserId, courseId } = payload;

  if (!moodleUserId || !courseId) {
    throw new Error('Moodle user ID and course ID are required');
  }

  // Get enrollment function from Moodle library
  const { enrolUser } = await import('@/lib/moodle/index');

  return await retryWithBackoff(
    () => enrolUser(moodleUserId, courseId),
    {
      maxRetries: 3,
      baseDelayMs: 1000,
      onRetry: (attempt) => {
        console.log(`[DLQ] Enrollment retry ${attempt}`);
      },
    }
  );
}

/**
 * Main processor - call periodically (every 5 minutes)
 * Run this as a scheduled job (cron) or queue consumer
 */
export async function processPendingDLQJobs(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  console.log('[DLQ Processor] Starting batch processing...');

  const stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
  };

  try {
    // Get all pending jobs (due for retry)
    const pendingJobs = await getAllDeadLetterJobs({ status: 'pending' });

    console.log(`[DLQ Processor] Found ${pendingJobs.length} pending jobs`);

    // Process each job
    for (const job of pendingJobs) {
      stats.processed++;

      const success = await processDLQJob(job.id);
      if (success) {
        stats.succeeded++;
      } else {
        stats.failed++;
      }

      // Add delay between jobs to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Cleanup old failed jobs (older than 30 days)
    const cleanedUp = await cleanupOldDeadLetterJobs(30);
    console.log(`[DLQ Processor] Cleaned up ${cleanedUp} old jobs`);

    // Log stats
    const dlqStats = await getDeadLetterJobStats();
    console.log('[DLQ Processor] Batch complete. Stats:', {
      processed: stats.processed,
      succeeded: stats.succeeded,
      failed: stats.failed,
      remaining: dlqStats,
    });

    return stats;
  } catch (error) {
    console.error('[DLQ Processor] Batch processing failed:', error);
    return stats;
  }
}

/**
 * Health check endpoint
 * Expose as API endpoint to monitor DLQ status
 */
export async function getDLQHealthStatus() {
  const stats = await getDeadLetterJobStats();
  const pendingJobs = await getAllDeadLetterJobs({ status: 'pending' });

  return {
    healthy: stats.failed < 10 && pendingJobs.length < 100,
    stats,
    warnings: {
      hasFailedJobs: stats.failed > 0,
      hasManyPending: pendingJobs.length > 50,
      oldestPending: pendingJobs.length > 0 ? pendingJobs[pendingJobs.length - 1].createdAt : null,
    },
  };
}
