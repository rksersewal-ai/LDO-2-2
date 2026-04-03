# Phase 8 — Code Quality & Design Integrity (Incremental)

## Improvements applied

1. **Removed duplication in async enqueue fallback logic**
   - Introduced `_enqueue_or_inline(...)` helper in `documents/services.py`.
   - Centralizes queue-attempt + inline-fallback behavior and logs enqueue failures consistently.

2. **Refactored document ingest/version flows to use shared helper**
   - `DocumentService.ingest` now uses `_enqueue_or_inline` for index task dispatch.
   - `DocumentService.create_version` now uses `_enqueue_or_inline` for index task dispatch.

3. **Improved crash diagnostics without changing business rules**
   - Queue enqueue failures now include operation name and entity ID in a single structured warning path.

## Validation

- `DJANGO_SECRET_KEY=test-secret python manage.py test documents.tests shared.tests tests.test_search_indexing tests.test_loadtest_analyzer`
- `python -m py_compile backend/documents/services.py`

## Remaining phase-8 backlog

- Extend service-layer extraction to additional viewsets with repeated mutation patterns.
- Add targeted tests for approval workflows (`FC-LDO/01`–`FC-LDO/04`).
- Add a circular import guard/check in CI.
- Frontend design-token consistency audit pass (hardcoded color scan + theme parity checks).
