# LDO-2 EDMS Rigorous Testing Plan

## Purpose

This document defines the production-grade testing strategy for **peak load**, **stress**, **soak**, **crash resilience**, and **recovery behavior** of the LDO-2 EDMS application.

The goal is not just to "run load tests." The goal is to prove that the application:

- remains usable under expected and peak concurrency
- degrades predictably under overload
- fails in small zones instead of total system collapse
- recovers cleanly after faults, crashes, and restarts
- preserves data integrity for PL-centric and document-centric workflows

---

## 1. Scope

This plan covers all major runtime surfaces:

- Frontend web application on `4173` in development and the production static deployment
- Main backend API on `8420`
- Database on `5432`
- Authentication flow on the main backend unless split later
- Future webhook surface on `8422` when implemented
- PL-centric features:
  - login/session management
  - dashboard and search
  - document listing/detail
  - PL listing/detail
  - document linking/unlinking
  - BOM traversal and where-used
  - approvals, audit, OCR status, and system health

Out of scope for this plan:

- browser rendering fidelity testing
- unit-level component testing
- SEO/marketing-site style audits

---

## 2. Non-Negotiable Test Principles

- Never treat Django `runserver` as a valid load-test target.
- Never treat SQLite as the production concurrency benchmark.
- Never run 2000-user acceptance tests only on a local laptop and use that as the release signal.
- All peak-load validation must run on a **production-like stack**.
- All crash testing must verify both **failure isolation** and **recovery**.
- Every test run must produce artifacts: latency, error rate, logs, and pass/fail summary.

---

## 3. Target Environments

### 3.1 Local Developer Environment

Use for:

- smoke checks
- route sanity
- API regression
- low concurrency debugging

Do not use for:

- final peak-load signoff
- crash-resilience certification
- production capacity planning

Expected stack:

- frontend dev server
- backend app server for debugging only
- local Postgres preferred over SQLite

### 3.2 Staging / Production-Like Test Environment

This is the required environment for serious load and crash testing.

Expected stack:

- static frontend build served by Nginx or equivalent
- backend served by Gunicorn/Uvicorn on Linux or another production-grade WSGI/ASGI server
- Postgres on `5432`
- reverse proxy, request buffering, and TLS as in production
- realistic CPU, memory, disk, and network constraints

### 3.3 Production

Use for:

- controlled canary checks
- post-deploy smoke validation
- low-risk off-peak validation

Do not use for destructive crash experiments.

---

## 4. Tooling

Recommended test layers:

- **Smoke/API regression**: `pytest` + `requests` or DRF test client
- **Browser journey smoke**: Playwright
- **Peak and soak load**: k6, Locust, or Artillery
- **Crash/fault injection**: scripted service restarts, DB restart tests, network interruption, CPU/memory pressure
- **Metrics**: Prometheus + Grafana or equivalent
- **Logs**: structured app logs, reverse proxy logs, DB slow query logs

Required outputs per run:

- pass/fail summary
- p50/p95/p99 latency
- request throughput
- 4xx/5xx counts
- timeouts
- DB CPU / locks / slow queries
- backend worker saturation
- memory growth over time
- browser runtime errors for smoke routes

---

## 5. Test Data Requirements

Use realistic seeded data, not toy datasets.

Minimum recommended dataset:

- 10,000+ documents
- 25,000+ document versions over time
- 5,000+ PL items
- deep BOM trees including paths up to 50 levels
- where-used relationships with shared subassemblies
- audit records in high volume
- approvals, cases, and OCR jobs at meaningful counts

Required data characteristics:

- mixed document types: PDF, TIFF, PRT, Word, Excel, image
- mixed statuses: draft, review, approved, obsolete
- mixed PL vendor types: VD and NVD
- PL items with and without UVAM IDs
- optional technical evaluation documents across at least 3 prior years
- realistic search text distribution

---

## 6. Test Categories

### 6.1 Smoke Tests

Purpose:

- prove the application is alive and core paths work

Run on:

- every branch before merge
- every deployment

Minimum smoke coverage:

- login succeeds
- dashboard loads
- document list/detail load
- PL list/detail load
- BOM tree endpoint responds
- search responds
- audit log responds
- health endpoint responds
- no uncaught browser runtime errors on major routes

Pass criteria:

- zero 5xx in smoke flow
- zero uncaught browser crashes
- all required routes reachable

### 6.2 Baseline Performance Tests

Purpose:

- establish normal latency and throughput before stress

Scenarios:

- 10 concurrent users
- 50 concurrent users
- 100 concurrent users

Focus:

- login
- dashboard stats
- document list with search
- PL list and detail
- BOM traversal
- search endpoint

### 6.3 Peak Load Tests

Purpose:

- validate expected operational peak

Recommended profile:

- ramp from 50 to 500 users
- hold for 20 to 30 minutes
- include realistic request mix

Suggested request mix:

- 20% login/session refresh
- 20% dashboard/document list
- 20% PL list/detail
- 15% search
- 10% BOM tree / where-used
- 10% approvals/audit
- 5% health/system checks

Pass criteria:

- error rate under agreed threshold
- no sustained 5xx spike
- stable memory
- no runaway DB lock behavior
- p95 latency within defined SLA

### 6.4 Stress Tests

Purpose:

- identify the real breaking point

Recommended profile:

- ramp beyond expected load until failure
- continue until graceful degradation is observed

Must record:

- exact concurrency at first sustained failure
- dominant failure type
- recovery behavior after pressure is removed

Success definition:

- failure is controlled
- app sheds load with predictable errors
- system recovers without data corruption

### 6.5 Spike Tests

Purpose:

- simulate sudden bursts such as shift start, mass login, or alert-driven usage

Profile:

- idle baseline
- jump suddenly to large concurrency
- sustain 5 to 10 minutes
- drop back down

Focus:

- login throttling
- connection pool exhaustion
- request queueing
- reverse proxy behavior

### 6.6 Soak / Endurance Tests

Purpose:

- detect leaks, cache growth, stale connection problems, and cumulative degradation

Profile:

- 8 to 24 hours
- moderate stable concurrency
- realistic mixed traffic

Measure:

- memory slope
- worker restarts
- DB connection churn
- response-time drift
- log volume growth

### 6.7 Crash and Fault-Injection Tests

Purpose:

- verify graceful handling of real faults

Required experiments:

- kill backend worker during active traffic
- restart backend process under load
- temporary DB unavailability
- slow DB response
- reverse proxy timeout
- dropped network between app and DB
- forced browser refresh during mutations
- OCR/background job worker failure if applicable

Pass criteria:

- failures isolated to smallest safe scope
- user sees retryable errors, not blank crashes
- backend recovers without manual data repair
- no orphaned partial writes for critical flows

---

## 7. Crash-Resilience Scenarios by Feature

### Login and Session

- expired token during route transition
- invalid refresh token
- auth service timeout
- burst login from many users behind one NAT

Expected behavior:

- no 500s for invalid auth
- no redirect loops
- clear error message
- retry or re-login path available

### Document Flows

- document list timeout
- document detail missing linked assets
- upload interruption
- version upload during backend restart

Expected behavior:

- list view shows recoverable error state
- detail page isolates failed sections
- upload fails explicitly, not silently

### PL and BOM Flows

- PL detail request timeout
- linked document query failure
- BOM depth traversal under heavy load
- where-used query failure

Expected behavior:

- page shell survives
- section-level retry available
- no total page crash
- depth limits enforced safely

### Search

- heavy search fan-out
- repeated rapid search changes
- stale result race conditions

Expected behavior:

- request cancellation works
- stale responses do not overwrite newer results
- no browser freeze

---

## 8. Production-Like Peak Load Target

The 2000-user target should be validated in stages.

### Stage A

- 100 concurrent users
- all smoke paths
- confirm zero application regressions

### Stage B

- 250 concurrent users
- mixed authenticated read traffic
- confirm DB/query stability

### Stage C

- 500 concurrent users
- realistic read-heavy operational mix

### Stage D

- 1000 concurrent users
- only after Stage C is stable

### Stage E

- 2000 concurrent users
- only on production-like infrastructure
- requires:
  - production-grade app server
  - Postgres
  - reverse proxy
  - connection pooling
  - observability

Do not jump straight from local smoke tests to 2000 concurrent users.

---

## 9. Acceptance Criteria

Define these before signoff.

Suggested starting SLAs:

- login p95: under 2.0 s at expected peak
- core list endpoints p95: under 2.5 s
- detail pages p95: under 3.0 s
- search p95: under 2.0 s
- error rate at expected peak: under 1%
- no sustained 5xx cluster longer than 60 seconds
- no memory leak trend that threatens runtime stability in soak tests
- no data-integrity defects after crash tests

For stress tests:

- overload must fail gracefully
- system must recover after traffic returns to baseline

---

## 10. Observability Requirements

Before serious load certification, implement:

- per-endpoint latency histograms
- request ID / correlation ID
- structured logs with route and user context
- DB slow-query logs
- worker count / queue depth metrics
- CPU, memory, disk, network dashboards
- 4xx and 5xx alert thresholds

Without observability, failures are not diagnosable enough to fix.

---

## 11. Known Risks Already Identified

These must be considered during testing:

- Django `runserver` is not suitable for concurrency signoff
- SQLite is not suitable for realistic multi-user write/concurrency testing
- login and health endpoints previously had avoidable runtime issues
- oversized frontend route loading previously caused browser resource failures
- several pages remain partly mock-driven and should not be treated as final production paths until fully backend-backed

---

## 12. Execution Plan

### Phase 1: Pre-Load Hardening

- remove remaining mock-backed major flows
- ensure Postgres is the active DB
- run backend on production-grade serving stack
- add metrics and logs
- confirm route-level error handling and retry states

### Phase 2: Automated Smoke Suite

- add Playwright smoke suite for major routes
- add API regression suite for critical endpoints
- run on every push and deploy

### Phase 3: Performance Baseline

- run 10/50/100 user scenarios
- record latency baselines
- tune obvious query and endpoint issues

### Phase 4: Peak and Soak Testing

- run 250/500/1000/2000 user stages
- run 8h+ soak tests
- tune workers, DB, caches, and queries

### Phase 5: Crash and Recovery Testing

- execute restart, timeout, DB failure, and overload experiments
- validate recovery and data integrity

### Phase 6: Release Gate

- publish formal test report
- compare against SLA targets
- block release if peak or crash criteria fail

---

## 13. Deliverables Per Test Cycle

Each major test cycle should publish:

- test environment description
- application version / commit SHA
- dataset size
- scenario definitions
- concurrency profile
- results summary
- top failures
- root-cause notes
- remediation items
- release recommendation: pass / conditional / fail

---

## 14. Immediate Next Actions for This Repo

1. Add an automated smoke suite covering login and all major app routes.
2. Replace local `runserver` load attempts with a production-grade backend serving stack.
3. Run load against Postgres-backed staging, not SQLite.
4. Finish removing mock-backed major screens before calling load results production-ready.
5. Add repeatable k6 or Locust scenarios for:
   - login
   - dashboard
   - documents
   - PL detail
   - BOM tree
   - search
6. Add failure-injection scripts for backend restart, DB restart, and timeout simulation.

---

## 15. Definition of Done

This EDMS is considered peak-load and crash-test ready only when:

- smoke tests are automated and passing
- production-like infrastructure is in place
- 2000-user staged load has been executed on that infrastructure
- crash tests show recoverable behavior
- no critical data-integrity defects remain
- performance and failure budgets are documented and met

