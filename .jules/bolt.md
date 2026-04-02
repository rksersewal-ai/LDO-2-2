## 2026-04-02 - Dashboard Stats N+1 Query Fix
**Learning:** The `DashboardService.stats()` method executed 13 separate `count()` queries against the database (for Documents, WorkRecords, Approvals, and Cases). This causes significant database overhead as the application scales.
**Action:** Replaced the individual `.count()` calls with a single `.aggregate()` call for each model, using `Count('id', filter=Q(...))` to compute all status counts in 4 queries total instead of 13. Always use `.aggregate()` with `Count` and `Q` for grouped status counting to avoid multiple DB round-trips.
