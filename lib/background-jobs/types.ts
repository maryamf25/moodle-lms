/**
 * Background Job Queue Types
 */

export enum BackgroundJobType {
  // Email jobs
  EMAIL_PASSWORD_RESET = 'EMAIL_PASSWORD_RESET',
  EMAIL_ENROLLMENT_CONFIRMATION = 'EMAIL_ENROLLMENT_CONFIRMATION',
  EMAIL_PAYMENT_RECEIPT = 'EMAIL_PAYMENT_RECEIPT',
  EMAIL_SUPPORT_TICKET = 'EMAIL_SUPPORT_TICKET',
  EMAIL_NOTIFICATION = 'EMAIL_NOTIFICATION',

  // Notification jobs
  NOTIFICATION_SYSTEM = 'NOTIFICATION_SYSTEM',
  NOTIFICATION_COURSE_UPDATE = 'NOTIFICATION_COURSE_UPDATE',
  NOTIFICATION_ENROLLMENT = 'NOTIFICATION_ENROLLMENT',
  NOTIFICATION_PAYMENT = 'NOTIFICATION_PAYMENT',

  // Payment jobs
  PAYMENT_VERIFY = 'PAYMENT_VERIFY',
  PAYMENT_WEBHOOK = 'PAYMENT_WEBHOOK',
  REFUND_PROCESS = 'REFUND_PROCESS',

  // Moodle sync jobs
  MOODLE_SYNC_COURSES = 'MOODLE_SYNC_COURSES',
  MOODLE_SYNC_ENROLLMENTS = 'MOODLE_SYNC_ENROLLMENTS',
  MOODLE_SYNC_GRADES = 'MOODLE_SYNC_GRADES',
  MOODLE_SYNC_USERS = 'MOODLE_SYNC_USERS',
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  ABANDONED = 'ABANDONED',
}

export interface BackgroundJob {
  id: string;
  jobType: BackgroundJobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  priority: number; // 1=low, 5=high
  attempts: Array<{
    timestamp: Date;
    success: boolean;
    error?: string;
    duration: number;
  }>;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobProcessorContext {
  jobId: string;
  jobType: BackgroundJobType;
  payload: Record<string, unknown>;
  attempt: number;
}

export interface JobProcessorResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  retryable?: boolean;
}

export type JobProcessor = (
  context: JobProcessorContext
) => Promise<JobProcessorResult>;

export interface JobQueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  abandoned: number;
}

export interface JobQueueConfig {
  maxRetries: number;
  defaultPriority: number;
  processingConcurrency: number;
  lockTimeoutMs: number;
  pollIntervalMs: number;
  disabledJobTypes?: BackgroundJobType[];
}
