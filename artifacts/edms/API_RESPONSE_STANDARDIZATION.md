# API Response Standardization

## Overview

All API endpoints in the EDMS application now return standardized response shapes, making it easier to:

- Build reusable hooks and components
- Handle pagination consistently
- Test and debug API integration
- Reduce edge cases and branching logic

---

## Standard Response Shapes

### 1. **List Endpoints** → `NormalizedListResult<T>`

All `GET /endpoint/` calls return a normalized pagination object:

```typescript
interface NormalizedListResult<T> {
  items: T[]; // The actual data array
  total: number; // Total count of all items
  page: number; // Current page (1-indexed)
  pageSize: number; // Items per page
  hasMore: boolean; // Whether more items exist beyond current page
}
```

**Example:**

```typescript
const result = await apiClient.getDocuments({
  page: 1,
  pageSize: 15,
  search: 'invoice'
});

// Returns:
{
  items: [Document, Document, ...],
  total: 247,
  page: 1,
  pageSize: 15,
  hasMore: true  // More pages exist
}
```

### 2. **Single Item Endpoints** → `T`

All `GET /endpoint/:id` calls return the item directly:

```typescript
const doc = await apiClient.getDocument("doc-123");
// Returns: Document
```

### 3. **Mutation Endpoints** → `T`

POST/PATCH/PUT/DELETE operations return the affected item:

```typescript
const updated = await apiClient.updateDocument("doc-123", {
  status: "APPROVED",
});
// Returns: Document (with new data)
```

---

## Affected Endpoints

### List Endpoints (all now return `NormalizedListResult<T>`)

| Endpoint         | Method             | Returns                              | New Signature                             |
| ---------------- | ------------------ | ------------------------------------ | ----------------------------------------- |
| `/documents/`    | `getDocuments()`   | `NormalizedListResult<Document>`     | `getDocuments(query?: ListQueryParams)`   |
| `/work-records/` | `getWorkRecords()` | `NormalizedListResult<WorkRecord>`   | `getWorkRecords(query?: ListQueryParams)` |
| `/pl-items/`     | `getPlItems()`     | `NormalizedListResult<PLNumber>`     | `getPlItems(query?: ListQueryParams)`     |
| `/cases/`        | `getCases()`       | `NormalizedListResult<CaseRecord>`   | `getCases(query?: ListQueryParams)`       |
| `/approvals/`    | `getApprovals()`   | `NormalizedListResult<Approval>`     | `getApprovals(query?: ListQueryParams)`   |
| `/ocr/jobs/`     | `getOcrJobs()`     | `NormalizedListResult<OcrJob>`       | `getOcrJobs(query?: ListQueryParams)`     |
| `/audit/log/`    | `getAuditLog()`    | `NormalizedListResult<AuditEntry>`   | `getAuditLog(query?: ListQueryParams)`    |
| `/search/`       | `search()`         | `NormalizedListResult<SearchResult>` | `search(query: string, scope?: string)`   |

---

## Query Parameters

All list endpoints accept standardized query parameters:

```typescript
interface ListQueryParams {
  page?: number; // Default: 1
  pageSize?: number; // Default: 15
  search?: string; // Search term
  sort?: string; // Sort field (e.g., '-date', 'name')
  filters?: Record<string, any>; // Custom filters
}
```

**Usage:**

```typescript
// Page 2, search for invoices, sorted by date descending
const result = await apiClient.getDocuments({
  page: 2,
  pageSize: 20,
  search: "invoice",
  sort: "-date",
  filters: { status: "APPROVED" },
});
```

---

## Migration Guide

### For Components Using Old Shape

**Before:**

```typescript
const { documents } = useDocuments();
// documents was: Document[] or null

documents.map(d => <DocumentRow key={d.id} doc={d} />)
```

**After (Option 1 - Use legacy hooks for compatibility):**

```typescript
const { documents } = useDocuments();
// Still returns Document[], backwards compatible!

documents.map(d => <DocumentRow key={d.id} doc={d} />)
```

**After (Option 2 - Use new pagination-aware hooks):**

```typescript
const { data, loading, error } = useDocumentList({
  page: currentPage,
  pageSize: 15
});

return (
  <>
    {data?.items.map(d => <DocumentRow key={d.id} doc={d} />)}
    <Pagination
      page={data?.page}
      total={data?.total}
      pageSize={data?.pageSize}
      hasMore={data?.hasMore}
    />
  </>
);
```

### For Pages Using Raw API Calls

**Before:**

```typescript
const response = await apiClient.getDocuments({ search: "test" });
// Could return: Document[] or { results: Document[], count: number, ... }
// Inconsistent shape!

const items = response.results || response;
const total = response.count || response.length;
```

**After:**

```typescript
const result = await apiClient.getDocuments({ search: "test" });
// Always returns: NormalizedListResult<Document>

const { items, total, page, pageSize, hasMore } = result;
// Type-safe and predictable!
```

---

## Backwards Compatibility

✅ **Legacy hooks still work:**

```typescript
// These still exist and return the old shape for backwards compatibility
useDocuments(); // Returns { documents, loading, error, refetch, ... }
useWorkRecords(); // Returns { records, loading, error, refetch, ... }
```

⚠️ **They're marked as @deprecated** — migrate to new hooks when updating pages:

```typescript
// NEW: Pagination-aware hooks
useDocumentList(query?)   // Returns { data: NormalizedListResult, loading, error, refetch, ... }
useWorkRecordList(query?) // Returns { data: NormalizedListResult, loading, error, refetch, ... }
```

---

## Benefits

### 1. **Predictable Data Shapes**

```typescript
// Always safe to access
result.items        ✅ Never undefined
result.total        ✅ Always a number
result.page         ✅ Always >= 1
result.hasMore      ✅ Always boolean
```

### 2. **Type Safety**

```typescript
// TypeScript catches mistakes
const items: Document[] = result.items; // ✅ Type-safe
const count = result.total; // ✅ Type-safe
const x = result.count; // ❌ Compile error
```

### 3. **Easier Pagination**

```typescript
// Before: Implement pagination logic in each component
// After: Built-in pagination info

if (result.hasMore) {
  // Load next page
}
```

### 4. **Better Testing**

```typescript
// Mock data shape is always consistent
const mockResult: NormalizedListResult<Document> = {
  items: [doc1, doc2],
  total: 2,
  page: 1,
  pageSize: 15,
  hasMore: false,
};
```

---

## Implementation Details

### Response Normalization

The ApiClient includes a `normalizeListResponse()` helper that:

- Handles both paginated and non-paginated responses
- Converts legacy array responses to standard shape
- Calculates `hasMore` based on pagination math
- Sets sensible defaults

```typescript
// Handles all these formats:
{ results: [], total: 0 }           // Standard paginated
[...]                               // Array response
{ data: [], count: 0 }              // Alternative format
```

### Mock Data Fallback

When the API is unavailable, the client returns properly formatted mock data:

```typescript
// If getDocuments() fails, returns:
{
  items: MOCK_DOCUMENTS,
  total: MOCK_DOCUMENTS.length,
  page: 1,
  pageSize: 15,
  hasMore: false
}
```

---

## API Documentation (in ApiClient)

Every method now includes JSDoc comments:

```typescript
/**
 * Get paginated list of documents
 * Returns: NormalizedListResult<Document>
 */
async getDocuments(query?: ListQueryParams): Promise<NormalizedListResult<any>>
```

Hover over any API method in your IDE to see:

- Return type
- Parameter structure
- Usage examples

---

## Common Patterns

### Pagination + Search

```typescript
const [page, setPage] = useState(1);
const [search, setSearch] = useState('');

const { data, loading } = useDocumentList({
  page,
  pageSize: 15,
  search
});

return (
  <>
    <Input
      value={search}
      onChange={e => {
        setSearch(e.target.value);
        setPage(1); // Reset to page 1 on search
      }}
    />

    {data?.items.map(doc => <DocumentRow key={doc.id} doc={doc} />)}

    {data?.hasMore && (
      <Button onClick={() => setPage(p => p + 1)}>
        Load More
      </Button>
    )}
  </>
);
```

### Polling with Updated Data

```typescript
const { data, refetch } = useDocumentList();

// Refresh every 5 seconds
useEffect(() => {
  const timer = setInterval(() => refetch(), 5000);
  return () => clearInterval(timer);
}, [refetch]);
```

### Filtering + Sorting

```typescript
const { data } = useDocumentList({
  page: 1,
  pageSize: 15,
  sort: sortField === "date" && sortDir === "asc" ? "date" : "-date",
  filters: {
    status: selectedStatus,
    category: selectedCategory,
  },
});
```

---

## What Changed in Files

### `lib/types.ts`

- Added: `ApiListResponse<T>`, `ApiItemResponse<T>`, `ApiMutationResponse<T>`
- Added: `ListQueryParams`, `NormalizedListResult<T>`
- Added: `ApiErrorDetail`, `ApiErrorResponse`

### `services/ApiClient.ts`

- Added: Response normalization helper
- Updated: All list methods to return `NormalizedListResult<T>`
- Added: JSDoc comments for all methods
- Maintained: All existing method signatures (backwards compatible)

### `hooks/useApi.ts`

- Added: `useDocumentList()`, `useWorkRecordList()` (new pagination-aware hooks)
- Updated: `useDocuments()`, `useWorkRecords()` (now use new hooks internally)
- Marked: Old hooks as @deprecated but still functional

---

## Next Steps

1. **Update data-heavy pages** to use new pagination-aware hooks:
   - DocumentHub
   - WorkLedger
   - Cases
   - PLKnowledgeHub
   - AuditLog

2. **Add actual pagination UI** to these pages (currently shows all in-memory)

3. **Add debounced search** to prevent excessive API calls

4. **Add error boundaries** around risky sections

---

## Questions?

All response shapes are defined in `lib/types.ts` with full JSDoc comments.
All API methods are documented in `services/ApiClient.ts`.
