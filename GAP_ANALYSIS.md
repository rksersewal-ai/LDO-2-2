# LDO-2 EDMS — Web Application Guidelines Gap Analysis

## Executive Summary

The LDO-2 EDMS is **~75% aligned** with enterprise web application standards. It has strong foundations (component library, error handling, API conventions) but lacks critical overload protection, consistency in dense layouts, comprehensive state patterns, and command safety measures.

---

## 1. APP SHELL & NAVIGATION ✅ STRONG

### What's Good
- ✅ Consistent layout structure (Sidebar, Header, Main, RightPanel, ToastContainer)
- ✅ Logical route hierarchy across all pages (20+ routes, proper role-based access control)
- ✅ Multi-document tab strip for DocumentHub workflow
- ✅ Sidebar collapses with persistent state
- ✅ Top bar includes global search, profile, alerts, environment indicator

### Gaps

**1. Missing Left Navigation Rules Enforcement**
- No pinning/favorites for large module suite (14+ major areas)
- No quick expand affordance on collapse
- No visual indicator for "active section" beyond current route
- **Recommendation**: Add favorites sidebar section + restore expanded nav context on route changes

**2. Right Panel Usage Not Formalized**
- RightPanel exists but usage pattern is ad-hoc across pages
- No consistent rules for secondary actions, inspector, audit trails
- Some pages lack contextual help
- **Recommendation**: Create RightPanelContext with standardized slots: Help, AuditTrail, Inspector, Warnings

**3. Missing Header Consistency Pattern**
- PageHeader exists but not all pages use it uniformly
- Some pages lack refresh/sync indicators for live data
- No sticky bulk action bar for table pages
- **Recommendation**: Enforce PageHeader usage + add StickyActionBar component

---

## 2. TYPOGRAPHY & SPACING ⚠️  NEEDS ATTENTION

### What's Good
- ✅ Single font stack (DM Sans + IBM Plex Mono) centralized in CSS
- ✅ Tabular numerals used in tables and metrics
- ✅ Color theme system with CSS variables (light/dark modes)

### Gaps

**1. Spacing Scale Not Normalized**
- Page padding varies: 24px, 20px, 16px used inconsistently
- Gap between sections sometimes 20px, sometimes 24px, sometimes 32px
- No documented spacing scale enforced
- **Recommendation**: Enforce Tailwind spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48
- Audit and normalize all component gap/padding usage

**2. Typography Scale Not Documented**
- No documented size mapping for:
  - Page titles (20 or 28?)
  - Section titles (16 or 24?)
  - Field labels (12, 13, or 16?)
  - Body copy (13 or 14?)
- Different pages use inconsistent sizes for same purpose
- **Recommendation**: Create typography.css with CSS variables:
  ```css
  --font-page-title: 28px/32px;
  --font-section-title: 20px/24px;
  --font-body: 14px/20px;
  --font-label: 13px/18px;
  --font-mono-data: 13px/18px with tabular-nums;
  ```

**3. Dense Table Inconsistency**
- Row heights: 36px (Dense) vs 44px (Normal) not consistently applied
- Some tables use 40px, others 44px
- Line-height varies in cell content
- **Recommendation**: Create TableCell component enforcing height + alignment

---

## 3. DATA FETCHING & API CONVENTIONS ✅ GOOD, BUT INCOMPLETE

### What's Good
- ✅ Centralized ApiClient with standardized response shapes
- ✅ JWT auth via interceptors
- ✅ Retry logic with exponential backoff (3 retries, 1-30s)
- ✅ Timeout handling (30s default)
- ✅ Error normalization in ApiErrorResponse
- ✅ 401 auto-logout on token expiration

### Gaps

**1. Missing Common Command Patterns**
- No formal `getList()`, `getById()`, `createOne()`, etc. naming
- Services use ad-hoc method names:
  - `DocumentService.getDocuments()` vs `getAllDocuments()` inconsistent
  - No `updateOne()` vs `patchOne()` distinction
  - No `bulkRun()` pattern for batch operations
- **Recommendation**: Standardize all service methods:
  ```typescript
  // Document.ts
  getList(params: ListQueryParams): Promise<ApiListResponse<Document>>
  getById(id: string): Promise<ApiItemResponse<Document>>
  createOne(input: CreateDocumentInput): Promise<ApiMutationResponse<Document>>
  updateOne(id: string, input: UpdateDocumentInput): Promise<ApiMutationResponse<Document>>
  deleteOne(id: string): Promise<ApiDeleteResponse>
  bulkDelete(ids: string[]): Promise<ApiBulkResponse<string>>
  ```

**2. Missing Cancellation/Abort Signals**
- No AbortController usage for:
  - Typeahead/search requests (can fire multiple requests)
  - Filter changes (stale requests can arrive after new filter)
  - Route navigation (requests in-flight when user navigates)
- **Risk**: Race conditions, memory leaks, UI state desync
- **Recommendation**: Add AbortSignal support to ApiClient:
  ```typescript
  getList(params, signal?: AbortSignal): Promise<...>
  // Usage in SearchExplorer:
  const abortController = useRef(new AbortController());
  useEffect(() => {
    return () => abortController.current.abort();
  }, [scope]); // abort on scope change
  ```

**3. Missing Request Deduplication**
- Identical rapid requests can fire multiple times
- Example: Multiple components loading same document
- **Recommendation**: Add request cache with dedup key:
  ```typescript
  private requestCache = new Map<string, Promise<any>>();
  ```

**4. Missing Concurrency Limits**
- Bulk operations (export, import, bulk delete) have no concurrency limit
- Could overwhelm backend or browser
- **Recommendation**: Add concurrency limiting for bulk workflows

---

## 4. OVERLOAD PROTECTION ⚠️  CRITICAL GAPS

### What's Good
- ✅ SearchExplorer uses debounced query (some form)
- ✅ ApiClient has timeout + retry

### Gaps

**1. Missing Debounce/Throttle Helpers**
- No centralized debounce/throttle utilities
- SearchExplorer hardcodes debounce logic (not reusable)
- No debounce on:
  - Filter changes (AuditLog, SearchExplorer, DocumentHub)
  - Typeahead inputs (AsyncSelect)
  - Auto-save form fields
  - Resize/scroll events
- **Recommendation**: Create shared utility module:
  ```typescript
  // hooks/useDebounce.ts
  export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const timer = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
  }

  // hooks/useThrottle.ts
  export function useThrottle<T>(value: T, interval: number): T { ... }
  ```

**2. Missing Virtualization**
- WorkLedger table could render 100+ rows
- DocumentHub with pagination is OK, but no virtualization
- LedgerReports charts have no virtualization strategy
- **Risk**: DOM explosion, slowdown on slow devices
- **Recommendation**: Implement windowing for large tables:
  ```tsx
  import { FixedSizeList } from 'react-window';
  <FixedSizeList height={600} itemCount={items.length} itemSize={44}>
    {({index, style}) => <TableRow style={style} {...items[index]} />}
  </FixedSizeList>
  ```

**3. Missing Pagination Validation**
- Pages load `PAGE_SIZE` items, but no max page checks
- No infinite scroll protection (could request page 10000)
- **Recommendation**: Add guards:
  ```typescript
  const safePage = Math.min(page, totalPages);
  if (page > totalPages) navigate to page 1
  ```

**4. Missing Auto-Refresh Pause**
- SystemHealth page shows "Refresh" button but no auto-pause on hidden tab
- If user has multiple tabs, SystemHealth will refresh unnecessarily
- **Recommendation**: Add visibility pause hook:
  ```typescript
  export function usePauseOnHidden() {
    const [isPaused, setIsPaused] = useState(false);
    useEffect(() => {
      const handleVisibility = () => {
        setIsPaused(document.hidden);
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);
    return isPaused;
  }
  ```

**5. Missing Batch Update Logic**
- WorkLedger bulk operations have no batching strategy
- Could send 100 individual requests for 100 rows
- **Recommendation**: Create batch mutation helper:
  ```typescript
  export async function batchMutate<T>(
    items: T[],
    mutator: (item: T) => Promise<any>,
    concurrency = 5
  ) { ... }
  ```

---

## 5. CRASH PROTECTION ✅ GOOD FOUNDATION, INCOMPLETE

### What's Good
- ✅ ErrorBoundary component exists (React class boundary)
- ✅ SafeSection wrapper for loading/error/crash zones
- ✅ LoadingState + ErrorState components
- ✅ Applied to Dashboard (Recent Documents, Recent Activity, Ledger sections)
- ✅ Applied to LedgerReports (all 3 charts)

### Gaps

**1. Limited ErrorBoundary Coverage**
- Only 2 pages use SafeSection (Dashboard, LedgerReports)
- Missing on:
  - All data tables (WorkLedger, DocumentHub, SearchExplorer, AuditLog)
  - All chart pages (LedgerReports has some, but not all)
  - All form pages (PLDetail, DocumentDetail)
  - Third-party chart components (Recharts)
- **Recommendation**: Add ErrorBoundary at widget level in ALL data-heavy pages:
  ```tsx
  <SafeSection name="WorkLedgerTable" isLoading={loading} error={error}>
    <WorkLedgerTable />
  </SafeSection>
  ```

**2. Missing guardRender Pattern**
- No null/undefined guards in rendering
- Implicit fallbacks could cause crashes
- Example: `rule.lastFired` could be undefined
- **Recommendation**: Create guard utilities:
  ```typescript
  export function guardRender<T>(value: T | null | undefined, fallback?: React.ReactNode) {
    return value ?? fallback ?? '—';
  }
  ```

**3. Missing Validation on Server Payloads**
- API responses assumed valid, no schema validation
- Example: DocumentHub assumes `response.results` exists
- **Recommendation**: Add runtime validation with Zod:
  ```typescript
  const DocumentResponseSchema = z.object({
    results: z.array(DocumentSchema),
    total: z.number(),
  });
  ```

**4. Missing Retry Controls**
- ErrorState component shown, but no consistent retry trigger
- Some errors are recoverable (network timeout) vs unrecoverable (403 Forbidden)
- **Recommendation**: Add retryable flag + expose retry button:
  ```tsx
  <ErrorState
    variant={error.status === 403 ? 'forbidden' : 'server'}
    onRetry={retryable ? refetch : undefined}
  />
  ```

**5. Missing Error Correlation**
- Errors logged without context (route, action, user)
- Hard to trace in production
- **Recommendation**: Add correlation logging:
  ```typescript
  logError(error, {
    route: location.pathname,
    action: 'fetchWorkLedger',
    userId: user.id,
    correlationId: generateId(),
  });
  ```

---

## 6. STATE MANAGEMENT ⚠️  NEEDS FORMALIZATION

### What's Good
- ✅ Centralized contexts: ThemeProvider, AuthProvider, ToastProvider, RightPanelProvider, DocTabsProvider
- ✅ Clear ownership of each context (theme, auth, notifications, UI state, multi-tab)
- ✅ PreferencesService persists sidebar state, theme, last page

### Gaps

**1. No Unified State Patterns**
- Each page manages filters independently:
  - SearchExplorer: `scope`, `statusFilters`, `dateFilter`, `entityFilters`
  - AuditLog: `moduleFilter`, `severityFilter`, `userFilter`, `dateFrom`, `dateTo`
  - DocumentHub: likely similar but different structure
- No shared FilterState context
- **Risk**: Inconsistent UX, duplicated logic, lost state on navigation
- **Recommendation**: Create SharedFilterContext:
  ```typescript
  interface FilterState {
    [key: string]: any;
  }
  export const FilterContext = createContext<{
    filters: FilterState;
    setFilter: (key: string, value: any) => void;
    clearFilters: () => void;
  }>(null);
  ```

**2. No Selection State Pattern**
- Tables have no shared multi-select logic
- Each page duplicates selection management
- Example: WorkLedger, DocumentHub both need bulk select
- **Recommendation**: Create useSelection hook:
  ```typescript
  export function useSelection<T extends {id: string}>(items: T[]) {
    const [selected, setSelected] = useState(new Set<string>());
    return {
      selected,
      toggle: (id: string) => { ... },
      selectAll: () => { ... },
      count: selected.size,
    };
  }
  ```

**3. No Form Draft State Pattern**
- EditPLSlideOver, DocumentDetail form edits not scoped properly
- No clear "draft" vs "saved" boundary
- **Recommendation**: Add FormDraftContext with auto-save strategy

**4. No Panel State Persistence**
- RightPanel doesn't persist open/closed state per page
- User has to reopen on each page visit
- **Recommendation**: Add to PreferencesService:
  ```typescript
  panelState: {
    [route: string]: {isOpen: boolean, width: number}
  }
  ```

---

## 7. CODE SIMPLIFICATION & REUSABLE COMPONENTS ⚠️  GOOD START, INCOMPLETE

### What's Good
- ✅ Extensive UI component library (40+ components)
- ✅ Shared PageHeader component
- ✅ Shared GlassCard, Badge, Button primitives
- ✅ SafeSection + ErrorBoundary isolate failures
- ✅ LoadingState, ErrorState, EmptyState standardized

### Gaps

**1. Duplicated Table Patterns**
- WorkLedger, DocumentHub, SearchExplorer, AuditLog all have custom table implementations
- No shared TableToolbar, TableCell, TableActionMenu
- Pagination reinvented in AuditLog differently than others
- **Recommendation**: Create DataTable component:
  ```tsx
  <DataTable
    data={items}
    columns={columns}
    onSort={handleSort}
    onFilter={handleFilter}
    isLoading={loading}
    error={error}
  />
  ```

**2. Duplicated Filter Panels**
- SearchExplorer, AuditLog, DocumentHub each have custom filter UIs
- No shared FilterBar, FilterChip, ClearFilters
- **Recommendation**: Create FilterBar component:
  ```tsx
  <FilterBar
    filters={filters}
    onChange={setFilters}
    onClear={clearFilters}
    variant="faceted" | "inline"
  />
  ```

**3. Duplicated Export Logic**
- AuditLog exports CSV/Excel
- DocumentHub likely does too
- No shared ExportButton component
- **Recommendation**: Create ExportButton:
  ```tsx
  <ExportButton
    data={data}
    filename="audit-log"
    formats={['csv', 'excel']}
  />
  ```

**4. Duplicated Form Sections**
- PLDetail has custom form sections
- DocumentDetail has custom form sections
- No shared FormSection, FieldGroup, ValidatedInput
- **Recommendation**: Create FormBuilder system:
  ```tsx
  <FormBuilder
    fields={formSchema}
    initialValues={values}
    onSubmit={handleSubmit}
  />
  ```

**5. Duplicated Modal/Drawer Patterns**
- EditPLSlideOver, DocumentDetail modals custom implemented
- No shared ConfirmDialog, BulkActionDialog
- **Recommendation**: Create dialog primitives in shared lib

---

## 8. INTERACTION & CONTENT DENSITY ⚠️  INCONSISTENT

### What's Good
- ✅ Dense tables use 36px rows (WorkLedger, AuditLog)
- ✅ Command Palette for global navigation (Cmd+K)
- ✅ Inline editing available in some tables
- ✅ Multi-select on tables

### Gaps

**1. Inconsistent Row Heights**
- Some tables 36px, others 44px
- No consistent "dense" vs "normal" mode
- **Recommendation**: Add density toggle:
  ```tsx
  <DataTable density="dense" | "normal" {...props} />
  ```

**2. Sticky Headers Not Everywhere**
- AuditLog table likely lacks sticky header (hard to scan long lists)
- No sticky action bars for bulk operations
- **Recommendation**: Add sticky table headers to all long tables:
  ```css
  thead {
    position: sticky;
    top: 0;
    background: var(--card);
    z-index: 10;
  }
  ```

**3. No Quick Filters Pattern**
- Tables lack "Show mine / overdue / blocked" quick filter pills
- Users must use dropdowns
- **Recommendation**: Add QuickFilterBar:
  ```tsx
  <QuickFilterBar
    pills={[
      {label: "My Items", filter: {assignee: currentUser}},
      {label: "Overdue", filter: {isOverdue: true}},
    ]}
  />
  ```

**4. Form Layout Inconsistency**
- PLDetail uses md:grid-cols-2, DocumentDetail might differ
- No FormSection component for grouping
- **Recommendation**: Create FormSection:
  ```tsx
  <FormSection title="Basic Info" grid="2col">
    <Field name="name" />
    <Field name="status" />
  </FormSection>
  ```

---

## 9. MISSING SAFETY PATTERNS

### Dangerous Actions Not Explicit
- Delete buttons scattered throughout
- No ConfirmDialog consistency
- No "undo" capability

### Missing Action Confirmation
- DeleteRule in AlertRules has no confirmation dialog
- Bulk delete operations have no multi-step confirmation

### Command Safety
- No "save" progress indication
- No optimistic updates
- No rollback on failure
- **Recommendation**: Add CommandButton with safety:
  ```tsx
  <CommandButton
    onClick={async () => {
      await updateRecord(id, changes);
    }}
    confirmMessage="Delete 5 records?"
    loadingMessage="Deleting..."
    onSuccess={() => toast.success("Deleted")}
    onError={(err) => toast.error(err.message)}
  />
  ```

---

## 10. MISSING HELP & DOCUMENTATION

### What's Missing
- No in-app help context
- No inline field descriptions
- No error diagnosis
- No "what's this?" tooltips

### Recommendation
- Add RightPanel help section
- Create HelpContext for contextual guidance
- Add diagnostic information on ErrorState

---

## 11. NETWORK & RESILIENCE

### Missing Patterns
- No offline detection
- No "you're offline" banner
- No queue for offline mutations
- No degraded-mode UI

---

## 12. MONITORING & OBSERVABILITY

### What's Missing
- No slow query tracking
- No error tracking integration
- No performance metrics
- No user session tracking
- **Recommendation**: Add error + perf telemetry hooks to ApiClient

---

## Implementation Priority

### 🔴 Critical (Block Production)
1. **Add AbortSignal support** to prevent request race conditions
2. **Implement crash protection** on all data-heavy tables
3. **Normalize spacing & typography** for consistent UX
4. **Add command safety** (confirmation dialogs) to destructive actions

### 🟠 High (Complete Before MVP)
1. **Standardize service method naming** (getList, getById, etc.)
2. **Create shared FilterBar + DataTable** to reduce duplication
3. **Add overload protection** (debounce, throttle, concurrency limits)
4. **Implement state persistence** for filters, selection, panel state

### 🟡 Medium (Nice to Have)
1. **Virtualize large lists** for performance
2. **Add unified state patterns** (FilterContext, SelectionContext)
3. **Create FormBuilder** system for consistency
4. **Add error correlation** logging for debugging

### 🟢 Low (Polish)
1. **Add help context** and inline tooltips
2. **Implement offline mode** detection
3. **Add performance telemetry**
4. **Create density toggle** for tables

---

## Summary Table

| Area | Status | Gap Count | Severity |
|------|--------|-----------|----------|
| App Shell | ✅ Strong | 3 | Medium |
| Typography | ⚠️ Needs Work | 3 | High |
| API Conventions | ✅ Good | 4 | High |
| Overload Protection | ❌ Critical | 5 | Critical |
| Crash Protection | ✅ Good | 5 | High |
| State Management | ⚠️ Partial | 4 | High |
| Components | ✅ Good | 5 | Medium |
| Safety/UX | ❌ Missing | 3 | Critical |
| **Total** | **75%** | **32 gaps** | **Mixed** |

---

## Quick Wins (1-2 hours each)

1. ✅ Add useDebounce/useThrottle hooks
2. ✅ Create shared FilterBar component
3. ✅ Add guardRender utility
4. ✅ Standardize typography scale in CSS variables
5. ✅ Add ConfirmDialog wrapper for dangerous actions
6. ✅ Create CommandButton with safety patterns
7. ✅ Add AbortSignal support to ApiClient
8. ✅ Create useSelection hook
9. ✅ Add sticky headers to tables
10. ✅ Normalize spacing across all pages
