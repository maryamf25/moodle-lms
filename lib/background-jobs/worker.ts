/**
 * Background Job Worker
 * Processes queued jobs with error handling and retries
 */

import {
  BackgroundJobType,
  JobStatus,
  JobProcessorResult,
} from './types';
import {
  getNextPendingJob,
  markJobProcessing,
  recordJobSuccess,
  markJobFailed,
  getQueueConfig,
  getQueueStats,
  getJobById,
  updateJobStatus,
} from './queue';
import { getProcessor } from './processors';
import { retryWithBackoff } from '@/lib/error-handling';

let isProcessing = false;
let processorInterval: NodeJS.Timeout | null = null;

/**
 * Start background job processor
 */
export async function startJobProcessor(): Promise<void> {
  if (isProcessing) {
    console.warn('[JobWorker] Job processor is already running');
    return;
  }

  isProcessing = true;
  console.log('[JobWorker] Starting background job processor');

  const config = getQueueConfig();

  // Process jobs continuously
  processorInterval = setInterval(async () => {
    await processNextBatch();
  }, config.pollIntervalMs);

  // Also process immediately
  await processNextBatch();
}

/**
 * Stop background job processor
 */
export function stopJobProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
  isProcessing = false;
  console.log('[JobWorker] Stopped background job processor');
}

/**
 * Process next batch of jobs
 */
async function processNextBatch(): Promise<void> {
  try {
    const config = getQueueConfig();

    for (let i = 0; i < config.processingConcurrency; i++) {
      const job = await getNextPendingJob();
      if (!job) break;

      // Process job asynchronously (don't await)
      processJob(job.id).catch((error) => {
        console.error('[JobWorker] Uncaught error processing job:', error);
      });
    }
  } catch (error) {
    console.error('[JobWorker] Error in processNextBatch:', error);
  }
}

/**
 * Process a single job
 */
export async function processJob(jobId: string): Promise<JobProcessorResult | null> {
  const job = await getJobById(jobId);

  if (!job) {
    console.warn('[JobWorker] Job not found:', jobId);
    return null;
  }

  if (job.status === JobStatus.PROCESSING) {
    console.warn('[JobWorker] Job is already being processed:', jobId);
    return null;
  }

  try {
    // Mark as processing
    await markJobProcessing(jobId);
    console.log(
      `[JobWorker] Processing job: ${job.jobType} (ID: ${jobId}, attempt ${job.retryCount + 1}/${job.maxRetries})`
    );

    // Get the processor
    const processor = getProcessor(job.jobType as BackgroundJobType);

    if (!processor) {
      throw new Error(`No processor found for job type: ${job.jobType}`);
    }

    let result: JobProcessorResult;

    // Execute processor with retry mechanism for transient failures
    try {
      result = await retryWithBackoff(
        () =>
          processor({
            jobId,
            jobType: job.jobType as BackgroundJobType,
            payload: job.payload,
            attempt: job.retryCount + 1,
          }),
        {
          maxRetries: 0, // No built-in retries, we handle retries in the job queue
          timeoutMs: 60000,
        }
      );
    } catch (processorError) {
      throw processorError;
    }

    if (result.success) {
      // Job succeeded
      await recordJobSuccess(jobId, result.result);
      console.log(`[JobWorker] Job completed successfully: ${jobId}`);
      return result;
    } else {
      // Job failed
      const error = new Error(result.error || 'Job processor returned failure');
      await markJobFailed(jobId, error, result.retryable !== false);
      return result;
    }
  } catch (error) {
    // Unexpected error
    console.error(`[JobWorker] Job processing failed: ${jobId}`, error);
    const jobError = error instanceof Error ? error : new Error(String(error));
    await markJobFailed(jobId, jobError, true);
    return null;
  }
}

/**
 * Get current processor status
 */
export async function getProcessorStatus(): Promise<{
  running: boolean;
  stats: any;
  config: any;
}> {
  const stats = await getQueueStats();
  const config = getQueueConfig();

  return {
    running: isProcessing,
    stats,
    config,
  };
}

/**
 * Manually trigger job processing (useful for testing)
 */
export async function triggerJobProcessing(): Promise<void> {
  console.log('[JobWorker] Manually triggering job processing');
  await processNextBatch();
}

/**
 * Monitor job completion
 */
export async function waitForJobCompletion(jobId: string, timeoutMs: number = 300000): Promise<JobStatus | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const job = await getJobById(jobId);

    if (!job) {
      return null;
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED || job.status === JobStatus.ABANDONED) {
      return job.status;
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.warn('[JobWorker] Timeout waiting for job completion:', jobId);
  return null;
}
