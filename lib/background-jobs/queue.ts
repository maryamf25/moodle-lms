/**
 * Background Job Queue Service
 * Manages enqueueing, processing, and monitoring of background jobs
 */

import { prisma } from '@/lib/db/prisma';
import { BackgroundJob, BackgroundJobType, JobStatus, JobQueueStats, JobQueueConfig } from './types';

const DEFAULT_CONFIG: JobQueueConfig = {
  maxRetries: 3,
  defaultPriority: 3,
  processingConcurrency: 5,
  lockTimeoutMs: 30000,
  pollIntervalMs: 5000,
};

let config: JobQueueConfig = DEFAULT_CONFIG;

export function configureJobQueue(customConfig: Partial<JobQueueConfig>) {
  config = { ...DEFAULT_CONFIG, ...customConfig };
}

/**
 * Enqueue a new background job
 */
export async function enqueueJob(
  jobType: BackgroundJobType,
  payload: Record<string, unknown>,
  options: {
    priority?: number;
    maxRetries?: number;
    scheduledFor?: Date;
  } = {}
): Promise<string> {
  // Check if job type is disabled
  if (config.disabledJobTypes?.includes(jobType)) {
    console.warn(`[JobQueue] Job type ${jobType} is disabled. Job not enqueued.`);
    return '';
  }

  try {
    const job = await prisma.backgroundJob.create({
      data: {
        jobType,
        payload,
        status: JobStatus.PENDING,
        retryCount: 0,
        maxRetries: options.maxRetries ?? config.maxRetries,
        priority: options.priority ?? config.defaultPriority,
        scheduledFor: options.scheduledFor,
        attempts: [],
      },
    });

    console.log(`[JobQueue] Job enqueued: ${jobType} (ID: ${job.id})`);
    return job.id;
  } catch (error) {
    console.error('[JobQueue] Failed to enqueue job:', error);
    throw error;
  }
}

/**
 * Get next pending job to process
 */
export async function getNextPendingJob(): Promise<BackgroundJob | null> {
  try {
    const now = new Date();

    const job: any = await prisma.backgroundJob.findFirst({
      where: {
        status: JobStatus.PENDING,
        scheduledFor: { lte: now },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return job as BackgroundJob | null;
  } catch (error) {
    console.error('[JobQueue] Failed to get pending job:', error);
    return null;
  }
}

/**
 * Get all pending jobs (for monitoring)
 */
export async function getPendingJobs(limit: number = 100): Promise<BackgroundJob[]> {
  try {
    const jobs: any = await prisma.backgroundJob.findMany({
      where: {
        status: { in: [JobStatus.PENDING, JobStatus.RETRYING] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });

    return jobs as BackgroundJob[];
  } catch (error) {
    console.error('[JobQueue] Failed to get pending jobs:', error);
    return [];
  }
}

/**
 * Get all jobs by status
 */
export async function getJobsByStatus(
  status: JobStatus,
  limit: number = 100
): Promise<BackgroundJob[]> {
  try {
    const jobs: any = await prisma.backgroundJob.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs as BackgroundJob[];
  } catch (error) {
    console.error('[JobQueue] Failed to get jobs by status:', error);
    return [];
  }
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: string): Promise<BackgroundJob | null> {
  try {
    const job: any = await prisma.backgroundJob.findUnique({
      where: { id: jobId },
    });

    return job as BackgroundJob | null;
  } catch (error) {
    console.error('[JobQueue] Failed to get job:', error);
    return null;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  options: {
    result?: Record<string, unknown>;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  } = {}
): Promise<BackgroundJob | null> {
  try {
    const job: any = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status,
        result: options.result,
        error: options.error,
        startedAt: options.startedAt,
        completedAt: options.completedAt,
        updatedAt: new Date(),
      },
    });

    return job as BackgroundJob | null;
  } catch (error) {
    console.error('[JobQueue] Failed to update job status:', error);
    return null;
  }
}

/**
 * Mark job as processing
 */
export async function markJobProcessing(jobId: string): Promise<BackgroundJob | null> {
  return updateJobStatus(jobId, JobStatus.PROCESSING, {
    startedAt: new Date(),
  });
}

/**
 * Mark job as completed
 */
export async function markJobCompleted(
  jobId: string,
  result?: Record<string, unknown>
): Promise<BackgroundJob | null> {
  return updateJobStatus(jobId, JobStatus.COMPLETED, {
    result,
    completedAt: new Date(),
  });
}

/**
 * Mark job as failed
 */
export async function markJobFailed(
  jobId: string,
  error: Error,
  retryable: boolean = true
): Promise<BackgroundJob | null> {
  try {
    const job = await getJobById(jobId);
    if (!job) {
      console.warn(`[JobQueue] Job not found: ${jobId}`);
      return null;
    }

    const shouldRetry = retryable && job.retryCount < job.maxRetries;
    const newStatus = shouldRetry ? JobStatus.RETRYING : JobStatus.FAILED;
    const newRetryCount = job.retryCount + 1;

    const updatedJob: any = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: newStatus,
        retryCount: newRetryCount,
        error: error.message,
        updatedAt: new Date(),
        attempts: [
          ...((job.attempts as any[]) || []),
          {
            timestamp: new Date(),
            success: false,
            error: error.message,
            duration: Date.now() - (job.startedAt?.getTime() ?? Date.now()),
          },
        ],
      },
    });

    if (shouldRetry) {
      console.log(
        `[JobQueue] Job marked for retry: ${jobId} (attempt ${newRetryCount}/${job.maxRetries})`
      );
    } else {
      console.error(`[JobQueue] Job failed permanently: ${jobId}`, error.message);
    }

    return updatedJob as BackgroundJob | null;
  } catch (error) {
    console.error('[JobQueue] Failed to mark job as failed:', error);
    return null;
  }
}

/**
 * Record successful job attempt
 */
export async function recordJobSuccess(
  jobId: string,
  result?: Record<string, unknown>
): Promise<BackgroundJob | null> {
  try {
    const job = await getJobById(jobId);
    if (!job) return null;

    const updatedJob: any = await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        updatedAt: new Date(),
        attempts: [
          ...((job.attempts as any[]) || []),
          {
            timestamp: new Date(),
            success: true,
            duration: Date.now() - (job.startedAt?.getTime() ?? Date.now()),
          },
        ],
      },
    });

    console.log(`[JobQueue] Job completed: ${jobId}`);
    return updatedJob as BackgroundJob | null;
  } catch (error) {
    console.error('[JobQueue] Failed to record job success:', error);
    return null;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<JobQueueStats> {
  try {
    const stats: any = await prisma.backgroundJob.groupBy({
      by: ['status'],
      _count: true,
    });

    const result: JobQueueStats = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      abandoned: 0,
    };

    for (const stat of stats) {
      result.total += stat._count;
      if (stat.status === JobStatus.PENDING) result.pending = stat._count;
      if (stat.status === JobStatus.PROCESSING) result.processing = stat._count;
      if (stat.status === JobStatus.COMPLETED) result.completed = stat._count;
      if (stat.status === JobStatus.FAILED) result.failed = stat._count;
      if (stat.status === JobStatus.ABANDONED) result.abandoned = stat._count;
    }

    return result;
  } catch (error) {
    console.error('[JobQueue] Failed to get queue stats:', error);
    return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, abandoned: 0 };
  }
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: string): Promise<boolean> {
  try {
    const job = await getJobById(jobId);
    if (!job) {
      console.warn(`[JobQueue] Job not found: ${jobId}`);
      return false;
    }

    if (job.retryCount >= job.maxRetries) {
      console.warn(`[JobQueue] Job has exceeded max retries: ${jobId}`);
      return false;
    }

    await updateJobStatus(jobId, JobStatus.PENDING, {
      error: undefined,
    });

    console.log(`[JobQueue] Job marked for retry: ${jobId}`);
    return true;
  } catch (error) {
    console.error('[JobQueue] Failed to retry job:', error);
    return false;
  }
}

/**
 * Abandon a job (mark as abandoned to prevent retries)
 */
export async function abandonJob(jobId: string): Promise<boolean> {
  try {
    await updateJobStatus(jobId, JobStatus.ABANDONED);
    console.log(`[JobQueue] Job abandoned: ${jobId}`);
    return true;
  } catch (error) {
    console.error('[JobQueue] Failed to abandon job:', error);
    return false;
  }
}

/**
 * Clean up old completed jobs
 */
export async function cleanupCompletedJobs(olderThanDays: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.backgroundJob.deleteMany({
      where: {
        AND: [{ completedAt: { lt: cutoffDate } }, { status: JobStatus.COMPLETED }],
      },
    });

    console.log(`[JobQueue] Cleaned up ${result.count} old completed jobs`);
    return (result as any).count || 0;
  } catch (error) {
    console.error('[JobQueue] Failed to cleanup jobs:', error);
    return 0;
  }
}

/**
 * Get configuration
 */
export function getQueueConfig(): JobQueueConfig {
  return { ...config };
}
