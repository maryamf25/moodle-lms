/**
 * Example: DLQ Monitoring API Endpoint
 * Provides admin interface to view and manage dead letter queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAppAuth } from '@/lib/auth/server-session';
import {
  getAllDeadLetterJobs,
  getDeadLetterJobStats,
  retryDeadLetterJob,
  removeDeadLetterJob,
  JobType,
  apiSuccess,
  apiError,
  ErrorCode,
  createAppError,
} from '@/lib/error-handling';

/**
 * GET /api/admin/dlq
 * Fetch DLQ jobs and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAppAuth();

    // Only admins can view DLQ
    if (auth?.role !== 'admin') {
      return apiError(createAppError(ErrorCode.FORBIDDEN));
    }

    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get('status') as 'pending' | 'failed' | 'all' || 'all';
    const jobType = searchParams.get('jobType') as JobType | null;

    const jobs = await getAllDeadLetterJobs({ status, jobType: jobType || undefined });
    const stats = await getDeadLetterJobStats();

    return apiSuccess({
      stats,
      jobs: jobs.map((job) => ({
        id: job.id,
        jobType: job.jobType,
        error: job.error,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        nextRetryAt: job.nextRetryAt,
        createdAt: job.createdAt,
        canRetry: job.retryCount < job.maxRetries,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * POST /api/admin/dlq/retry
 * Manually retry a specific job
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppAuth();

    // Only admins can retry jobs
    if (auth?.role !== 'admin') {
      return apiError(createAppError(ErrorCode.FORBIDDEN));
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return apiError(
        createAppError(ErrorCode.VALIDATION_ERROR, {
          customMessage: 'Job ID is required',
        })
      );
    }

    const success = await retryDeadLetterJob(jobId);

    if (!success) {
      return apiError(
        createAppError(ErrorCode.NOT_FOUND, {
          customMessage: 'Job not found or already exhausted retries',
        })
      );
    }

    return apiSuccess({ success: true, message: 'Job marked for retry' });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * DELETE /api/admin/dlq
 * Remove a job from DLQ (for successful jobs or to discard)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAppAuth();

    // Only admins can delete jobs
    if (auth?.role !== 'admin') {
      return apiError(createAppError(ErrorCode.FORBIDDEN));
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return apiError(
        createAppError(ErrorCode.VALIDATION_ERROR, {
          customMessage: 'Job ID is required',
        })
      );
    }

    const success = await removeDeadLetterJob(jobId);

    if (!success) {
      return apiError(
        createAppError(ErrorCode.NOT_FOUND, {
          customMessage: 'Job not found',
        })
      );
    }

    return apiSuccess({ success: true, message: 'Job removed' });
  } catch (error) {
    return apiError(error);
  }
}
