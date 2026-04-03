# Phase 9 — Deployment & Operational Readiness (Incremental)

## Changes implemented

1. **Fail-fast startup configuration validation**
   - Added `shared/startup.py` with:
     - `validate_startup_config(...)` for deterministic issue reporting.
     - `enforce_startup_config(...)` to raise runtime error on invalid startup configuration.
   - Wired enforcement into Django settings initialization.

2. **Structured JSON logging support**
   - Added `JsonLogFormatter` in `shared/logging.py` for machine-parsable logs.
   - Added `EDMS_JSON_LOGGING` toggle (default true) and wired handlers to JSON formatter when enabled.

3. **Environment template updates**
   - Added `EDMS_JSON_LOGGING` to `.env.example`.

4. **Operational tests**
   - Added tests for startup validation and JSON formatter payload shape in `backend/shared/tests.py`.

## Validation

- `DJANGO_SECRET_KEY=test-secret python manage.py check`
- `DJANGO_SECRET_KEY=test-secret python manage.py test shared.tests documents.tests tests.test_search_indexing tests.test_loadtest_analyzer`
- `python -m py_compile backend/shared/startup.py backend/shared/logging.py backend/edms/settings.py`

## Remaining phase-9 backlog

- Add frontend `/health` probe endpoint or static health asset for edge/LB checks.
- Add graceful shutdown hooks for dedicated worker process supervisor.
- Add deployment runbook sections for log ingestion/retention and request-ID tracing in observability stack.
