# Automatic Retry Logic for Transient Failures

## Overview

The API client now automatically retries failed requests that are caused by transient failures (temporary network issues, rate limiting, server hiccups). This ensures better resilience without requiring changes to component code.

---

## What Gets Retried

### ✅ Retried Errors (Transient)

| Error              | Status                  | Rationale                              |
| ------------------ | ----------------------- | -------------------------------------- |
| Network timeout    | ECONNABORTED, ETIMEDOUT | Likely temporary network issue         |
| Connection refused | ECONNREFUSED            | Server might be restarting             |
| Rate limiting      | 429 Too Many Requests   | Backend can handle later               |
| Server errors      | 5xx                     | Server hiccup, might succeed next time |
| Request timeout    | 408 Request Timeout     | Temporary issue                        |
| No network         | ENOTFOUND, EAI_AGAIN    | Network connectivity issue             |

### ❌ NOT Retried (Permanent)

| Error        | Status | Rationale                           |
| ------------ | ------ | ----------------------------------- |
| Bad request  | 400    | Invalid input, won't change         |
| Unauthorized | 401    | Auth issue, won't be fixed by retry |
| Forbidden    | 403    | Permissions issue, won't change     |
| Not found    | 404    | Resource doesn't exist              |
| Invalid data | 422    | Validation error                    |
| Conflict     | 409    | Data conflict                       |

---

## Default Configuration

```typescript
{
  maxRetries: 3,              // Max 3 attempts (1 initial + 2 retries)
  initialDelayMs: 1000,       // Start with 1 second delay
  maxDelayMs: 30000,          // Cap at 30 seconds
  backoffMultiplier: 2        // Exponential backoff (1s → 2s → 4s)
}
```

---

## How Retries Work

### Exponential Backoff with Jitter

Delays between retries follow an exponential backoff pattern with random jitter to prevent "thundering herd":

```
Attempt 1: Initial request (no delay)
Attempt 2: Wait ~1s + jitter (±10%), then retry
Attempt 3: Wait ~2s + jitter (±10%), then retry
Attempt 4: Wait ~4s + jitter (±10%), then retry
```

**Example timeline:**

```
t=0ms:    GET /documents/ → timeout
t=900ms:  Delay (1000ms - 100ms jitter)
t=1000ms: GET /documents/ → 503 Server Error
t=2900ms: Delay (2000ms + 100ms jitter)
t=3000ms: GET /documents/ → 200 OK ✓
```

### Jitter Prevents Cascading Failures

When multiple clients retry simultaneously after a server outage, jitter prevents them all from hitting the server at the exact same time:

```
Without jitter: All clients retry at t=1000ms, t=2000ms → overload server
With jitter:    Clients retry spread over t=900-1100ms, t=1900-2100ms → even load
```

---

## Console Logging

When a retry occurs, the client logs a warning:

```
[ApiClient] Request failed (ECONNABORTED), retrying in 950ms (attempt 1/3)
[ApiClient] Request failed (503), retrying in 1987ms (attempt 2/3)
```

This helps you:

- Monitor when transient failures occur
- Understand retry behavior during debugging
- See final success without code changes

---

## Customizing Retry Behavior

### Global Configuration

```typescript
import apiClient from "@/services/ApiClient";

// Set globally for all future requests
apiClient.setRetryConfig({
  maxRetries: 5, // More retries for unreliable networks
  initialDelayMs: 2000, // Wait longer initially
  maxDelayMs: 60000, // Cap at 1 minute
});

// Later, retrieve current config
const config = apiClient.getRetryConfig();
console.log(config.maxRetries); // 5
```

### Per-Request Customization

Individual endpoints can override retry behavior:

```typescript
// Retry aggressively for critical operations
async getImportantData() {
  return await this.executeWithRetry(
    () => this.client.get('/critical-data/'),
    'GET',
    5  // 5 retries instead of 3
  );
}

// Never retry mutations by default (already implemented)
async createDocument(data: FormData) {
  const response = await this.client.post('/documents/', data);
  return response.data;
}
```

---

## GET vs. Mutation Behavior

### GET Requests (Safe to Retry)

✅ **Automatically retried** up to `maxRetries` times

Getting the same data multiple times is safe:

```typescript
// Safe: Getting documents 3 times = getting documents 1 time
GET /documents/ → 503 → GET /documents/ → 503 → GET /documents/ → 200 ✓
```

### Mutations (POST/PATCH/DELETE - Not Retried)

❌ **Not retried by default** (unsafe)

Mutating the same data multiple times could create duplicates:

```typescript
// Unsafe: Creating a document 3 times = 3 documents!
POST /documents/ { title: 'Invoice' } → timeout → POST /documents/ → 201 ✓

// Result: Invoice created successfully BUT client never got response,
// so user retried manually → Now 2 invoices exist!
```

---

## Real-World Examples

### Example 1: Network Blip

```
t=0ms:    getDocuments() called
t=50ms:   Request sent, server receives it
t=1050ms: Client timeout (no response from server)
t=1900ms: Retry delay (1s + jitter)
t=1950ms: Request resent
t=2000ms: Server responds with 200 OK ✓
```

**Result:** User sees data loaded normally, no disruption.

### Example 2: Server Restart

```
t=0ms:    getDashboardStats() called
t=50ms:   Request sent
t=100ms:  Server crashes/restarts
t=500ms:  Server comes back online
t=1050ms: Client timeout
t=1900ms: Retry 1 → 503 Service Unavailable
t=3900ms: Retry 2 → 503 Service Unavailable (server still booting)
t=7900ms: Retry 3 → 200 OK ✓
```

**Result:** Dashboard appears after ~8 seconds, much better than failing immediately.

### Example 3: Rate Limiting

```
t=0ms:    search() called (from 100 users)
t=50ms:   Request sent to backend
t=100ms:  Backend at capacity, returns 429 Too Many Requests
t=1900ms: Retry with random jitter (900-1100ms each)
t=2000ms: ~10 users retry (others still backing off)
t=2200ms: Backend handles them, returns 200 OK ✓
```

**Result:** Requests naturally spread out, backend recovers gracefully.

---

## Code Examples

### Using in Components (No Changes Needed!)

Most components don't need to change:

```typescript
// Before AND After: exactly the same
const { data, loading, error } = useDocumentList({ page: 1 });

// If API fails transiently, it retries automatically
// If it succeeds, you get the data
// If it fails permanently, you get the error (after 3 retries)
```

### Manual API Calls

```typescript
import apiClient from "@/services/ApiClient";

// Automatically retries on transient failures
const docs = await apiClient.getDocuments({ page: 1 });

// Automatically retries on transient failures
const doc = await apiClient.getDocument("doc-123");

// Does NOT retry (mutations are unsafe to retry)
const created = await apiClient.createDocument(formData);

// If you want to retry a mutation, wrap it yourself:
// (This is NOT recommended - understand why first!)
async function createWithRetry(data) {
  const maxAttempts = 3;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await apiClient.createDocument(data);
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

### Handling Permanent Failures

```typescript
try {
  const docs = await apiClient.getDocuments({ search: "test" });
} catch (error) {
  // At this point, we've already retried 3 times and it still failed
  // This is likely a permanent error (401, 404, 422, etc.)

  if (error.response?.status === 401) {
    // Auth error - redirect to login
    window.location.href = "/login";
  } else if (error.response?.status === 404) {
    // Resource not found
    showError("Resource not found");
  } else {
    // Some other error
    showError(`Failed after retries: ${error.message}`);
  }
}
```

---

## Monitoring & Debugging

### Console Warnings

Enable browser console to see retry attempts:

```javascript
// In browser console, you'll see:
[ApiClient] Request failed (ECONNABORTED), retrying in 950ms (attempt 1/3)
[ApiClient] Request failed (503), retrying in 1987ms (attempt 2/3)
// (If it succeeds): No final message, data returns normally
// (If it fails): Error is thrown after final attempt
```

### Network Tab

In DevTools Network tab:

- You'll see multiple requests for the same URL
- All but the last one likely timed out or returned 5xx
- The last one should return 200

### React DevTools

Component data flows normally:

- `loading` → `true` (during all retries)
- Once any attempt succeeds → `data` populated, `loading` → `false`
- If all fail → `error` populated, `loading` → `false`

---

## Testing Retry Logic

### Simulate a Transient Failure

```typescript
// In development, temporarily modify ApiClient to test:
private isRetryableError(error: any): boolean {
  // Force retry for testing
  if (Math.random() < 0.5) return true;  // 50% of requests retry

  // Rest of logic...
}
```

### Network Throttling

Use Chrome DevTools to simulate slow/flaky networks:

1. Open DevTools → Network tab
2. Click throttling dropdown → Select "Slow 3G"
3. Now requests might timeout and trigger retries

### Mock Server Errors

If using MSW (Mock Service Worker):

```typescript
// handlers.ts
export const handlers = [
  // Fail 2 times, succeed on 3rd
  let attempts = 0;
  http.get('/documents/', () => {
    attempts++;
    if (attempts < 3) {
      return HttpResponse.error();
    }
    return HttpResponse.json({ results: [], total: 0 });
  }),
];
```

---

## Performance Impact

### Overhead (When Successful on First Try)

- ✅ Negligible: ~1ms additional check for retryability
- ✅ No extra network calls
- ✅ No delay

### Overhead (When Retrying)

```
Attempt 1:  50ms request + timeout (10s) = 10s total
Delay 1:    ~1s (with jitter)
Attempt 2:  50ms request + 503 = <100ms
Delay 2:    ~2s (with jitter)
Attempt 3:  50ms request + 200 OK = <100ms
Total:      ~13.2s (vs. immediate failure without retry)
```

**Trade-off:** +13 seconds of waiting vs. complete API failure. Usually worth it.

---

## Troubleshooting

### "Requests Are Still Timing Out"

**Cause:** Timeout is set too low

```typescript
// Default is 30s, some operations need more
apiClient.setRetryConfig({
  maxRetries: 5, // More attempts
  initialDelayMs: 5000, // Start with 5s delay
  maxDelayMs: 60000, // Cap at 1 minute
});
```

### "I'm Getting Duplicate Documents"

**Cause:** Mutation was retried manually (don't do this!)

```typescript
// ❌ BAD: This creates duplicates
async function createWithRetry(data) {
  try {
    return await apiClient.createDocument(data);
  } catch {
    return await apiClient.createDocument(data); // Creates 2nd copy!
  }
}

// ✅ GOOD: Let user retry if they want
try {
  const result = await apiClient.createDocument(data);
} catch (error) {
  // Show error, let user click "Retry" button manually
}
```

### "Why Isn't My Mutation Retrying?"

**Intentional:** POST/PATCH/DELETE are not automatically retried because retrying them could create duplicates. If a mutation times out, the operation might have succeeded on the server despite the timeout.

If you need to verify, check server state first:

```typescript
try {
  const created = await apiClient.createDocument(data);
} catch (error) {
  if (error.code === "ECONNABORTED") {
    // Might have been created - check server
    const existing = await apiClient.getDocuments({ search: data.title });
    if (existing.total > 0) {
      // It was created! Return existing
      return existing.items[0];
    }
  }
  throw error;
}
```

---

## Best Practices

1. ✅ **Trust the automatic retries** - Don't wrap API calls in your own retry logic
2. ✅ **Handle permanent errors** - 401, 404, 422 won't be retried, handle them
3. ✅ **Don't retry mutations** - POST/PATCH/DELETE are not retried (by design)
4. ✅ **Log failures** - After all retries fail, log to error tracking service
5. ❌ **Don't assume success** - A successful request took 13s due to retries, that's OK
6. ❌ **Don't manually retry mutations** - Could create duplicates

---

## Summary

| Feature             | Behavior                                    |
| ------------------- | ------------------------------------------- |
| Automatic retries   | ✅ GET requests only                        |
| Exponential backoff | ✅ 1s → 2s → 4s (capped at 30s)             |
| Jitter              | ✅ Random ±10% to prevent thundering herd   |
| Console logging     | ✅ "Request failed (code), retrying in Xms" |
| Customizable        | ✅ `setRetryConfig()` for global changes    |
| Safe mutations      | ✅ POST/PATCH/DELETE not retried            |
| Idempotent GETs     | ✅ Always retried                           |

**Result:** Better resilience, fewer user complaints, same code. 🎯
