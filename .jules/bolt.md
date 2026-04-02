## 2026-04-02 - Dashboard Stats N+1 Query Fix
**Learning:** The `DashboardService.stats()` method executed 13 separate `count()` queries against the database (for Documents, WorkRecords, Approvals, and Cases). This causes significant database overhead as the application scales.
**Action:** Replaced the individual `.count()` calls with a single `.aggregate()` call for each model, using `Count('id', filter=Q(...))` to compute all status counts in 4 queries total instead of 13. Always use `.aggregate()` with `Count` and `Q` for grouped status counting to avoid multiple DB round-trips.

## 2026-04-02 - N+1 Queries in list aggregations
**Learning:** `InboxService.items_for_user()` in the Django backend executes individual database queries (`.first()`) inside loops iterating over standard querysets (like `approvals` and `dedup_records`), generating up to 40+ redundant database round trips for a user's dashboard view.
**Action:** Always inspect loops iterating through querysets for `.first()`, `.get()`, or foreign key access. Pre-collect needed ID lists and execute bulk-fetching (`filter(pk__in=ids)`) mapped to dictionaries to achieve O(1) query performance prior to list iteration.
