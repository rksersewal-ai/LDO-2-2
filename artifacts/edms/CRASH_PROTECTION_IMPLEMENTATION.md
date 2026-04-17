# Crash Protection & Request Cancellation Implementation Guide

## Overview

This guide documents the implementation of:

1. **Request Cancellation (AbortSignal)** — prevents race conditions on rapid filter changes
2. **Crash Protection (ErrorBoundary + SafeSection)** — prevents table/chart crashes from breaking entire page

## Files Created

### 1. `src/hooks/useAbortOnNavigate.ts` ✅

Provides three hooks for abort signal management:

- **`useAbortOnNavigate()`** — Auto-abort requests when route changes

  ```typescript
  const signal = useAbortOnNavigate();
  await apiClient.getDocuments({...}, signal);
  ```

- **`useAbortController()`** — Manual abort control with reset

  ```typescript
  const { signal, abort, reset } = useAbortController();
  ```

- **`useDebouncedAbort(delayMs)`** — Debounced abort for rapid filter changes
  ```typescript
  const getSignal = useDebouncedAbort(300);
  useEffect(() => {
    getSignal().then(signal => apiClient.search({...}, signal));
  }, [filters]);
  ```

### 2. `src/components/ui/TableSafeWrapper.tsx` ✅

Drop-in wrapper for table sections with built-in crash protection:

```typescript
<TableSafeWrapper
  isLoading={loading}
  error={error}
  onRetry={refetch}
  itemCount={items.length}
  name="WorkLedgerTable"
>
  <table>...</table>
</TableSafeWrapper>
```

Features:

- Auto-handles loading state
- Error boundary isolation
- Empty state with retry
- Min height enforcement

### 3. Enhanced ApiClient ✅

Import validation already added:

```typescript
import { safeValidate } from "../lib/validation";
```

Ready for AbortSignal parameter on all methods.

---

## Implementation Checklist

### Critical Pages (Apply Now)

#### ✅ WorkLedger.tsx

- [ ] Import `useAbortOnNavigate` and `TableSafeWrapper`
- [ ] Wrap main table with `<TableSafeWrapper>`
- [ ] Add abort signal to API calls

#### ✅ DocumentHub.tsx

- [ ] Wrap document grid with `<TableSafeWrapper>`
- [ ] Add abort on filter changes

#### ✅ SearchExplorer.tsx

- [ ] Use `useDebouncedAbort` for search debouncing
- [ ] Wrap results section with SafeSection
- [ ] Pass abort signal to search API calls

#### ✅ AuditLog.tsx

- [ ] Wrap table with `<TableSafeWrapper>`
- [ ] Add abort on filter/date changes

### High Priority Pages

#### Cases.tsx

- Wrap cases list with SafeSection

#### Approvals.tsx

- Wrap approvals list with SafeSection

#### BOMExplorer.tsx, BOMProductView.tsx

- Wrap BOM data with SafeSection

#### PLKnowledgeHub.tsx

- Wrap PL list with SafeSection

#### OCRMonitor.tsx

- Wrap OCR jobs table with SafeSection

#### Reports.tsx

- Wrap report sections with SafeSection

### Medium Priority Pages

#### AdminWorkspace.tsx, Settings.tsx, BannerManagement.tsx

- Wrap data sections with SafeSection

#### DocumentDetail.tsx, PLDetail.tsx, DocumentIngestion.tsx

- Add SafeSection to form sections

#### DocumentTemplates.tsx

- Wrap template gallery with SafeSection

---

## API Client Abort Support

Once ApiClient is updated to support AbortSignal parameter:

```typescript
// In ApiClient.ts methods
async getList<T>(endpoint: string, params?: any, signal?: AbortSignal) {
  return this.client.get<ApiListResponse<T>>(endpoint, {
    params,
    signal, // ← Pass to axios
  });
}
```

Then use in services:

```typescript
// In DocumentService or other services
async getDocuments(params?: any, signal?: AbortSignal) {
  const response = await apiClient.get('/documents/', params, signal);
  const validated = validateDocumentList(response.data);
  return validated.success ? validated.data.results : [];
}
```

---

## Rapid Filter Changes Pattern

For pages with many filter options (SearchExplorer, AuditLog, DocumentHub):

```typescript
// Instead of this (causes request floods):
useEffect(() => {
  fetchResults(filters); // Fires on every filter change
}, [filters]);

// Do this (debounces + cancels old requests):
const getAbortSignal = useDebouncedAbort(300);

useEffect(() => {
  getAbortSignal().then((signal) => {
    fetchResults(filters, signal); // Cancels previous request
  });
}, [filters]);
```

---

## Table Rendering Pattern

Instead of:

```typescript
{loading && <LoadingState />}
{error && <ErrorState />}
<table>...</table>
```

Use wrapper:

```typescript
<TableSafeWrapper
  isLoading={loading}
  error={error}
  onRetry={refetch}
  itemCount={items.length}
  name="MyDataTable"
>
  <table>...</table>
</TableSafeWrapper>
```

Benefits:

- Automatic error isolation (table crash doesn't break page)
- Consistent UX across all tables
- Built-in retry mechanism
- Empty state handling

---

## Testing Checklist

### Crash Protection

- [ ] Open WorkLedger
- [ ] Rapidly click filters
- [ ] Should not cause page crash
- [ ] Should show loading → results

- [ ] Open table and disable JavaScript in DevTools
- [ ] Table should show error state, not crash page

### Request Cancellation

- [ ] Open SearchExplorer
- [ ] Type rapidly in search box
- [ ] DevTools Network tab should show old requests cancelled
- [ ] Only final request completes

- [ ] Open DocumentHub
- [ ] Change filters rapidly
- [ ] Network tab should show request cancellations
- [ ] No orphaned in-flight requests after navigation

---

## Rollout Strategy

### Phase 1 (Now) ✅

- ✅ Create utilities (useAbortOnNavigate, TableSafeWrapper)
- ✅ Create validation schemas
- Apply to critical pages:
  - WorkLedger, DocumentHub, SearchExplorer, AuditLog

### Phase 2 (Next)

- Apply to high-priority pages:
  - Cases, Approvals, BOM, PL, OCRMonitor

### Phase 3 (Polish)

- Apply to all remaining pages
- Add comprehensive error logging
- Performance monitoring

---

## Code Examples

### WorkLedger Integration

```typescript
import { useAbortOnNavigate } from '../hooks/useAbortOnNavigate';
import { TableSafeWrapper } from '../components/ui/TableSafeWrapper';

export default function WorkLedger() {
  const signal = useAbortOnNavigate();
  // ... existing code ...

  return (
    <div className="space-y-5">
      {/* ... filters, KPIs, etc ... */}

      <TableSafeWrapper
        isLoading={loading}
        error={error}
        onRetry={refetch}
        itemCount={paginated.length}
        name="WorkLedgerTable"
      >
        <table>
          {/* table content */}
        </table>
      </TableSafeWrapper>

      {/* ... pagination ... */}
    </div>
  );
}
```

### SearchExplorer Integration

```typescript
import { useDebouncedAbort } from '../hooks/useAbortOnNavigate';

export default function SearchExplorer() {
  const getAbortSignal = useDebouncedAbort(300);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    getAbortSignal()
      .then(signal => SearchService.searchAll(query, 'ALL', signal))
      .then(results => {
        setResults(results);
        setError(null);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err);
        }
      })
      .finally(() => setLoading(false));
  }, [query, getAbortSignal]);

  return (
    <SafeSection
      name="Search Results"
      isLoading={loading}
      error={error}
      onRetry={() => setQuery(query)} // Re-trigger search
    >
      {results.length === 0 ? (
        <EmptyState />
      ) : (
        <div>{/* render results */}</div>
      )}
    </SafeSection>
  );
}
```

---

## Files Modified Summary

### Created

- ✅ `src/hooks/useAbortOnNavigate.ts`
- ✅ `src/components/ui/TableSafeWrapper.tsx`
- ✅ `src/lib/validation.ts`

### To Modify (Priority Order)

1. `src/pages/WorkLedger.tsx` — Add SafeSection + abort
2. `src/pages/DocumentHub.tsx` — Add SafeSection + abort
3. `src/pages/SearchExplorer.tsx` — Add debounced abort
4. `src/pages/AuditLog.tsx` — Add SafeSection + abort
5. `src/services/ApiClient.ts` — Add AbortSignal parameter
6. Other pages — Apply SafeSection pattern

---

## References

- React: useEffect cleanup, AbortController
- Axios: AbortSignal support (native)
- ErrorBoundary: Already implemented in `src/components/ui/ErrorBoundary.tsx`
- SafeSection: Already implemented in `src/components/ui/SafeSection.tsx`
