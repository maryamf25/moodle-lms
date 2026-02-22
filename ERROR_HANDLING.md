# Error Handling System (4.20)

This document describes the comprehensive error handling system for graceful API failures, user-friendly error messages, retry mechanisms, and dead letter queue management.

## Overview

The error handling system addresses:
- ✅ Graceful API failures with proper error classification
- ✅ User-friendly error messages for all error scenarios
- ✅ Automatic retry mechanisms for transient failures
- ✅ Dead letter queue for failed background jobs

## Architecture

### 1. Error Types & Classification

**File:** `lib/error-handling/types.ts`

```typescript
enum ErrorCode {
  // Client Errors
  BAD_REQUEST
  UNAUTHORIZED
  FORBIDDEN
  NOT_FOUND
  VALIDATION_ERROR
  RATE_LIMIT
  
  // Server Errors
  INTERNAL_ERROR
  SERVICE_UNAVAILABLE
  TIMEOUT
  DATABASE_ERROR
  EXTERNAL_SERVICE_ERROR
  
  // Business Logic Errors
  INSUFFICIENT_FUNDS
  ENROLLMENT_FAILED
  PAYMENT_FAILED
  EMAIL_SEND_FAILED
}
```

### 2. Error Messages

**File:** `lib/error-handling/errors.ts`

Maps technical errors to user-friendly messages:

```typescript
// Technical Error
throw new Error('DATABASE_CONNECTION_TIMEOUT')

// User Sees
"Could not access the database. Please try again."
```

**Features:**
- Automatic error classification
- User-friendly messages for all error codes
- Retryable error detection
- Error context preservation

### 3. Retry Mechanism

**File:** `lib/error-handling/retry.ts`

Implements exponential backoff with jitter:

```typescript
import { retryWithBackoff } from '@/lib/error-handling';

// Automatic retry for transient failures
const result = await retryWithBackoff(
  () => fetchFromMoodleAPI(),
  {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    timeoutMs: 30000,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error.message);
    }
  }
);
```

**Retryable Errors:**
- Rate limit errors
- Service unavailable
- Timeout errors
- External service errors
- Email send failures

**Non-retryable Errors:**
- Invalid requests
- Unauthorized access
- Not found errors
- Validation errors

### 4. Dead Letter Queue (DLQ)

**File:** `lib/error-handling/dead-letter-queue.ts`

Manages failed background jobs with automatic retry scheduling:

```typescript
import { addToDeadLetterQueue, JobType } from '@/lib/error-handling';

try {
  await sendEmailNotification(user);
} catch (error) {
  // Automatically schedule for retry
  await addToDeadLetterQueue(
    JobType.EMAIL_SEND,
    { userId: user.id, subject: 'Welcome' },
    error as Error,
    { maxRetries: 5, retryDelayMinutes: 10 }
  );
}
```

**Job Types:**
- `EMAIL_SEND` - Email sending failures
- `ENROLLMENT` - Course enrollment failures
- `PAYMENT_VERIFICATION` - Payment processing failures
- `SYNC_COURSES` - Course synchronization
- `SYNC_ENROLLMENTS` - Enrollment synchronization
- `NOTIFICATION` - In-app notification failures
- `WEBHOOK` - Webhook processing failures

**DLQ Operations:**

```typescript
// Get all pending jobs
const pendingJobs = await getAllDeadLetterJobs({ status: 'pending' });

// Retry a specific job
await retryDeadLetterJob(jobId);

// Get statistics
const stats = await getDeadLetterJobStats();
// { total: 45, pending: 12, failed: 5 }

// Cleanup old failed jobs
await cleanupOldDeadLetterJobs(30); // older than 30 days
```

### 5. API Response Handling

**File:** `lib/error-handling/api-response.ts`

Standardized API responses:

```typescript
import { apiSuccess, apiError } from '@/lib/error-handling';

// Success Response
export async function GET(request: NextRequest) {
  const data = await fetchData();
  return apiSuccess(data, { message: 'Data fetched successfully' });
}

// Error Response
export async function POST(request: NextRequest) {
  try {
    // ... operation
  } catch (error) {
    return apiError(error);
  }
}
```

**Response Format:**

Success (200):
```json
{
  "ok": true,
  "data": {...},
  "message": "Success"
}
```

Error (varies):
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests. Please wait a moment and try again."
  }
}
```

## Usage Examples

### Example 1: API Handler with Error Handling

```typescript
import { apiSuccess, apiError, retryWithBackoff } from '@/lib/error-handling';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Validate input
    if (!payload.email) {
      return apiError(ErrorCode.VALIDATION_ERROR);
    }
    
    // Call external service with retry
    const result = await retryWithBackoff(
      () => moodleAPI.createUser(payload),
      { maxRetries: 3 }
    );
    
    return apiSuccess({ userId: result.id }, { statusCode: 201 });
  } catch (error) {
    return apiError(error);
  }
}
```

### Example 2: Server Action with Error Handling

```typescript
import { serverActionSuccess, serverActionError, addToDeadLetterQueue } from '@/lib/error-handling';

export async function enrollUserAction(courseId: string): Promise<ActionResult> {
  try {
    const auth = await requireAppAuth();
    
    // Perform enrollment
    const enrollment = await moodleAPI.enroll(auth.moodleUserId, courseId);
    
    // Send confirmation email (with DLQ fallback)
    try {
      await sendEnrollmentEmail(auth.email, enrollment);
    } catch (emailError) {
      // Don't fail the entire operation, just queue for retry
      await addToDeadLetterQueue(
        JobType.EMAIL_SEND,
        { userId: auth.id, courseId },
        emailError as Error
      );
    }
    
    return serverActionSuccess({ enrollmentId: enrollment.id });
  } catch (error) {
    return serverActionError(error);
  }
}
```

### Example 3: Handling Retryable Failures

```typescript
import { retryWithBackoff, addToDeadLetterQueue } from '@/lib/error-handling';

async function syncCoursesFromMoodle() {
  try {
    await retryWithBackoff(
      () => moodleSync.fetchAndUpdateCourses(),
      {
        maxRetries: 5,
        baseDelayMs: 2000,
        onRetry: (attempt) => {
          console.log(`Course sync retry ${attempt}`);
        }
      }
    );
  } catch (error) {
    // After retries exhausted, add to DLQ for manual review
    await addToDeadLetterQueue(
      JobType.SYNC_COURSES,
      { timestamp: new Date() },
      error as Error,
      { maxRetries: 10 }
    );
  }
}
```

## Database Schema

```sql
CREATE TABLE "DeadLetterQueue" (
  id VARCHAR(191) PRIMARY KEY,
  jobType VARCHAR(191) NOT NULL,
  payload JSONB NOT NULL,
  error TEXT NOT NULL,
  retryCount INT DEFAULT 0,
  maxRetries INT DEFAULT 3,
  nextRetryAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "DeadLetterQueue_jobType_nextRetryAt" ON "DeadLetterQueue"(jobType, nextRetryAt);
CREATE INDEX "DeadLetterQueue_retryCount" ON "DeadLetterQueue"(retryCount);
CREATE INDEX "DeadLetterQueue_createdAt" ON "DeadLetterQueue"(createdAt);
```

## Admin Dashboard Integration

Add to admin dashboard to monitor DLQ:

```typescript
import { getDeadLetterJobStats, getAllDeadLetterJobs } from '@/lib/error-handling';

export async function DLQMonitoringPanel() {
  const stats = await getDeadLetterJobStats();
  const pendingJobs = await getAllDeadLetterJobs({ status: 'pending' });
  
  return (
    <div>
      <h2>Dead Letter Queue Status</h2>
      <p>Total Jobs: {stats.total}</p>
      <p>Pending Retries: {stats.pending}</p>
      <p>Failed: {stats.failed}</p>
      
      {pendingJobs.map(job => (
        <div key={job.id}>
          <p>{job.jobType} - Retry {job.retryCount}/{job.maxRetries}</p>
          <p>{job.error}</p>
          <button onClick={() => retryDeadLetterJob(job.id)}>Retry</button>
        </div>
      ))}
    </div>
  );
}
```

## Error Recovery Strategies

### Strategy 1: Immediate Retry
For transient failures (rate limits, timeouts):
```typescript
await retryWithBackoff(operation); // Automatic retry with backoff
```

### Strategy 2: Deferred Retry
For operations that fail but might succeed later:
```typescript
try {
  await operation();
} catch (error) {
  await addToDeadLetterQueue(JobType.X, payload, error);
}
```

### Strategy 3: Graceful Degradation
For non-critical operations:
```typescript
try {
  await sendOptionalNotification();
} catch {
  console.warn('Notification failed, continuing');
}
```

## Best Practices

1. **Always classify errors** - Use proper error codes
2. **Provide context** - Include relevant information in error context
3. **Don't expose internals** - Use user-friendly messages
4. **Retry wisely** - Only retry transient failures
5. **Monitor DLQ** - Regularly check for stuck jobs
6. **Clean up old jobs** - Run cleanup periodically
7. **Log everything** - Include error context for debugging

## Testing Error Scenarios

```typescript
import { ErrorCode, createAppError } from '@/lib/error-handling';

// Test retry mechanism
await retryWithBackoff(
  () => Promise.reject(new Error('Rate limit exceeded')),
  { maxRetries: 2 }
); // Should retry

// Test DLQ
await addToDeadLetterQueue(
  JobType.EMAIL_SEND,
  { email: 'test@example.com' },
  new Error('SMTP timeout')
);
```

## Monitoring & Alerting

Consider setting up alerts for:
- DLQ jobs exceeding retry count
- High rate of failed operations
- Jobs stuck in "pending" state for too long
- Pattern of specific error codes spiking

## Migration

Run the Prisma migration:
```bash
npx prisma migrate dev --name add_dead_letter_queue
```
