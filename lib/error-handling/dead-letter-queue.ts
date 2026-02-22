/**
 * Dead Letter Queue (DLQ) System
 * Handles failed background jobs and async operations
 */

import { prisma } from '@/lib/db/prisma';

export enum JobType {
  EMAIL_SEND = 'EMAIL_SEND',
  ENROLLMENT = 'ENROLLMENT',
  PAYMENT_VERIFICATION = 'PAYMENT_VERIFICATION',
  SYNC_COURSES = 'SYNC_COURSES',
  SYNC_ENROLLMENTS = 'SYNC_ENROLLMENTS',
  NOTIFICATION = 'NOTIFICATION',
  WEBHOOK = 'WEBHOOK',
}

export interface DeadLetterJobPayload {
  [key: string]: unknown;
}

export async function addToDeadLetterQueue(
  jobType: JobType,
  payload: DeadLetterJobPayload,
  error: Error,
  options: {
    maxRetries?: number;
    retryDelayMinutes?: number;
  } = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelayMinutes = options.retryDelayMinutes ?? 5;

  try {
    const job = await prisma.deadLetterQueue.create({
      data: {
        jobType,
        payload,
        error: error.message,
        retryCount: 0,
        maxRetries,
        nextRetryAt: new Date(Date.now() + retryDelayMinutes * 60 * 1000),
      },
    });

    console.error(
      `[DLQ] Job added to dead letter queue: ${jobType} (ID: ${job.id})`,
      {
        error: error.message,
        payload,
        retryDelayMinutes,
      }
    );

    return job.id;
  } catch (e) {
    console.error('[DLQ] Failed to add job to dead letter queue', { error: e, jobType, payload });
    throw e;
  }
}

export async function getAllDeadLetterJobs(
  filters?: {
    jobType?: JobType;
    status?: 'pending' | 'failed' | 'all';
  }
) {
  try {
    const where: any = {};

    if (filters?.jobType) {
      where.jobType = filters.jobType;
    }

    if (filters?.status === 'pending') {
      where.nextRetryAt = { lte: new Date() };
      where.retryCount = { lt: filters?.jobType ? 999 : prisma.deadLetterQueue.fields.maxRetries };
    } else if (filters?.status === 'failed') {
      where.retryCount = { gte: prisma.deadLetterQueue.fields.maxRetries };
    }

    return await prisma.deadLetterQueue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('[DLQ] Failed to fetch jobs', error);
    return [];
  }
}

export async function getDeadLetterJobById(jobId: string) {
  try {
    return await prisma.deadLetterQueue.findUnique({
      where: { id: jobId },
    });
  } catch (error) {
    console.error('[DLQ] Failed to fetch job', error);
    return null;
  }
}

export async function retryDeadLetterJob(jobId: string): Promise<boolean> {
  try {
    const job = await prisma.deadLetterQueue.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      console.warn(`[DLQ] Job not found: ${jobId}`);
      return false;
    }

    if (job.retryCount >= job.maxRetries) {
      console.warn(`[DLQ] Job has exceeded max retries: ${jobId}`);
      return false;
    }

    await prisma.deadLetterQueue.update({
      where: { id: jobId },
      data: {
        retryCount: { increment: 1 },
        nextRetryAt: new Date(),
        error: 'Manual retry initiated',
      },
    });

    console.log(`[DLQ] Job marked for retry: ${jobId}`);
    return true;
  } catch (error) {
    console.error('[DLQ] Failed to retry job', error);
    return false;
  }
}

export async function markDeadLetterJobFailed(jobId: string): Promise<boolean> {
  try {
    await prisma.deadLetterQueue.update({
      where: { id: jobId },
      data: {
        retryCount: { increment: 1 },
      },
    });

    console.log(`[DLQ] Job marked as failed: ${jobId}`);
    return true;
  } catch (error) {
    console.error('[DLQ] Failed to mark job as failed', error);
    return false;
  }
}

export async function removeDeadLetterJob(jobId: string): Promise<boolean> {
  try {
    await prisma.deadLetterQueue.delete({
      where: { id: jobId },
    });

    console.log(`[DLQ] Job removed: ${jobId}`);
    return true;
  } catch (error) {
    console.error('[DLQ] Failed to remove job', error);
    return false;
  }
}

export async function getDeadLetterJobStats() {
  try {
    const total = await prisma.deadLetterQueue.count();
    const pending = await prisma.deadLetterQueue.count({
      where: {
        nextRetryAt: { lte: new Date() },
      },
    });
    const failed = await prisma.deadLetterQueue.count({
      where: {
        retryCount: {
          gte: prisma.deadLetterQueue.fields.maxRetries,
        },
      },
    });

    return { total, pending, failed };
  } catch (error) {
    console.error('[DLQ] Failed to get stats', error);
    return { total: 0, pending: 0, failed: 0 };
  }
}

export async function cleanupOldDeadLetterJobs(olderThanDays: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.deadLetterQueue.deleteMany({
      where: {
        AND: [
          { createdAt: { lt: cutoffDate } },
          { retryCount: { gte: prisma.deadLetterQueue.fields.maxRetries } },
        ],
      },
    });

    console.log(`[DLQ] Cleaned up ${result.count} old failed jobs`);
    return result.count;
  } catch (error) {
    console.error('[DLQ] Failed to cleanup old jobs', error);
    return 0;
  }
}
