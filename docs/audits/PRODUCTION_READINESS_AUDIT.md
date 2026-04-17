# Production Readiness Audit (Phased)

## Scope executed in this pass

This pass focused on:
- Phase 1 repository discovery and dependency/flow mapping.
- Foundational hardening updates in backend runtime configuration.
- Phase 7 load-test harness scaffolding (Locust) for required user-behavior mix and staged ramps.

A full, validated 100k-user certification run is **not** executable in this constrained runner without:
- reachable package registries,
- a provisioned performance environment,
- production-like DB + Redis + worker topology.

## Security/configuration hardening applied

1. Avoided import-time crash on missing `POSTGRES_PASSWORD` in `settings_api.py` by using safe fallback for example config object.
2. Hardened debug resolution in `settings.py` so `DEBUG` and `DJANGO_DEBUG` are both supported with secure default `false`.
3. Added secure cookie settings and baseline security headers:
   - `SESSION_COOKIE_SECURE`
   - `CSRF_COOKIE_SECURE`
   - `SECURE_CONTENT_TYPE_NOSNIFF`
   - `SECURE_BROWSER_XSS_FILTER`
4. Added upload/request body memory limits for abuse resistance:
   - `DATA_UPLOAD_MAX_MEMORY_SIZE`
   - `FILE_UPLOAD_MAX_MEMORY_SIZE`
5. Made CORS and CSRF trusted origins environment-driven (comma-separated env values).
6. Extended `.env.example` to include all newly required/optional security variables.

## Load testing implementation (Phase 7 baseline)

Added Locust assets:
- `backend/loadtests/locustfile.py`
- `backend/loadtests/run_stages.sh`
- `backend/requirements-loadtest.txt`

Coverage implemented:
- User classes aligned with requested mix:
  - Document viewers (40)
  - PL users (20)
  - Upload users (10)
  - Work ledger users (10)
  - Approvers (10)
  - Admin users (5)
  - Report users (5)
- Think time 1–5 seconds.
- Stage driver script for ramps: 1k → 10k → 50k → 100k users, with configurable per-stage duration.
- CSV output enabled for p50/p95/p99/error-rate post-processing.

## Dependency/vulnerability tooling status in this environment

Attempts made:
- `pnpm audit --prod`
- `pnpm outdated`
- `pip-audit -r requirements*.txt`

Blocked by environment proxy/registry access (403), so automated CVE resolution is pending execution in a connected CI runner.

## Recommended next execution order

1. Run dependency audit in CI with internet access and lock all remediated versions.
2. Execute backend/frontend test suite with env bootstrap profile.
3. Run staged Locust test against production-like stack and capture metrics.
4. Apply bottleneck remediations (DB indexes/query plans/cache tuning) based on measured p95/p99.
5. Repeat until performance SLOs are achieved.
