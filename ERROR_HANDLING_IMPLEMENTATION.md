# Error Handling Implementation Guide

This guide shows how to integrate the error handling system into your existing API endpoints and server actions.

## Quick Start

### 1. Import Error Handling Utilities

```typescript
import {
  apiSuccess,
  apiError,
  ErrorCode,
  retryWithBackoff,
  addToDeadLetterQueue,
  JobType,
  createAppError,
} from '@/lib/error-handling';
```

### 2. Update API Routes

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await someOperation(data);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**After:**
```typescript
import { apiSuccess, apiError, ErrorCode } from '@/lib/error-handling';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate input
    if (!data.required_field) {
      return apiError(
        createAppError(ErrorCode.VALIDATION_ERROR, {
          customMessage: 'Required field is missing',
        })
      );
    }
    
    const result = await someOperation(data);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
```

## Pattern 1: Simple Success/Error Response

```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return apiSuccess(data, { message: 'Data fetched successfully' });
  } catch (error) {
    return apiError(error);
  }
}
```

## Pattern 2: Validation with User Feedback

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email) {
      return apiError(
        createAppError(ErrorCode.VALIDATION_ERROR, {
          customMessage: 'Email address is required',
        })
      );
    }

    if (!isValidEmail(body.email)) {
      return apiError(
        createAppError(ErrorCode.VALIDATION_ERROR, {
          customMessage: 'Please enter a valid email address',
        })
      );
    }

    const result = await processEmail(body.email);
    return apiSuccess({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
```

## Pattern 3: Retry for Transient Failures

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let result;
    try {
      // Retry with exponential backoff
      result = await retryWithBackoff(
        () => externalApiCall(body),
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt) => {
            console.log(`Retry attempt ${attempt} for external API call`);
          },
        }
      );
    } catch (retryError) {
      // After retries exhausted, return user-friendly error
      return apiError(
        createAppError(ErrorCode.SERVICE_UNAVAILABLE, {
          context: { originalError: (retryError as Error).message },
        })
      );
    }

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
```

## Pattern 4: DLQ for Background Operations

```typescript
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAppAuth();
    const body = await request.json();

    // Main operation - critical path
    const enrollment = await enrollUser(auth.id, body.courseId);

    // Background operation - use DLQ fallback
    try {
      await sendEmailNotification(auth.email, enrollment);
    } catch (emailError) {
      // Don't fail the main operation, queue for retry
      await addToDeadLetterQueue(
        JobType.EMAIL_SEND,
        { userId: auth.id, enrollmentId: enrollment.id },
        emailError as Error,
        { maxRetries: 5, retryDelayMinutes: 10 }
      );
      console.warn('Email queued for retry due to error', emailError);
    }

    // Return success even if email failed
    return apiSuccess({
      enrollmentId: enrollment.id,
      message: 'Enrollment successful. Confirmation email will be sent shortly.',
    });
  } catch (error) {
    return apiError(error);
  }
}
```

## Pattern 5: Server Actions

```typescript
'use server';

import { serverActionSuccess, serverActionError, ActionResult } from '@/lib/error-handling';

export async function myServerAction(input: any): Promise<ActionResult> {
  try {
    // Validate
    if (!input.id) {
      return serverActionError(
        new Error('ID is required'),
        { code: ErrorCode.VALIDATION_ERROR }
      );
    }

    // Process with retry
    const result = await retryWithBackoff(
      () => processData(input),
      { maxRetries: 3 }
    );

    return serverActionSuccess(result);
  } catch (error) {
    return serverActionError(error);
  }
}
```

## Common Error Codes

| Code | Status | Use Case |
|------|--------|----------|
| `BAD_REQUEST` | 400 | Invalid request format |
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error (unknown) |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |
| `TIMEOUT` | 504 | Request timeout |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | 502 | External API failed |
| `INSUFFICIENT_FUNDS` | 402 | Payment issue |
| `ENROLLMENT_FAILED` | 400 | Enrollment failed |
| `PAYMENT_FAILED` | 402 | Payment failed |
| `EMAIL_SEND_FAILED` | 500 | Email failed |

## Checklist for API Updates

- [ ] Import error handling utilities
- [ ] Validate input with `VALIDATION_ERROR`
- [ ] Use `apiSuccess()` for successful responses
- [ ] Use `apiError()` for error responses
- [ ] Use `retryWithBackoff()` for transient operations
- [ ] Use `addToDeadLetterQueue()` for background operations
- [ ] Log errors with context
- [ ] Always return user-friendly messages
- [ ] Handle authentication/permission errors
- [ ] Test error scenarios

## Migration Path

### Phase 1: Add to New Endpoints
- Implement error handling for new API routes
- Use as reference for existing code

### Phase 2: Update Critical Endpoints
- Payment endpoints
- Enrollment endpoints
- Authentication endpoints

### Phase 3: Batch Update
- Remaining API endpoints
- Server actions

### Phase 4: Setup Monitoring
- Add DLQ status endpoint
- Setup cron job for DLQ processing
- Add dashboards/alerts

## Testing Error Scenarios

```typescript
// Test validation error
const response = await fetch('/api/enrollment', {
  method: 'POST',
  body: JSON.stringify({ courseId: null }),
});
// Expect: { ok: false, error: { code: 'VALIDATION_ERROR', ... } }

// Test retry behavior
const retryTest = await retryWithBackoff(
  () => {
    throw new Error('Rate limit exceeded');
  },
  { maxRetries: 2 }
);
// Expect: Retries 2 times before throwing

// Test DLQ
const jobId = await addToDeadLetterQueue(
  JobType.EMAIL_SEND,
  { email: 'test@example.com' },
  new Error('SMTP timeout')
);
// Expect: Job created and scheduled for retry
```

## Monitoring & Observability

### Metrics to Track
- Request success rate by endpoint
- Error distribution by error code
- Retry success rate
- DLQ job stats (pending, failed)
- Average response time

### Alerts to Setup
- DLQ jobs exceed threshold
- High error rate (>5%)
- Specific error codes spiking
- Jobs stuck in retry loop

## Performance Considerations

- Retry backoff starts at 1s, max 30s
- Default timeouts: 30s per operation
- DLQ processing: batch with 1s delays
- Cleanup: weekly for jobs >30 days old

## Security Notes

- User-friendly messages never expose details
- Technical errors logged server-side only
- Failed auth always returns `UNAUTHORIZED`
- Rate limits are enforced but not exposed
- DLQ admin endpoint requires admin role

## Troubleshooting

**Error: "Failed to add to DLQ"**
- Check database connection
- Verify migrati on was applied

**Error: "Retries exhausted"**
- Check if error is actually transient
- Increase `maxRetries` if needed
- Add to DLQ for manual retry

**Jobs stuck in DLQ**
- Check DLQ processor is running
- Verify cron job configuration
- Check job logs for errors

## Examples

See `lib/error-handling/examples/` for:
- `forgot-password-api.example.ts` - API endpoint
- `enrollment-server-action.example.ts` - Server action
- `dlq-processor.example.ts` - Background processing
- `dlq-admin-api.example.ts` - Admin monitoring
