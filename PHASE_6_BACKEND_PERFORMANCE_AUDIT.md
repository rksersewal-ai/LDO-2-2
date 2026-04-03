# Phase 6 — Backend Performance (Incremental)

## Changes applied

1. **Composite database indexes added for high-frequency filter/sort paths**
   - `Document`: `(source_system, created_at)`, `(status, created_at)`, `(linked_pl, created_at)`.
   - `WorkRecord`: `(status, date)`, `(status, created_at)`.
   - `AuditLog`: `(user, created_at)`, `(module, created_at)`, `(severity, created_at)`.

2. **Migration generated**
   - `backend/edms_api/migrations/0010_*.py` created to apply the above indexes.

3. **N+1 reduction / query efficiency improvements**
   - `WorkRecordViewSet` now uses `select_related('user_name', 'verified_by')`.
   - `ApprovalViewSet` now uses `select_related('requested_by', 'reviewed_by')`.
   - `CaseViewSet` now uses `select_related('assigned_to', 'raised_by')`.
   - `AuditLogViewSet` now uses `select_related('user')`.

## Validation

- `DJANGO_SECRET_KEY=test-secret python manage.py makemigrations edms_api`
- `DJANGO_SECRET_KEY=test-secret python manage.py test documents.tests shared.tests tests.test_search_indexing`

## Remaining work for full phase completion

- Run `EXPLAIN ANALYZE` on top endpoints under real data volume and validate index scan usage.
- Add DB connection pool observability and hard limits in deployment profile.
- Profile long-running transactions around document revision workflows.
- Add Redis cache layer for read-heavy dashboard/search metadata paths.
