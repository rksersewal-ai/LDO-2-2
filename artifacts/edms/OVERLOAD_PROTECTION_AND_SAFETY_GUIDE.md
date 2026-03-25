# Overload Protection & Action Safety Implementation Guide

## Overview

This guide documents the implementation of:
1. **Overload Protection** — Debounce, throttle, and concurrency limiting
2. **Action Safety** — Safe delete patterns with soft delete (no data loss)
3. **Spacing/Typography Normalization** — CSS variables for consistent UX

---

## 1. OVERLOAD PROTECTION ✅ IMPLEMENTED

### File Created: `src/hooks/useOverloadProtection.ts`

Five production-ready hooks for preventing browser/server overload:

#### `useDebounce(value, delayMs)`
Delays expensive operations until user stops changing input

```typescript
const debouncedSearch = useDebounce(searchQuery, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch); // Fires only 300ms after last keystroke
  }
}, [debouncedSearch]);
```

**Use Cases:** Search, filter changes, form validation

---

#### `useThrottle(value, intervalMs)`
Limits how frequently a function can be called

```typescript
const throttledScroll = useThrottle(scrollY, 100);

useEffect(() => {
  console.log('Scroll position:', throttledScroll); // Max once per 100ms
}, [throttledScroll]);
```

**Use Cases:** Scroll events, resize handlers, continuous telemetry

---

#### `useDebouncedCallback(callback, delayMs, deps)`
Combines useCallback with debounce for handlers

```typescript
const debouncedSearch = useDebouncedCallback((query) => {
  SearchService.searchAll(query, 'ALL');
}, 300, []);

<Input
  value={query}
  onChange={(e) => debouncedSearch(e.target.value)}
/>
```

**Use Cases:** Input handlers, filter changes, auto-save

---

#### `useThrottledCallback(callback, intervalMs, deps)`
Combines useCallback with throttle for handlers

```typescript
const throttledResize = useThrottledCallback(() => {
  recalculateLayout();
}, 100, []);

useEffect(() => {
  window.addEventListener('resize', throttledResize);
  return () => window.removeEventListener('resize', throttledResize);
}, [throttledResize]);
```

**Use Cases:** Scroll listeners, resize handlers, window events

---

#### `useConcurrencyLimiter(maxConcurrent)`
Prevents request floods on bulk operations

```typescript
const limiter = useConcurrencyLimiter(3); // Max 3 concurrent requests

const handleBulkDelete = async (ids: string[]) => {
  for (const id of ids) {
    await limiter.run(async () => {
      await deleteRecord(id);
    });
  }
};
```

**Use Cases:** Bulk imports, batch exports, bulk updates

---

#### `useBatcher(batchFn, flushDelayMs, maxBatchSize)`
Groups rapid updates into single async operation

```typescript
const batcher = useBatcher(performBulkUpdate, 300, 50);

items.forEach(item => {
  batcher.add(item); // Batches up to 50 items or 300ms idle
});

// Later, check if still processing
if (batcher.pending === 0) {
  // All items processed
}
```

**Use Cases:** Bulk form submissions, batch notifications, grouped mutations

---

## 2. ACTION SAFETY ✅ IMPLEMENTED

### File Created: `src/components/ui/SafeActionButton.tsx`

#### Design Principle: NO HARD DELETES
- All deletions are **soft deletes** (archived/marked inactive)
- Data is recoverable — nothing permanently lost
- Confirmation required before any state change

---

### SafeActionButton Component

Safe wrapper for dangerous actions (delete, archive, disable)

```typescript
<SafeActionButton
  action="delete"
  itemName="Work Record WR-2026-001"
  onConfirm={async () => {
    await softDeleteRecord(id); // Soft delete, not hard delete
  }}
  message="This record will be marked as archived. You can restore it later."
>
  <Trash2 className="w-4 h-4" /> Delete
</SafeActionButton>
```

**Props:**
- `action`: 'delete' | 'archive' | 'disable' | 'custom'
- `itemName`: Specific item being affected (e.g., "WR-2026-001")
- `message`: Explain what will happen
- `onConfirm`: Callback after user confirms
- `variant`: 'danger' | 'warning' | 'default'

**Features:**
- Confirmation dialog before any action
- Shows what will happen (soft delete message)
- Loading state during operation
- Error handling
- Honest messaging: "No data is permanently deleted"

---

### CommandButton Component

Safe action button with loading state and error handling

```typescript
<CommandButton
  onClick={async () => {
    await archiveRecord(id); // Auto-handled with loading state
  }}
  loadingMessage="Archiving..."
  successMessage="Record archived"
  onSuccess={() => toast.success('Done')}
  onError={(err) => toast.error(err.message)}
  variant="warning"
>
  <Archive className="w-4 h-4" /> Archive
</CommandButton>
```

**Features:**
- Automatic loading state
- Error handling
- Success/error callbacks
- Loading message display

---

## 3. SPACING & TYPOGRAPHY NORMALIZATION ✅ IMPLEMENTED

### CSS Variables Added to `src/index.css`

#### Typography Scale
```css
--font-size-app-title: 32px;      /* Dashboard, major headings */
--font-size-page-title: 28px;     /* Work Ledger, DocumentHub */
--font-size-section-title: 20px;  /* KPI Stats, Recent Items */
--font-size-subsection-title: 16px; /* Card headers */
--font-size-body: 14px;           /* Default text */
--font-size-label: 13px;          /* Form labels */
--font-size-caption: 12px;        /* Timestamps, hints */
--font-size-micro: 11px;          /* Only tags, badges */
--font-size-mono-data: 13px;      /* IDs, tabular numbers */
```

#### Spacing Scale
```css
--spacing-xs: 4px;    /* Tiny gaps */
--spacing-sm: 8px;    /* Small gaps */
--spacing-md: 12px;   /* Standard gaps (form fields) */
--spacing-lg: 16px;   /* Medium gaps (between sections) */
--spacing-xl: 20px;   /* Large gaps */
--spacing-2xl: 24px;  /* Large section gaps */
--spacing-3xl: 32px;  /* Very large gaps */
--spacing-4xl: 40px;  /* Extra large gaps */
--spacing-5xl: 48px;  /* Maximum gaps */
```

#### Component Heights
```css
--height-table-row-dense: 36px;      /* WorkLedger, AuditLog */
--height-table-row: 44px;            /* DocumentHub, normal rows */
--height-control: 36px;              /* Buttons, inputs, selects */
--height-action-button: 40px;        /* Primary actions */
--padding-control-h: 12px;           /* Horizontal padding */
--padding-control-v: 8px;            /* Vertical padding */
```

---

## Usage Examples

### Combining Debounce + SafeActionButton

```typescript
import { useDebouncedCallback } from '../hooks/useOverloadProtection';
import { SafeActionButton } from '../components/ui/SafeActionButton';

export function WorkRecordActions({ record }) {
  const debouncedDelete = useDebouncedCallback(async (id: string) => {
    await WorkLedgerService.softDelete(id);
  }, 500, []);

  return (
    <SafeActionButton
      action="delete"
      itemName={record.id}
      onConfirm={() => debouncedDelete(record.id)}
    >
      Delete
    </SafeActionButton>
  );
}
```

---

### Using Concurrency Limiter for Bulk Operations

```typescript
import { useConcurrencyLimiter } from '../hooks/useOverloadProtection';

export function BulkImportModal() {
  const limiter = useConcurrencyLimiter(5); // 5 concurrent uploads

  const handleImport = async (files: File[]) => {
    for (const file of files) {
      try {
        await limiter.run(async () => {
          const document = await parseDocument(file);
          await DocumentService.create(document);
        });
      } catch (error) {
        toast.error(`Failed to import ${file.name}`);
      }
    }
  };

  return (
    <div>
      {limiter.activeCount > 0 && (
        <p>{limiter.activeCount} uploads in progress...</p>
      )}
    </div>
  );
}
```

---

### Using Batcher for Grouped Updates

```typescript
import { useBatcher } from '../hooks/useOverloadProtection';

export function BulkApprovalPanel() {
  const batcher = useBatcher(
    async (records) => {
      await WorkLedgerService.bulkApprove(records);
    },
    300, // Batch every 300ms idle
    50   // Or when 50 items accumulated
  );

  const handleApprove = (record) => {
    batcher.add(record);
  };

  return (
    <div>
      <button onClick={batcher.flush}>
        Approve Now ({batcher.pending} pending)
      </button>
    </div>
  );
}
```

---

## Soft Delete Pattern

### Backend Contract

**Soft Delete (Recommended):**
```typescript
PATCH /records/:id
{
  "isArchived": true,
  "archivedAt": "2026-03-25T12:00:00Z",
  "archivedBy": "user-id"
}
```

**Recovery:**
```typescript
PATCH /records/:id/restore
{
  "isArchived": false
}
```

**No Hard Delete Endpoint** — Data is never permanently deleted

---

### Frontend Usage

```typescript
export const WorkLedgerService = {
  // Soft delete (safe, reversible)
  async softDelete(id: string): Promise<void> {
    const result = await apiClient.patch(`/work-records/${id}`, {
      isArchived: true,
      archivedAt: new Date().toISOString(),
    });
    return result.data;
  },

  // Recovery
  async restore(id: string): Promise<void> {
    return apiClient.patch(`/work-records/${id}/restore`, {
      isArchived: false,
    });
  },

  // List excludes archived by default
  async getActive(params?: any): Promise<WorkRecord[]> {
    const result = await apiClient.getList('/work-records/', {
      ...params,
      excludeArchived: true,
    });
    return result.items;
  },

  // Admin can see archived items
  async getAll(params?: any): Promise<WorkRecord[]> {
    return apiClient.getList('/work-records/', params);
  },
};
```

---

## CSS Variables Usage

### Apply Typography in Components

```typescript
// Using page title
<h1 style={{
  fontSize: 'var(--font-size-page-title)',
  lineHeight: 'var(--line-height-page-title)',
}}>
  Work Ledger
</h1>

// Or use Tailwind with custom config
<h2 className="text-[var(--font-size-section-title)] leading-[var(--line-height-section-title)]">
  KPI Stats
</h2>
```

### Apply Spacing in Components

```typescript
// Using margin/gap
<div style={{
  gap: 'var(--spacing-md)', // 12px between form fields
  padding: 'var(--spacing-lg)', // 16px page padding
}}>
  {/* content */}
</div>

// Or use Tailwind
<div className="gap-[var(--spacing-md)] p-[var(--spacing-lg)]">
  {/* content */}
</div>
```

---

## Implementation Checklist

### Overload Protection
- [ ] Import `useDebounce` for search inputs
- [ ] Import `useDebouncedCallback` for filter handlers
- [ ] Import `useConcurrencyLimiter` for bulk operations
- [ ] Add abort signals to all API calls (via `useAbortOnNavigate`)

### Action Safety
- [ ] Replace `<button>Delete</button>` with `<SafeActionButton action="delete">`
- [ ] Ensure all "delete" endpoints do soft delete (set `isArchived: true`)
- [ ] Add recovery/restore endpoint for soft-deleted items
- [ ] Update list queries to exclude archived by default

### Typography/Spacing
- [ ] Use `--font-size-*` CSS variables instead of inline sizes
- [ ] Use `--spacing-*` CSS variables for gaps/padding
- [ ] Audit existing pages for hardcoded sizes
- [ ] Apply consistent heights with `--height-*` variables

---

## Testing Checklist

### Overload Protection
- [ ] Type rapidly in search input — debounce should limit API calls
- [ ] Open DevTools Network tab and verify < 1 request per 300ms
- [ ] Change multiple filters rapidly — no duplicate requests
- [ ] Bulk import 100 files with concurrency=5 — no 100 concurrent requests

### Action Safety
- [ ] Click delete button — confirmation dialog appears
- [ ] Dialog shows what will happen (soft delete message)
- [ ] Confirm — item marked archived, not deleted from DB
- [ ] Admin can restore archived items

### Typography/Spacing
- [ ] All page titles same size (28px)
- [ ] All form field gaps same (12px)
- [ ] All table rows same height (dense: 36px, normal: 44px)
- [ ] No hardcoded `text-sm` in random places

---

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useOverloadProtection.ts` | Debounce, throttle, concurrency | ✅ Created |
| `src/components/ui/SafeActionButton.tsx` | Safe delete/archive with confirmation | ✅ Created |
| `src/index.css` | Typography & spacing variables | ✅ Updated |
| `OVERLOAD_PROTECTION_AND_SAFETY_GUIDE.md` | This guide | ✅ Created |

---

## Next Steps

1. **Apply to Critical Pages** (WorkLedger, DocumentHub, SearchExplorer, AuditLog)
   - Add `useDebouncedCallback` to filter handlers
   - Replace delete buttons with `SafeActionButton`
   - Import abort signals from hooks

2. **Backend Integration**
   - Implement soft delete endpoints (set `isArchived: true`)
   - Add restore/recover endpoints
   - Update list queries to exclude archived items

3. **Audit Existing Code**
   - Replace hardcoded `px-4 py-3` with `p-[var(--spacing-lg)]`
   - Replace `text-sm` with typography variables
   - Remove duplicate spacing patterns

4. **Documentation**
   - Document soft delete policy in code comments
   - Add soft delete recovery instructions in admin UI
   - Create user guide explaining archive vs delete
